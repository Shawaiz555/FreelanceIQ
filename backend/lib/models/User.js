const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    profile: {
      title: { type: String, default: '' },
      skills: { type: [String], default: [] },
      hourly_rate_usd: { type: Number, default: 0, min: 0 },
      experience_years: { type: Number, default: 0, min: 0 },
      upwork_url: { type: String, default: '' },
      bio: { type: String, default: '', maxlength: 500 },
      // CV parsed text — used for LinkedIn job matching
      cv_text: { type: String, default: '', maxlength: 20000 },
      cv_filename: { type: String, default: '' },
      cv_uploaded_at: { type: Date, default: null },
    },
    subscription: {
      tier: { type: String, enum: ['free', 'pro', 'agency'], default: 'free' },
      ls_customer_id: { type: String, default: null },
      ls_subscription_id: { type: String, default: null },
      current_period_end: { type: Date, default: null },
      status: {
        type: String,
        enum: ['active', 'past_due', 'canceled', 'trialing'],
        default: 'active',
      },
    },
    usage: {
      analyses_this_month: { type: Number, default: 0 },
      total_analyses: { type: Number, default: 0 },
      reset_date: { type: Date },
    },
    settings: {
      email_digest: { type: Boolean, default: true },
      extension_auto_open: { type: Boolean, default: true },
      language: { type: String, default: 'en' },
    },
    passwordResetToken: { type: String, default: null, select: false },
    passwordResetExpires: { type: Date, default: null, select: false },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false,
  }
);

// Set usage.reset_date to first day of next month on creation
userSchema.pre('save', function (next) {
  if (this.isNew) {
    const now = new Date();
    this.usage.reset_date = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }
  next();
});

// Returns a safe plain object with passwordHash removed
userSchema.methods.toSafeObject = function () {
  const obj = this.toObject({ versionKey: false });
  delete obj.passwordHash;
  return obj;
};

// Static: find by email and include passwordHash (for login)
userSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase() }).select('+passwordHash');
};

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
