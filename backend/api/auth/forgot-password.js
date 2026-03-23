const crypto = require('crypto');
const connectDB = require('../lib/db');
const User = require('../lib/models/User');
const { AppError, withErrorHandler, withRateLimit } = require('../lib/withMiddleware');
const { sendPasswordReset } = require('../lib/services/mailjet.service');

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
  const { email } = body;

  if (!email || typeof email !== 'string' || !email.trim()) {
    throw new AppError('Email is required', 400);
  }

  await connectDB();

  // Always return 200 — don't reveal whether email exists (prevents enumeration)
  const user = await User.findOne({ email: email.toLowerCase().trim() })
    .select('+passwordResetToken +passwordResetExpires');

  if (user) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;

    // Non-blocking — don't let email failure affect response
    sendPasswordReset({ email: user.email, name: user.name, resetUrl }).catch((err) => {
      console.error('[ForgotPassword] Email failed:', err.message);
    });
  }

  res.status(200).json({
    success: true,
    message: 'If that email is registered, a reset link has been sent.',
  });
}

module.exports = withErrorHandler(withRateLimit(handler, { max: 5, windowMs: 15 * 60 * 1000 }));
