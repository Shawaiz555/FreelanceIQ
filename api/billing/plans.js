const { withErrorHandler } = require('../lib/withMiddleware');

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price_monthly: 0,
    features: [
      '5 analyses per month',
      '1 cover letter per analysis',
      'Bid score (0–100)',
      'AI-suggested bid range',
      'Analysis history (last 10)',
    ],
    limits: { analyses_per_month: 5 },
  },
  {
    id: 'pro',
    name: 'Pro',
    price_monthly: 9,
    popular: true,
    features: [
      'Unlimited bid analyses',
      'Unlimited cover letters',
      'Win probability score',
      'Red & green flag breakdown',
      '10+ niche proposal templates',
      'Profile strength score',
      'Monthly earnings report',
    ],
    limits: { analyses_per_month: null },
  },
  {
    id: 'agency',
    name: 'Agency',
    price_monthly: 29,
    features: [
      'All Pro features',
      'Up to 5 team members',
      'Shared template library',
      'Team analytics dashboard',
      'White-label PDF/DOCX export',
      'API access',
    ],
    limits: { analyses_per_month: null, team_members: 5 },
  },
];

async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }
  res.status(200).json({ success: true, data: PLANS });
}

module.exports = withErrorHandler(handler);
