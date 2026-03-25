const connectDB = require('../lib/db');
const Analysis = require('../lib/models/Analysis');
const { AppError, withErrorHandler, withAuth } = require('../lib/withMiddleware');

async function handler(req, res) {
  if (req.method !== 'GET') throw new AppError('Method not allowed', 405);

  await connectDB();
  const userId = req.user._id;

  const now = new Date();
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

  const [allAnalyses, thisWeekAnalyses, total] = await Promise.all([
    Analysis.find({ user_id: userId })
      .select('result.bid_score result.win_probability outcome created_at job.title job.platform result.bid_min result.bid_max')
      .sort({ created_at: -1 })
      .limit(100)
      .lean(),
    Analysis.countDocuments({ user_id: userId, created_at: { $gte: weekAgo } }),
    Analysis.countDocuments({ user_id: userId }),
  ]);

  // Average bid score
  const avg_bid_score = total > 0
    ? Math.round(allAnalyses.reduce((sum, a) => sum + (a.result?.bid_score || 0), 0) / total)
    : 0;

  // Win rate: among analyses where user bid AND recorded a win/loss
  const decidedBids = allAnalyses.filter(
    (a) => a.outcome?.did_bid === true && a.outcome?.did_win !== null
  );
  const wins = decidedBids.filter((a) => a.outcome.did_win === true).length;
  const win_rate = decidedBids.length > 0 ? wins / decidedBids.length : 0;

  // Score trend — last 7 analyses (oldest → newest for chart)
  const score_trend = allAnalyses
    .slice(0, 7)
    .reverse()
    .map((a) => a.result?.bid_score || 0);

  // Recent 5 analyses for the dashboard list
  const recent_analyses = allAnalyses.slice(0, 5);

  res.status(200).json({
    success: true,
    data: {
      analyses_this_week: thisWeekAnalyses,
      avg_bid_score,
      win_rate,
      total_analyses: total,
      recent_analyses,
      score_trend,
    },
  });
}

module.exports = withErrorHandler(withAuth(handler));
