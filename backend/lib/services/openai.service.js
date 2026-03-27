const OpenAI = require('openai');
const { z } = require('zod');

let _client;
function getClient() {
  if (!_client) {
    if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set');
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _client;
}

// ─── Retry helper ────────────────────────────────────────────────────────────

async function withRetry(fn, maxAttempts = 3) {
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const isRetryable =
        err?.status === 429 ||
        err?.status === 500 ||
        err?.status === 503 ||
        err?.code === 'ECONNRESET';
      if (!isRetryable || attempt === maxAttempts) throw err;
      const delay = Math.min(1000 * 2 ** (attempt - 1), 8000);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

// ─── JSON chat helper ─────────────────────────────────────────────────────────

async function chatJSON(messages, responseSchema, model = 'gpt-4o-mini', maxTokens = 2000) {
  return withRetry(async () => {
    const client = getClient();
    const completion = await client.chat.completions.create({
      model,
      response_format: { type: 'json_object' },
      messages,
      temperature: 0.2,
      max_tokens: maxTokens,
    });

    const choice = completion.choices[0];
    if (choice.finish_reason === 'length') {
      console.error('[OpenAI] Response truncated by token limit. Increase max_tokens or reduce input.');
    }
    const raw = choice.message.content;
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(`OpenAI returned invalid JSON (finish_reason=${choice.finish_reason}): ${raw.slice(0, 200)}`);
    }

    const result = responseSchema.safeParse(parsed);
    if (!result.success) {
      throw new Error(`OpenAI response schema mismatch: ${JSON.stringify(result.error.issues)}`);
    }

    return { data: result.data, tokensUsed: completion.usage?.total_tokens ?? 0 };
  });
}

// ─── classifyJob ──────────────────────────────────────────────────────────────

const ClassifySchema = z.object({
  category: z.string(),
  skills_detected: z.array(z.string()),
  competition_level: z.enum(['Low', 'Medium', 'High']),
  client_quality_score: z.number().min(0).max(100),
  red_flags: z.array(z.string()),
  green_flags: z.array(z.string()),
});

async function classifyJob(jobData) {
  const { title, description, budget_min, budget_max, skills_required, client_hires, platform } = jobData;

  const messages = [
    {
      role: 'system',
      content: `You are an expert freelance market analyst. Analyze job postings and return a JSON object with these fields:
- category: main job category (e.g. "Web Development", "Mobile Development", "Data Science", "Graphic Design", "Content Writing", "SEO/Marketing", "Video/Animation", "Cybersecurity", "DevOps/Cloud", "Other")
- skills_detected: array of key skills found in the posting (max 8)
- competition_level: "Low" | "Medium" | "High" (how many freelancers likely apply)
- client_quality_score: 0-100 (100 = best client — high hires, clear brief, fair budget)
- red_flags: array of warning signs (e.g. "Budget too low", "Vague requirements", "No client history")
- green_flags: array of positive signals (e.g. "Clear scope", "Good budget range", "Experienced client")`,
    },
    {
      role: 'user',
      content: `Analyze this job posting:
Platform: ${platform}
Title: ${title}
Description: ${description}
Budget: $${budget_min}–$${budget_max}
Required skills: ${(skills_required || []).join(', ') || 'Not specified'}
Client total hires: ${client_hires ?? 'Unknown'}`,
    },
  ];

  return chatJSON(messages, ClassifySchema);
}

// ─── scoreBid ─────────────────────────────────────────────────────────────────

const ScoreSchema = z.object({
  bid_score: z.number().min(0).max(100),
  score_reasoning: z.string(),
  bid_min: z.number().positive(),
  bid_max: z.number().positive(),
  win_probability: z.enum(['Low', 'Medium', 'High']),
});

async function scoreBid(jobData, classifyResult, pricingData, userProfile) {
  const { title, description, budget_min, budget_max } = jobData;
  const { category, competition_level, client_quality_score, red_flags, green_flags } = classifyResult;
  const { median_hourly_rate, p25_rate, p75_rate, sample_size } = pricingData;

  const messages = [
    {
      role: 'system',
      content: `You are a freelance pricing strategist. Given a job posting and market data, return a JSON object with:
- bid_score: 0-100 integer (overall attractiveness of this job for the freelancer; 100 = perfect job)
- score_reasoning: 1-2 sentence explanation of the score
- bid_min: suggested minimum bid in USD (total project OR hourly, match the job's budget format)
- bid_max: suggested maximum bid in USD
- win_probability: "Low" | "Medium" | "High" (likelihood of winning if bidding in the suggested range)

Base the bid range on: market rates, job budget, competition level, and the freelancer's profile.`,
    },
    {
      role: 'user',
      content: `Job: ${title}
Description: ${description.slice(0, 2000)}
Budget: $${budget_min}–$${budget_max}
Category: ${category}
Competition: ${competition_level}
Client quality score: ${client_quality_score}/100
Red flags: ${red_flags.join(', ') || 'None'}
Green flags: ${green_flags.join(', ') || 'None'}

Market data for "${category}":
- Median rate: $${median_hourly_rate}/hr
- 25th percentile: $${p25_rate}/hr
- 75th percentile: $${p75_rate}/hr
- Sample size: ${sample_size} jobs

Freelancer profile:
- Title: ${userProfile.title || 'Not set'}
- Hourly rate: $${userProfile.hourly_rate_usd || 0}/hr
- Experience: ${userProfile.experience_years || 0} years
- Skills: ${(userProfile.skills || []).join(', ') || 'Not specified'}`,
    },
  ];

  return chatJSON(messages, ScoreSchema);
}

// ─── generateProposal ─────────────────────────────────────────────────────────

const ProposalSchema = z.object({
  cover_letter: z.string().min(100),
  tone_detected: z.string(),
  template_used: z.string(),
  word_count: z.number().int().positive(),
});

async function generateProposal(jobData, classifyResult, scoreResult, userProfile) {
  const { title, description, platform } = jobData;
  const { category, green_flags, red_flags } = classifyResult;
  const { bid_min, bid_max, win_probability } = scoreResult;

  const messages = [
    {
      role: 'system',
      content: `You are a professional freelance proposal writer. Write compelling, personalized cover letters that win jobs.
Return a JSON object with:
- cover_letter: the full cover letter text (150-250 words, no generic filler)
- tone_detected: the tone you matched to the job (e.g. "Professional", "Casual", "Technical", "Creative")
- template_used: the approach you used (e.g. "Problem-Solution", "Story-Led", "Expertise-First")
- word_count: integer word count of the cover_letter

Rules:
- Open with a hook that addresses the client's specific problem, NOT "Hi, I'm..."
- Reference specific details from the job description
- Mention 1-2 directly relevant past accomplishments (inferred from user profile)
- Include a soft CTA at the end
- Do NOT mention the bid amount in the letter`,
    },
    {
      role: 'user',
      content: `Write a cover letter for this ${platform} job:
Title: ${title}
Description: ${description.slice(0, 2500)}
Category: ${category}
Win probability: ${win_probability}
Green flags (use as selling points): ${green_flags.join(', ') || 'None'}
Address red flags tactfully: ${red_flags.join(', ') || 'None'}

Freelancer background:
- Name: ${userProfile.name || 'the freelancer'}
- Title: ${userProfile.title || 'Freelancer'}
- Bio: ${userProfile.bio || 'Not provided'}
- Skills: ${(userProfile.skills || []).join(', ') || 'Not specified'}
- Experience: ${userProfile.experience_years || 0} years
- Hourly rate target: $${bid_min}–$${bid_max}`,
    },
  ];

  const result = await chatJSON(messages, ProposalSchema, 'gpt-4o-mini');
  result.data.word_count = result.data.cover_letter.trim().split(/\s+/).length;
  return result;
}

// ─── matchJobToProfile ────────────────────────────────────────────────────────
//
// Used for LinkedIn jobs: compares a job description + requirements against the
// user's CV text and profile. Returns a match score, skill gaps, strengths, and
// a tailored application summary the user can adapt into a cover letter.

const MatchSchema = z.object({
  match_score: z.number().min(0).max(100),
  score_reasoning: z.string(),
  matched_skills: z.array(z.string()),
  skill_gaps: z.array(z.string()),
  strengths: z.array(z.string()),
  application_summary: z.string().min(80),
  recommended_action: z.enum(['Apply', 'Apply with caveats', 'Skip']),
});

async function matchJobToProfile(jobData, userProfile) {
  const {
    title, description, company, location, workplace_type,
    seniority_level, skills_required,
  } = jobData;

  const cvSection = userProfile.cv_text
    ? `CV / Resume:\n${userProfile.cv_text.slice(0, 6000)}`
    : `No CV uploaded. Profile only:\n- Title: ${userProfile.title || 'Not set'}\n- Skills: ${(userProfile.skills || []).join(', ') || 'Not specified'}\n- Experience: ${userProfile.experience_years || 0} years\n- Bio: ${userProfile.bio || 'Not provided'}`;

  const messages = [
    {
      role: 'system',
      content: `You are a career advisor and job-fit analyst. Compare a job posting to a candidate's CV and profile.
Return a JSON object with:
- match_score: 0-100 integer (overall fit; 100 = perfect match)
- score_reasoning: 1-2 sentence explanation of the score
- matched_skills: skills the candidate clearly has that the job needs (max 8)
- skill_gaps: required or preferred skills the candidate lacks (max 6)
- strengths: 2-4 specific reasons this candidate is well-suited (based on their CV)
- application_summary: a 100-150 word paragraph the candidate can use as a starting point for their cover letter / LinkedIn message. Write in first person, highlight fit.
- recommended_action: "Apply" | "Apply with caveats" | "Skip"`,
    },
    {
      role: 'user',
      content: `Job: ${title}
Company: ${company || 'Not specified'}
Location: ${location || 'Not specified'}${workplace_type ? ` (${workplace_type})` : ''}
Seniority: ${seniority_level || 'Not specified'}
Required skills: ${(skills_required || []).join(', ') || 'Not listed'}

Job description:
${description.slice(0, 3000)}

---

Candidate:
${cvSection}`,
    },
  ];

  return chatJSON(messages, MatchSchema);
}

// ─── generateCVGuidance ───────────────────────────────────────────────────────
//
// Used for LinkedIn jobs: analyses the candidate's CV against the job and returns
// detailed, actionable guidance on how to improve/tailor their CV themselves.

const CVGuidanceSchema = z.object({
  overall_assessment: z.string().default(''),
  priority_changes: z.array(z.object({
    section: z.string(),
    issue: z.string(),
    action: z.string(),
    example: z.string().optional().default(''),
  })).default([]),
  keywords_to_add: z.array(z.string()).default([]),
  keywords_to_emphasise: z.array(z.string()).default([]),
  // AI sometimes returns an object keyed by section name instead of an array — normalise with preprocess
  sections_to_improve: z.preprocess((val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === 'object') {
      return Object.entries(val).map(([key, v]) => ({
        section: (v && typeof v === 'object' && v.section) ? String(v.section) : key,
        current_weakness: (v && typeof v === 'object' && v.current_weakness) ? String(v.current_weakness) : '',
        how_to_fix: (v && typeof v === 'object' && v.how_to_fix) ? String(v.how_to_fix) : '',
      }));
    }
    return [];
  }, z.array(z.object({
    section: z.string(),
    current_weakness: z.string(),
    how_to_fix: z.string(),
  })).default([])),
  ats_tips: z.array(z.string()).default([]),
  summary_rewrite_hint: z.string().default(''),
});

