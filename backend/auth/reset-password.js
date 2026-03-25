const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const connectDB = require('../lib/db');
const User = require('../lib/models/User');
const { AppError, withErrorHandler, withRateLimit } = require('../lib/withMiddleware');

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
  const { token, password } = body;

  if (!token || typeof token !== 'string' || !token.trim()) {
    throw new AppError('Reset token is required', 400);
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    throw new AppError('Password must be at least 8 characters', 400);
  }

  const hashedToken = crypto.createHash('sha256').update(token.trim()).digest('hex');

  await connectDB();

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: new Date() },
  }).select('+passwordResetToken +passwordResetExpires');

  if (!user) {
    throw new AppError('Reset token is invalid or has expired', 400);
  }

  user.passwordHash = await bcrypt.hash(password, 12);
  user.passwordResetToken = null;
  user.passwordResetExpires = null;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Password reset successful. You can now log in with your new password.',
  });
}

module.exports = withErrorHandler(withRateLimit(handler, { max: 10, windowMs: 15 * 60 * 1000 }));
