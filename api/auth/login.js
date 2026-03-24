const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const connectDB = require('../lib/db');
const User = require('../lib/models/User');
const { AppError, withErrorHandler, withRateLimit } = require('../lib/withMiddleware');

function parseBody(req) {
  // Vercel dev pre-parses body onto req.body; deployed functions use raw stream
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
  const { email, password } = body;

  if (!email || typeof email !== 'string' || !email.trim()) {
    throw new AppError('Email is required', 400);
  }
  if (!password || typeof password !== 'string' || !password.trim()) {
    throw new AppError('Password is required', 400);
  }

  await connectDB();

  // Use same error for wrong email OR wrong password to prevent user enumeration
  const user = await User.findByEmail(email);
  if (!user) throw new AppError('Invalid email or password', 401);

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) throw new AppError('Invalid email or password', 401);

  const accessToken = jwt.sign(
    { userId: user._id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
  const refreshToken = jwt.sign(
    { userId: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );

  const maxAge = 30 * 24 * 60 * 60;
  const isProd = process.env.NODE_ENV === 'production';
  res.setHeader(
    'Set-Cookie',
    `refreshToken=${refreshToken}; HttpOnly; ${isProd ? 'Secure; ' : ''}SameSite=${isProd ? 'Strict' : 'Lax'}; Path=/api/auth; Max-Age=${maxAge}`
  );

  res.status(200).json({
    success: true,
    data: { user: user.toSafeObject(), token: accessToken, refreshToken },
    message: 'Login successful',
  });
}

module.exports = withErrorHandler(withRateLimit(handler, { max: 10 }));