async function generateCVGuidance(jobData, userProfile) {
  const { title: jobTitle, description, company, skills_required, seniority_level } = jobData;

  const cvSource = userProfile.cv_text && userProfile.cv_text.trim().length > 50
    ? userProfile.cv_text.slice(0, 6000)
    : [
        userProfile.title || '',
        userProfile.bio ? `SUMMARY\n${userProfile.bio}` : '',
        (userProfile.skills || []).length ? `SKILLS\n${userProfile.skills.join(', ')}` : '',
        userProfile.experience_years ? `EXPERIENCE: ${userProfile.experience_years} years` : '',
      ].filter(Boolean).join('\n') || 'No CV uploaded';

  const messages = [
    {
      role: 'system',
      content: `You are a professional career coach and CV expert. Analyse the candidate's CV against a specific job posting and give them clear, actionable guidance so they can tailor their CV themselves.

Return a JSON object with:
- overall_assessment: 2-3 sentence honest summary of how well their current CV matches this job and the main gaps
- priority_changes: array of the top 3-5 most impactful changes, each with:
    - section: which CV section to change (e.g. "Summary", "Experience — Job Title", "Skills")
    - issue: what is currently wrong or missing
    - action: exactly what to do (be specific and actionable)
    - example: a concrete example of improved text (optional but very helpful)
- keywords_to_add: job keywords/phrases completely missing from their CV that ATS systems will scan for (max 10)
- keywords_to_emphasise: keywords present in their CV but need to be more prominent or reworded (max 8)
- sections_to_improve: each section needing work, with specific how-to-fix advice
- ats_tips: 3-5 ATS/formatting tips specific to their CV (e.g. missing metrics, weak action verbs, formatting issues)
- summary_rewrite_hint: a suggested opening sentence or angle for their summary section targeted at this job`,
    },
    {
      role: 'user',
      content: `TARGET JOB:
Title: ${jobTitle}
Company: ${company || 'Not specified'}
Seniority: ${seniority_level || 'Not specified'}
Required skills: ${(skills_required || []).join(', ') || 'Not listed'}

Job description:
${description.slice(0, 2500)}

---

CANDIDATE'S CURRENT CV:
${cvSource}`,
    },
  ];

  return chatJSON(messages, CVGuidanceSchema, 'gpt-4o-mini', 4000);
}

