const mongoose = require('mongoose');

const analysisSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // "bid"       = freelance bid scoring  (Upwork)
    // "job_match" = CV-to-job matching     (LinkedIn)
    analysis_type: {
      type: String,
      enum: ['bid', 'job_match'],
      default: 'bid',
    },
    job: {
      platform: {
        type: String,
        enum: ['upwork', 'linkedin', 'other'],
        required: true,
      },
      url: { type: String, default: '' },
      title: { type: String, required: true },
      description: { type: String, required: true },
      budget_min: { type: Number, default: 0 },
      budget_max: { type: Number, default: 0 },
      skills_required: { type: [String], default: [] },
      client_hires: { type: Number, default: 0 },
      // LinkedIn-specific
      company: { type: String, default: '' },
      location: { type: String, default: '' },
      workplace_type: { type: String, default: '' },
      seniority_level: { type: String, default: '' },
    },
    // Bid analysis result (Upwork)
    result: {
      bid_score: { type: Number, min: 0, max: 100 },
      score_reasoning: { type: String },
      bid_min: { type: Number },
      bid_max: { type: Number },
      win_probability: { type: String, enum: ['Low', 'Medium', 'High'] },
      red_flags: { type: [String] },
      green_flags: { type: [String] },
      category: { type: String },
      competition_level: { type: String, enum: ['Low', 'Medium', 'High'] },
    },
    // Job-match result (LinkedIn)
    match_result: {
      match_score: { type: Number, min: 0, max: 100 },
      score_reasoning: { type: String },
      matched_skills: { type: [String], default: [] },
      skill_gaps: { type: [String], default: [] },
      strengths: { type: [String], default: [] },
      application_summary: { type: String, default: '' },
      recommended_action: {
        type: String,
        enum: ['Apply', 'Apply with caveats', 'Skip'],
      },
    },
    proposal: {
      cover_letter: { type: String, default: '' },
      tone_detected: { type: String, default: null },
      template_used: { type: String, default: null },
      word_count: { type: Number, default: 0 },
    },
    // Tailored CV plain text generated for LinkedIn jobs (analysis_type: 'job_match')
    // Preserves the exact structure/layout of the user's original uploaded CV
    generated_cv: { type: String, default: '' },
    outcome: {
      did_bid: { type: Boolean, default: false },
      did_win: { type: Boolean, default: null },
      actual_bid_amount: { type: Number, default: null },
    },
    ai_tokens_used: { type: Number, default: 0 },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
    versionKey: false,
  }
);

analysisSchema.index({ user_id: 1, created_at: -1 });

module.exports =
  mongoose.models.Analysis || mongoose.model('Analysis', analysisSchema);
