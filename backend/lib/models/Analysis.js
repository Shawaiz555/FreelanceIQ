const mongoose = require('mongoose');

const analysisSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    job: {
      platform: {
        type: String,
        enum: ['upwork', 'fiverr', 'freelancer', 'toptal', 'other'],
        required: true,
      },
      url: { type: String, default: '' },
      title: { type: String, required: true },
      description: { type: String, required: true },
      budget_min: { type: Number, default: 0 },
      budget_max: { type: Number, default: 0 },
      skills_required: { type: [String], default: [] },
      client_hires: { type: Number, default: 0 },
    },
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
    proposal: {
      cover_letter: { type: String, default: '' },
      tone_detected: { type: String, default: null },
      template_used: { type: String, default: null },
      word_count: { type: Number, default: 0 },
    },
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
