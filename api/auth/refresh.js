const jwt = require('jsonwebtoken');
const connectDB = require('../lib/db');
const User = require('../lib/models/User');
const { AppError, withErrorHandler } = require('../lib/withMiddleware');

function getCookie(cookieHeader, name) {
  if (!cookieHeader) return null;
  const match = cookieHeader
    .split(';')
    .find((c) => c.trim().startsWith(name + '='));
  return match ? match.trim().slice(name.length + 1) : null;
}

async function handler(req, res) {
  if (req.method !== 'POST') throw new AppError('Method not allowed', 405);

  // Accept refresh token from HttpOnly cookie (web app) OR X-Refresh-Token header (extension)
  const token = getCookie(req.headers.cookie, 'refreshToken')
    || req.headers['x-refresh-token']
    || null;
  if (!token) throw new AppError('No refresh token', 401);

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  await connectDB();
  const user = await User.findById(decoded.userId);
  if (!user) throw new AppError('User not found', 401);

  const accessToken = jwt.sign(
    { userId: user._id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );

  res.status(200).json({
    success: true,
    data: { token: accessToken },
  });
}

module.exports = withErrorHandler(handler);
