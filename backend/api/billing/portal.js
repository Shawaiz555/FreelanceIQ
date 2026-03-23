const stripe = require('stripe');
const { AppError, withErrorHandler, withAuth } = require('../lib/withMiddleware');

async function handler(req, res) {
  if (req.method !== 'POST') throw new AppError('Method not allowed', 405);

  if (!process.env.STRIPE_SECRET_KEY) {
    throw new AppError('Stripe is not configured', 500);
  }

  const user = req.user;
  const customerId = user.subscription?.stripe_customer_id;

  if (!customerId) {
    throw new AppError('No Stripe customer found for this account. Please upgrade first.', 400);
  }

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const stripeClient = stripe(process.env.STRIPE_SECRET_KEY);

  const session = await stripeClient.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${frontendUrl}/billing`,
  });

  res.status(200).json({
    success: true,
    data: { url: session.url },
  });
}

module.exports = withErrorHandler(withAuth(handler));