// ─── extractProfileFromCV ─────────────────────────────────────────────────────
//
// Parses a CV/resume text and extracts structured profile fields.
// Used during CV upload to auto-populate the user's profile.

const CVProfileSchema = z.object({
  name:             z.string().nullable().optional().default(''),
  title:            z.string().nullable().optional().default(''),
  bio:              z.string().nullable().optional().default(''),
  skills:           z.array(z.string()).nullable().optional().default([]),
  experience_years: z.number().min(0).max(60).nullable().optional().default(0),
  location:         z.string().nullable().optional().default(''),
  linkedin_url:     z.string().nullable().optional().default(''),
  github_url:       z.string().nullable().optional().default(''),
  website_url:      z.string().nullable().optional().default(''),
  languages:        z.array(z.string()).nullable().optional().default([]),
  education:        z.array(z.string()).nullable().optional().default([]),
  certifications:   z.array(z.string()).nullable().optional().default([]),
}).transform((val) => ({
  name:             val.name             ?? '',
  title:            val.title            ?? '',
  bio:              val.bio              ?? '',
  skills:           val.skills           ?? [],
  experience_years: val.experience_years ?? 0,
  location:         val.location         ?? '',
  linkedin_url:     val.linkedin_url     ?? '',
  github_url:       val.github_url       ?? '',
  website_url:      val.website_url      ?? '',
  languages:        val.languages        ?? [],
  education:        val.education        ?? [],
  certifications:   val.certifications   ?? [],
}));

