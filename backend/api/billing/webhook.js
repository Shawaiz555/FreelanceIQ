const stripe = require('stripe');
const connectDB = require('../lib/db');
const User = require('../lib/models/User');
const { withErrorHandler } = require('../lib/withMiddleware');

// Stripe requires the raw body for signature verification — do NOT parse JSON first
function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// Maps Stripe price IDs back to our tier slugs
function tierFromPriceId(priceId) {
  if (priceId === process.env.STRIPE_PRICE_PRO) return 'pro';
  if (priceId === process.env.STRIPE_PRICE_AGENCY) return 'agency';
  return null;
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  const sig = req.headers['stripe-signature'];
  if (!sig) {
    res.status(400).json({ success: false, error: 'Missing stripe-signature header' });
    return;
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET || !process.env.STRIPE_SECRET_KEY) {
    res.status(500).json({ success: false, error: 'Stripe not configured' });
    return;
  }

  const rawBody = await getRawBody(req);

  let event;
  try {
    const stripeClient = stripe(process.env.STRIPE_SECRET_KEY);
    event = stripeClient.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('[Webhook] Signature verification failed:', err.message);
    res.status(400).json({ success: false, error: `Webhook error: ${err.message}` });
    return;
  }

  await connectDB();

  try {
    switch (event.type) {
      // ── Subscription created / upgraded ─────────────────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.mode !== 'subscription') break;

        const userId = session.metadata?.userId;
        if (!userId) break;

        const stripeClient = stripe(process.env.STRIPE_SECRET_KEY);
        const subscription = await stripeClient.subscriptions.retrieve(session.subscription);
        const priceId = subscription.items.data[0]?.price?.id;
        const tier = tierFromPriceId(priceId) || 'pro';
        const periodEnd = new Date(subscription.current_period_end * 1000);

        await User.findByIdAndUpdate(userId, {
          'subscription.tier': tier,
          'subscription.stripe_customer_id': session.customer,
          'subscription.stripe_subscription_id': session.subscription,
          'subscription.current_period_end': periodEnd,
          'subscription.status': 'active',
        });

        console.log(`[Webhook] checkout.session.completed — user ${userId} → ${tier}`);
        break;
      }

      // ── Subscription renewed ─────────────────────────────────────────────────
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        if (!invoice.subscription) break;

        const stripeClient = stripe(process.env.STRIPE_SECRET_KEY);
        const subscription = await stripeClient.subscriptions.retrieve(invoice.subscription);
        const customerId = invoice.customer;
        const periodEnd = new Date(subscription.current_period_end * 1000);

        await User.findOneAndUpdate(
          { 'subscription.stripe_customer_id': customerId },
          {
            'subscription.status': 'active',
            'subscription.current_period_end': periodEnd,
          }
        );
        break;
      }

      // ── Payment failed ───────────────────────────────────────────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const customerId = invoice.customer;

        await User.findOneAndUpdate(
          { 'subscription.stripe_customer_id': customerId },
          { 'subscription.status': 'past_due' }
        );

        console.warn(`[Webhook] invoice.payment_failed — customer ${customerId}`);
        break;
      }

      // ── Subscription cancelled ───────────────────────────────────────────────
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        await User.findOneAndUpdate(
          { 'subscription.stripe_customer_id': customerId },
          {
            'subscription.tier': 'free',
            'subscription.status': 'canceled',
            'subscription.stripe_subscription_id': null,
            'subscription.current_period_end': null,
          }
        );

        console.log(`[Webhook] customer.subscription.deleted — customer ${customerId} → free`);
        break;
      }

      // ── Subscription updated (plan change via portal) ────────────────────────
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        const priceId = subscription.items.data[0]?.price?.id;
        const tier = tierFromPriceId(priceId);
        const status = subscription.status;
        const periodEnd = new Date(subscription.current_period_end * 1000);

        const update = {
          'subscription.status': status,
          'subscription.current_period_end': periodEnd,
        };
        if (tier) update['subscription.tier'] = tier;

        await User.findOneAndUpdate(
          { 'subscription.stripe_customer_id': customerId },
          update
        );
        break;
      }

      default:
        // Acknowledge but ignore unhandled events
        break;
    }
  } catch (err) {
    console.error(`[Webhook] Handler error for ${event.type}:`, err);
    // Still return 200 so Stripe doesn't retry indefinitely for non-critical events
  }

  res.status(200).json({ received: true });
}

// Note: withErrorHandler adds CORS headers — Stripe doesn't need them,
// but it won't hurt. We skip withAuth since this is called by Stripe, not a user.
module.exports = withErrorHandler(handler);
