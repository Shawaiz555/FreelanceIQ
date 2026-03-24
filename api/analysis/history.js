const connectDB = require('../lib/db');
const Analysis = require('../lib/models/Analysis');
const { AppError, withErrorHandler, withAuth } = require('../lib/withMiddleware');

async function handler(req, res) {
  if (req.method !== 'GET') throw new AppError('Method not allowed', 405);

  const { page = '1', limit = '10', sort = 'newest' } = req.query;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  const sortOrder = sort === 'oldest' ? 1 : -1;

  await connectDB();

  const [analyses, total] = await Promise.all([
    Analysis.find({ user_id: req.user._id })
      .sort({ created_at: sortOrder })
      .skip(skip)
      .limit(limitNum)
      .select('-proposal.cover_letter') // omit large text from list view
      .lean(),
    Analysis.countDocuments({ user_id: req.user._id }),
  ]);

  res.status(200).json({
    success: true,
    data: analyses,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum),
      has_next: pageNum * limitNum < total,
      has_prev: pageNum > 1,
    },
  });
}

module.exports = withErrorHandler(withAuth(handler));
