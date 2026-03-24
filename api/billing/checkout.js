const connectDB = require('../lib/db');
const { AppError, withErrorHandler, withAuth, withRateLimit } = require('../lib/withMiddleware');

// Lemon Squeezy variant IDs — set these in env
const VARIANT_MAP = {
  pro: process.env.LEMONSQUEEZY_VARIANT_PRO,
  agency: process.env.LEMONSQUEEZY_VARIANT_AGENCY,
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

  const variantId = VARIANT_MAP[planId];
  if (!variantId) {
    throw new AppError(`Lemon Squeezy variant ID for plan "${planId}" is not configured`, 500);
  }

  if (!process.env.LEMONSQUEEZY_API_KEY || !process.env.LEMONSQUEEZY_STORE_ID) {
    throw new AppError('Lemon Squeezy is not configured', 500);
  }

  await connectDB();
  const user = req.user;

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  const payload = {
    data: {
      type: 'checkouts',
      attributes: {
        checkout_data: {
          email: user.email,
          name: user.name,
          custom: {
            user_id: user._id.toString(),
            plan_id: planId,
          },
        },
        product_options: {
          redirect_url: `${frontendUrl}/billing?success=1&plan=${planId}`,
        },
      },
      relationships: {
        store: {
          data: { type: 'stores', id: process.env.LEMONSQUEEZY_STORE_ID },
        },
        variant: {
          data: { type: 'variants', id: variantId },
        },
      },
    },
  };

  const response = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
      'Content-Type': 'application/vnd.api+json',
      Accept: 'application/vnd.api+json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errBody = await response.text();
    console.error('[Checkout] Lemon Squeezy API error:', response.status, errBody);
    throw new AppError('Failed to create checkout session', 502);
  }

  const json = await response.json();
  const checkoutUrl = json.data?.attributes?.url;

  if (!checkoutUrl) {
    throw new AppError('Lemon Squeezy did not return a checkout URL', 502);
  }

  res.status(200).json({
    success: true,
    data: { url: checkoutUrl },
  });
}

module.exports = withErrorHandler(withAuth(withRateLimit(handler, { max: 10 })));
