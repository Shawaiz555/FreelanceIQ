const crypto = require('crypto');
const connectDB = require('../lib/db');
const User = require('../lib/models/User');
const { withErrorHandler } = require('../lib/withMiddleware');

// Reads raw body as Buffer.
// If express.raw() was applied to this route, req.body is already a Buffer.
// Otherwise falls back to reading the stream directly (Vercel serverless context).
function getRawBody(req) {
  if (Buffer.isBuffer(req.body)) return Promise.resolve(req.body);
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// Verifies the X-Signature header using HMAC-SHA256
// LS sends the signature as a hex string — compare hex strings using timingSafeEqual
function verifySignature(rawBody, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(rawBody);
  const digest = hmac.digest('hex');
  // Compare as UTF-8 buffers (both are hex strings of equal length)
  const digestBuf = Buffer.from(digest, 'utf8');
  const sigBuf = Buffer.from(signature, 'utf8');
  if (digestBuf.length !== sigBuf.length) return false;
  return crypto.timingSafeEqual(digestBuf, sigBuf);
}

// Maps LS variant IDs back to our tier slugs
function tierFromVariantId(variantId) {
  if (variantId === process.env.LEMONSQUEEZY_VARIANT_PRO) return 'pro';
  if (variantId === process.env.LEMONSQUEEZY_VARIANT_AGENCY) return 'agency';
  return null;
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  const signature = req.headers['x-signature'];
  if (!signature) {
    res.status(400).json({ success: false, error: 'Missing x-signature header' });
    return;
  }

  if (!process.env.LEMONSQUEEZY_WEBHOOK_SECRET) {
    res.status(500).json({ success: false, error: 'Lemon Squeezy webhook secret not configured' });
    return;
  }

  const rawBody = await getRawBody(req);

  let isValid;
  try {
    isValid = verifySignature(rawBody, signature, process.env.LEMONSQUEEZY_WEBHOOK_SECRET);
  } catch (err) {
    console.error('[Webhook] Signature verification error:', err.message);
    res.status(400).json({ success: false, error: 'Signature verification failed' });
    return;
  }

  if (!isValid) {
    console.error('[Webhook] Invalid signature');
    res.status(400).json({ success: false, error: 'Invalid signature' });
    return;
  }

  let event;
  try {
    event = JSON.parse(rawBody.toString('utf8'));
  } catch (err) {
    res.status(400).json({ success: false, error: 'Invalid JSON payload' });
    return;
  }

  await connectDB();

  const eventName = event.meta?.event_name;
  const data = event.data?.attributes;
  const customData = event.meta?.custom_data || {};

  console.log(`[Webhook] Received event: ${eventName}`);

  try {
    switch (eventName) {
      // ── New subscription created ─────────────────────────────────────────────
      case 'subscription_created': {
        const userId = customData.user_id;
        if (!userId) {
          console.warn('[Webhook] subscription_created missing user_id in custom_data');
          break;
        }

        const variantId = String(data.variant_id);
        const tier = tierFromVariantId(variantId) || 'pro';
        const periodEnd = data.renews_at ? new Date(data.renews_at) : null;

        await User.findByIdAndUpdate(userId, {
          'subscription.tier': tier,
          'subscription.ls_customer_id': String(data.customer_id),
          'subscription.ls_subscription_id': String(event.data.id),
          'subscription.current_period_end': periodEnd,
          'subscription.status': 'active',
        });

        console.log(`[Webhook] subscription_created — user ${userId} → ${tier}`);
        break;
      }

      // ── Subscription renewed ─────────────────────────────────────────────────
      case 'subscription_payment_success': {
        const subscriptionId = String(event.data.id);
        const periodEnd = data.renews_at ? new Date(data.renews_at) : null;

        await User.findOneAndUpdate(
          { 'subscription.ls_subscription_id': subscriptionId },
          {
            'subscription.status': 'active',
            'subscription.current_period_end': periodEnd,
          }
        );

        console.log(`[Webhook] subscription_payment_success — subscription ${subscriptionId}`);
        break;
      }

      // ── Payment failed ───────────────────────────────────────────────────────
      case 'subscription_payment_failed': {
        const subscriptionId = String(event.data.id);

        await User.findOneAndUpdate(
          { 'subscription.ls_subscription_id': subscriptionId },
          { 'subscription.status': 'past_due' }
        );

        console.warn(`[Webhook] subscription_payment_failed — subscription ${subscriptionId}`);
        break;
      }

      // ── Subscription cancelled ───────────────────────────────────────────────
      case 'subscription_cancelled': {
        const subscriptionId = String(event.data.id);

        await User.findOneAndUpdate(
          { 'subscription.ls_subscription_id': subscriptionId },
          {
            'subscription.tier': 'free',
            'subscription.status': 'canceled',
            'subscription.ls_subscription_id': null,
            'subscription.current_period_end': null,
          }
        );

        console.log(`[Webhook] subscription_cancelled — subscription ${subscriptionId} → free`);
        break;
      }

      // ── Subscription updated (plan change) ───────────────────────────────────
      case 'subscription_updated': {
        const subscriptionId = String(event.data.id);
        const variantId = String(data.variant_id);
        const tier = tierFromVariantId(variantId);

        const statusMap = {
          active: 'active',
          on_trial: 'trialing',
          past_due: 'past_due',
          unpaid: 'past_due',
          paused: 'past_due',
          cancelled: 'canceled',
          expired: 'canceled',
        };
        const status = statusMap[data.status] || 'active';
        const periodEnd = data.renews_at ? new Date(data.renews_at) : null;

        const update = {
          'subscription.status': status,
          'subscription.current_period_end': periodEnd,
        };
        if (tier) update['subscription.tier'] = tier;

        await User.findOneAndUpdate(
          { 'subscription.ls_subscription_id': subscriptionId },
          update
        );

        console.log(`[Webhook] subscription_updated — subscription ${subscriptionId}`);
        break;
      }

      default:
        console.log(`[Webhook] Unhandled event type: ${eventName}`);
        break;
    }
  } catch (err) {
    console.error(`[Webhook] Handler error for ${eventName}:`, err);
    // Still return 200 so Lemon Squeezy doesn't retry indefinitely for non-critical events
  }

  res.status(200).json({ received: true });
}

// withErrorHandler adds CORS headers. We skip withAuth since this is called by LS, not a user.
module.exports = withErrorHandler(handler);
