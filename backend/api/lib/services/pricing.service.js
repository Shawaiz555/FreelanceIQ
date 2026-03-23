const connectDB = require('../db');
const CategoryRate = require('../models/CategoryRate');

// Fallback rates if DB is unavailable
const FALLBACK = {
  median_hourly_rate: 50,
  p25_rate: 30,
  p75_rate: 80,
  sample_size: 0,
};

/**
 * Fetch market rate data for a given category from MongoDB.
 * Seeds the collection on first call if empty.
 * Enriches jobData with category context before the AI pipeline.
 */
async function getPricingData(category) {
  try {
    await connectDB();
    await CategoryRate.seedIfEmpty();

    const record = await CategoryRate.findOne({ category });
    if (record) {
      return {
        category: record.category,
        median_hourly_rate: record.median_hourly_rate,
        p25_rate: record.p25_rate,
        p75_rate: record.p75_rate,
        sample_size: record.sample_size,
      };
    }

    // Fallback to "Other" if exact category not found
    const other = await CategoryRate.findOne({ category: 'Other' });
    if (other) {
      return {
        category: 'Other',
        median_hourly_rate: other.median_hourly_rate,
        p25_rate: other.p25_rate,
        p75_rate: other.p75_rate,
        sample_size: other.sample_size,
      };
    }
  } catch (err) {
    console.error('[PricingService] DB error, using fallback rates:', err.message);
  }

  return { category: category || 'Other', ...FALLBACK };
}

/**
 * Enriches raw job input with market pricing context.
 * Returns { enrichedJob, pricingData } for the analysis pipeline.
 */
async function enrichJobWithPricing(jobData, detectedCategory) {
  const pricingData = await getPricingData(detectedCategory);

  const enrichedJob = {
    ...jobData,
    _market: {
      category: pricingData.category,
      median_hourly_rate: pricingData.median_hourly_rate,
      budget_vs_market:
        jobData.budget_max > 0
          ? (jobData.budget_max / pricingData.median_hourly_rate).toFixed(1) + 'x'
          : 'unknown',
    },
  };

  return { enrichedJob, pricingData };
}

module.exports = { getPricingData, enrichJobWithPricing };
