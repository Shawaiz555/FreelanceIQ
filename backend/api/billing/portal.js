const { AppError, withErrorHandler, withAuth } = require('../lib/withMiddleware');

async function handler(req, res) {
  if (req.method !== 'POST') throw new AppError('Method not allowed', 405);

  if (!process.env.LEMONSQUEEZY_API_KEY) {
    throw new AppError('Lemon Squeezy is not configured', 500);
  }

  const user = req.user;
  const subscriptionId = user.subscription?.ls_subscription_id;

  // If the user has an active subscription, fetch the pre-authenticated customer
  // portal URL from the LS subscription object
  if (subscriptionId) {
    const response = await fetch(
      `https://api.lemonsqueezy.com/v1/subscriptions/${subscriptionId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
          Accept: 'application/vnd.api+json',
        },
      }
    );

    if (response.ok) {
      const json = await response.json();
      const portalUrl = json.data?.attributes?.urls?.customer_portal;

      if (portalUrl) {
        return res.status(200).json({
          success: true,
          data: { url: portalUrl },
        });
      }
    }

    console.warn('[Portal] Could not fetch subscription portal URL from LS, using fallback');
  }

  // Fallback: generic Lemon Squeezy orders page — user authenticates with their email
  res.status(200).json({
    success: true,
    data: { url: 'https://app.lemonsqueezy.com/my-orders' },
  });
}

module.exports = withErrorHandler(withAuth(handler));
