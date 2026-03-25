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

async function chatJSON(messages, responseSchema, model = 'gpt-4o-mini') {
  return withRetry(async () => {
    const client = getClient();
    const completion = await client.chat.completions.create({
      model,
      response_format: { type: 'json_object' },
      messages,
      temperature: 0.2,
    });

    const raw = completion.choices[0].message.content;
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(`OpenAI returned invalid JSON: ${raw}`);
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
Description snippet: ${description.slice(0, 500)}
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
Description: ${description.slice(0, 1000)}
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

module.exports = { classifyJob, scoreBid, generateProposal };
