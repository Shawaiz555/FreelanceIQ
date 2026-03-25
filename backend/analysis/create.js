const connectDB = require('../lib/db');
const Analysis = require('../lib/models/Analysis');
const User = require('../lib/models/User');
const { classifyJob, scoreBid, generateProposal } = require('../lib/services/openai.service');
const { enrichJobWithPricing } = require('../lib/services/pricing.service');
const { getCached, setCached } = require('../lib/redis');
const { AppError, withErrorHandler, withAuth, withRateLimit } = require('../lib/withMiddleware');
const { sendFirstAnalysis } = require('../lib/services/mailjet.service');

function parseBody(req) {
  if (req.body !== undefined) return Promise.resolve(req.body);
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(data)); }
      catch { reject(new AppError('Invalid JSON body', 400)); }
    });
    req.on('error', reject);
  });
}

// ─── Quota check ──────────────────────────────────────────────────────────────

const MONTHLY_LIMITS = { free: 5, pro: 100, agency: 500 };

async function checkQuota(user) {
  const now = new Date();
  const resetDate = user.usage.reset_date ? new Date(user.usage.reset_date) : now;

  if (now >= resetDate) {
    // New billing month — reset counter
    user.usage.analyses_this_month = 0;
    user.usage.reset_date = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    await user.save();
  }

  const tier = user.subscription?.tier || 'free';
  const limit = MONTHLY_LIMITS[tier] ?? MONTHLY_LIMITS.free;
  if (user.usage.analyses_this_month >= limit) {
    throw new AppError(
      `Monthly analysis limit reached (${limit} for ${tier} plan). Upgrade to continue.`,
      402
    );
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

async function handler(req, res) {
  if (req.method !== 'POST') throw new AppError('Method not allowed', 405);

  const body = await parseBody(req);
  const { platform, url, title, description, budget_min, budget_max, skills_required, client_hires } = body;

  // Validate required fields
  if (!title || typeof title !== 'string' || !title.trim()) {
    throw new AppError('Job title is required', 400);
  }
  if (!description || typeof description !== 'string' || description.trim().length < 50) {
    throw new AppError('Job description must be at least 50 characters', 400);
  }
  if (!platform || !['upwork', 'fiverr', 'freelancer', 'toptal', 'other'].includes(platform)) {
    throw new AppError('platform must be one of: upwork, fiverr, freelancer, toptal, other', 400);
  }

  const jobData = {
    platform,
    url: url || '',
    title: title.trim(),
    description: description.trim(),
    budget_min: Number(budget_min) || 0,
    budget_max: Number(budget_max) || 0,
    skills_required: Array.isArray(skills_required) ? skills_required : [],
    client_hires: Number(client_hires) || 0,
  };

  await connectDB();
  const user = req.user;

  // Load user with select fields needed for quota + profile
  const fullUser = await User.findById(user._id);
  await checkQuota(fullUser);

  // ── Check Redis cache ───────────────────────────────────────────────────────
  const cached = await getCached(jobData.description);
  if (cached) {
    // Still save a new Analysis document so history is tracked, but skip AI cost
    const savedAnalysis = await Analysis.create({
      user_id: user._id,
      job: {
        platform: jobData.platform,
        url: jobData.url,
        title: jobData.title,
        description: jobData.description,
        budget_min: jobData.budget_min,
        budget_max: jobData.budget_max,
        skills_required: cached.classify.skills_detected || [],
        client_hires: jobData.client_hires,
      },
      result: {
        bid_score: cached.score.bid_score,
        score_reasoning: cached.score.score_reasoning,
        bid_min: cached.score.bid_min,
        bid_max: cached.score.bid_max,
        win_probability: cached.score.win_probability,
        red_flags: cached.classify.red_flags,
        green_flags: cached.classify.green_flags,
        category: cached.classify.category,
        competition_level: cached.classify.competition_level,
      },
      proposal: {
        cover_letter: cached.proposal.cover_letter,
        tone_detected: cached.proposal.tone_detected,
        template_used: cached.proposal.template_used,
        word_count: cached.proposal.word_count,
      },
      ai_tokens_used: 0, // cached — no tokens used
    });

    // Increment usage
    await User.findByIdAndUpdate(user._id, {
      $inc: { 'usage.analyses_this_month': 1, 'usage.total_analyses': 1 },
    });

    return res.status(201).json({ success: true, data: savedAnalysis, cached: true });
  }

  // ── Full AI pipeline ────────────────────────────────────────────────────────

  // Step 1: Classify job
  const { data: classifyData, tokensUsed: t1 } = await classifyJob(jobData);

  // Step 2: Enrich with pricing data
  const { pricingData } = await enrichJobWithPricing(jobData, classifyData.category);

  // Step 3: Score the bid
  const { data: scoreData, tokensUsed: t2 } = await scoreBid(
    jobData,
    classifyData,
    pricingData,
    fullUser.profile
  );

  // Step 4: Generate proposal
  const { data: proposalData, tokensUsed: t3 } = await generateProposal(
    jobData,
    classifyData,
    scoreData,
    { ...fullUser.profile, name: fullUser.name }
  );

  const totalTokens = t1 + t2 + t3;

  // ── Persist to MongoDB ──────────────────────────────────────────────────────
  const savedAnalysis = await Analysis.create({
    user_id: user._id,
    job: {
      platform: jobData.platform,
      url: jobData.url,
      title: jobData.title,
      description: jobData.description,
      budget_min: jobData.budget_min,
      budget_max: jobData.budget_max,
      skills_required: classifyData.skills_detected || jobData.skills_required,
      client_hires: jobData.client_hires,
    },
    result: {
      bid_score: scoreData.bid_score,
      score_reasoning: scoreData.score_reasoning,
      bid_min: scoreData.bid_min,
      bid_max: scoreData.bid_max,
      win_probability: scoreData.win_probability,
      red_flags: classifyData.red_flags,
      green_flags: classifyData.green_flags,
      category: classifyData.category,
      competition_level: classifyData.competition_level,
    },
    proposal: {
      cover_letter: proposalData.cover_letter,
      tone_detected: proposalData.tone_detected,
      template_used: proposalData.template_used,
      word_count: proposalData.word_count,
    },
    ai_tokens_used: totalTokens,
  });

  // Increment usage
  await User.findByIdAndUpdate(user._id, {
    $inc: { 'usage.analyses_this_month': 1, 'usage.total_analyses': 1 },
  });

  // ── Cache the AI results ────────────────────────────────────────────────────
  await setCached(jobData.description, {
    classify: classifyData,
    score: scoreData,
    proposal: proposalData,
  });

  res.status(201).json({ success: true, data: savedAnalysis, cached: false });

  // Send first-analysis email if this is the user's first ever analysis (non-blocking)
  if (fullUser.usage.total_analyses === 0) {
    sendFirstAnalysis({ email: fullUser.email, name: fullUser.name, analysis: savedAnalysis })
      .catch((err) => console.error('[Analysis] First-analysis email failed:', err.message));
  }
}

module.exports = withErrorHandler(
  withAuth(
    withRateLimit(handler, {
      windowMs: 60 * 1000,   // 1 minute window
      max: 5,                 // max 5 analyses per minute per IP
      message: 'Too many analysis requests. Please wait a moment.',
    })
  )
);
