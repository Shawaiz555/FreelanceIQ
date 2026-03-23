const stripe = require('stripe');
const connectDB = require('../lib/db');
const { AppError, withErrorHandler, withAuth, withRateLimit } = require('../lib/withMiddleware');

// Stripe price IDs — set these in env or map from plan slug
const PRICE_MAP = {
  pro: process.env.STRIPE_PRICE_PRO,
  agency: process.env.STRIPE_PRICE_AGENCY,
};

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
  const { planId } = body;

  if (!planId || !['pro', 'agency'].includes(planId)) {
    throw new AppError('planId must be "pro" or "agency"', 400);
  }

  const priceId = PRICE_MAP[planId];
  if (!priceId) {
    throw new AppError(`Stripe price ID for plan "${planId}" is not configured`, 500);
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    throw new AppError('Stripe is not configured', 500);
  }

  await connectDB();
  const user = req.user;

  const stripeClient = stripe(process.env.STRIPE_SECRET_KEY);

  // Retrieve or create Stripe customer
  let customerId = user.subscription?.stripe_customer_id;
  if (!customerId) {
    const customer = await stripeClient.customers.create({
      email: user.email,
      name: user.name,
      metadata: { userId: user._id.toString() },
    });
    customerId = customer.id;

    // Save customer ID to DB
    const User = require('../lib/models/User');
    await User.findByIdAndUpdate(user._id, {
      'subscription.stripe_customer_id': customerId,
    });
  }

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  const session = await stripeClient.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${frontendUrl}/billing?success=1&plan=${planId}`,
    cancel_url: `${frontendUrl}/billing?canceled=1`,
    metadata: { userId: user._id.toString(), planId },
    subscription_data: {
      metadata: { userId: user._id.toString(), planId },
    },
  });

  res.status(200).json({
    success: true,
    data: { url: session.url, sessionId: session.id },
  });
}

module.exports = withErrorHandler(withAuth(withRateLimit(handler, { max: 10 })));
