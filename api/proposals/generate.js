const connectDB = require('../lib/db');
const { generateProposal, classifyJob } = require('../lib/services/openai.service');
const { AppError, withErrorHandler, withAuth, withRateLimit } = require('../lib/withMiddleware');

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

async function handler(req, res) {
  if (req.method !== 'POST') throw new AppError('Method not allowed', 405);

  const body = await parseBody(req);
  const { jobDescription, tone = 'professional', analysisId } = body;

  if (!jobDescription || typeof jobDescription !== 'string' || jobDescription.trim().length < 50) {
    throw new AppError('jobDescription must be at least 50 characters', 400);
  }

  const validTones = ['professional', 'confident', 'friendly', 'concise'];
  if (!validTones.includes(tone)) {
    throw new AppError(`tone must be one of: ${validTones.join(', ')}`, 400);
  }

  await connectDB();
  const user = req.user;

  // If regenerating from an existing analysis, load it for context
  let existingAnalysis = null;
  if (analysisId) {
    const mongoose = require('mongoose');
    if (mongoose.Types.ObjectId.isValid(analysisId)) {
      const Analysis = require('../lib/models/Analysis');
      existingAnalysis = await Analysis.findOne({ _id: analysisId, user_id: user._id }).lean();
    }
  }

  // Build minimal job data for the generate call
  const jobData = existingAnalysis
    ? existingAnalysis.job
    : {
        platform: 'other',
        title: 'Job Analysis',
        description: jobDescription.trim(),
        budget_min: 0,
        budget_max: 0,
        skills_required: [],
        client_hires: 0,
      };

  // Use existing classify result if available, otherwise do a quick classify
  let classifyData = existingAnalysis
    ? {
        category: existingAnalysis.result.category,
        green_flags: existingAnalysis.result.green_flags,
        red_flags: existingAnalysis.result.red_flags,
        skills_detected: existingAnalysis.job.skills_required,
        competition_level: existingAnalysis.result.competition_level,
        client_quality_score: 50,
      }
    : null;

  if (!classifyData) {
    const { data } = await classifyJob({ ...jobData, description: jobDescription });
    classifyData = data;
  }

  // Minimal score result for the proposal generator
  const scoreResult = existingAnalysis
    ? {
        bid_min: existingAnalysis.result.bid_min,
        bid_max: existingAnalysis.result.bid_max,
        win_probability: existingAnalysis.result.win_probability,
      }
    : { bid_min: 0, bid_max: 0, win_probability: 'Medium' };

  // Override tone in job data so prompt reflects user's choice
  const { data: proposalData } = await generateProposal(
    { ...jobData, _requestedTone: tone },
    classifyData,
    scoreResult,
    { ...user.profile, name: user.name }
  );

  // If we have an analysis, patch it with the new cover letter
  if (existingAnalysis) {
    const Analysis = require('../lib/models/Analysis');
    await Analysis.findByIdAndUpdate(existingAnalysis._id, {
      'proposal.cover_letter': proposalData.cover_letter,
      'proposal.tone_detected': proposalData.tone_detected,
      'proposal.template_used': proposalData.template_used,
      'proposal.word_count': proposalData.word_count,
    });
  }

  res.status(200).json({
    success: true,
    data: {
      cover_letter: proposalData.cover_letter,
      tone_detected: proposalData.tone_detected,
      template_used: proposalData.template_used,
      word_count: proposalData.word_count,
    },
  });
}

module.exports = withErrorHandler(
  withAuth(
    withRateLimit(handler, {
      windowMs: 60 * 1000,
      max: 10,
      message: 'Too many proposal requests. Please wait a moment.',
    })
  )
);
