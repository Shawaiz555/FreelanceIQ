const mongoose = require('mongoose');

// Stores market median hourly rates per category, updated periodically.
// Seeded with initial values; pricing.service.js reads from this collection.
const categoryRateSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    median_hourly_rate: { type: Number, required: true, min: 0 },
    p25_rate: { type: Number, required: true, min: 0 },
    p75_rate: { type: Number, required: true, min: 0 },
    sample_size: { type: Number, default: 0 },
    last_updated: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

// Seed data — approximate 2024 market rates (USD/hr)
const SEED_RATES = [
  { category: 'Web Development',    median_hourly_rate: 65,  p25_rate: 40,  p75_rate: 100, sample_size: 500 },
  { category: 'Mobile Development', median_hourly_rate: 75,  p25_rate: 50,  p75_rate: 110, sample_size: 320 },
  { category: 'Data Science',       median_hourly_rate: 80,  p25_rate: 55,  p75_rate: 120, sample_size: 280 },
  { category: 'Graphic Design',     median_hourly_rate: 40,  p25_rate: 25,  p75_rate: 65,  sample_size: 450 },
  { category: 'Content Writing',    median_hourly_rate: 30,  p25_rate: 18,  p75_rate: 50,  sample_size: 600 },
  { category: 'SEO/Marketing',      median_hourly_rate: 45,  p25_rate: 28,  p75_rate: 70,  sample_size: 380 },
  { category: 'Video/Animation',    median_hourly_rate: 55,  p25_rate: 35,  p75_rate: 90,  sample_size: 220 },
  { category: 'Cybersecurity',      median_hourly_rate: 100, p25_rate: 70,  p75_rate: 150, sample_size: 150 },
  { category: 'DevOps/Cloud',       median_hourly_rate: 90,  p25_rate: 65,  p75_rate: 130, sample_size: 200 },
  { category: 'Other',              median_hourly_rate: 45,  p25_rate: 25,  p75_rate: 70,  sample_size: 100 },
];

categoryRateSchema.statics.seedIfEmpty = async function () {
  const count = await this.countDocuments();
  if (count === 0) {
    await this.insertMany(SEED_RATES);
    console.log('[CategoryRate] Seeded initial rate data');
  }
};

module.exports =
  mongoose.models.CategoryRate || mongoose.model('CategoryRate', categoryRateSchema);