async function extractProfileFromCV(cvText) {
  const messages = [
    {
      role: 'system',
      content: `You are a professional CV parser. Extract structured profile data from the resume text and return a JSON object with these fields:
- name: full name of the candidate
- title: professional headline (e.g. "Senior Full Stack Developer")
- bio: 2-4 sentence professional summary
- skills: array of technical and professional skills (max 15)
- experience_years: total years of professional experience as an integer (infer from dates or explicit statements)
- location: city and/or country if found
- linkedin_url: full LinkedIn URL only if found verbatim in the text
- github_url: full GitHub URL only if found verbatim in the text
- website_url: portfolio or personal website URL only if found verbatim
- languages: spoken/written human languages (not programming languages), e.g. ["English", "Arabic"]
- education: array of strings, each formatted as "Degree, Institution, Year" (e.g. "BSc Computer Science, Cairo University, 2019")
- certifications: array of certification names (e.g. "AWS Solutions Architect Associate")

Be conservative — omit a field rather than guess. Do not hallucinate URLs or credentials.`,
    },
    {
      role: 'user',
      content: `Extract profile data from this CV:\n\n${cvText.slice(0, 8000)}`,
    },
  ];

  return chatJSON(messages, CVProfileSchema);
}

module.exports = { classifyJob, scoreBid, generateProposal, matchJobToProfile, generateCVGuidance, extractProfileFromCV };
