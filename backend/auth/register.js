const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const connectDB = require('../lib/db');
const User = require('../lib/models/User');
const { AppError, withErrorHandler, withRateLimit } = require('../lib/withMiddleware');
const { sendWelcome } = require('../lib/services/mailjet.service');

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

function validateEmail(email) {
  return typeof email === 'string' && /.+@.+\..+/.test(email);
}

async function handler(req, res) {
  if (req.method !== 'POST') throw new AppError('Method not allowed', 405);

  const body = await parseBody(req);
  const { name, email, password } = body;

  if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
    throw new AppError('Name must be between 2 and 100 characters', 400);
  }
  if (!email || !validateEmail(email)) {
    throw new AppError('Valid email address is required', 400);
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    throw new AppError('Password must be at least 8 characters', 400);
  }

  await connectDB();

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) throw new AppError('Email already registered', 409);

  const passwordHash = await bcrypt.hash(password, 12);
  const user = new User({ name: name.trim(), email, passwordHash });
  try {
    await user.save();
  } catch (saveErr) {
    // MongoDB duplicate key (race condition between findOne check and save)
    if (saveErr.code === 11000) throw new AppError('Email already registered', 409);
    throw saveErr;
  }

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
  res.setHeader(
    'Set-Cookie',
    `refreshToken=${refreshToken}; HttpOnly; Secure; SameSite=Strict; Path=/api/auth; Max-Age=${maxAge}`
  );

  res.status(201).json({
    success: true,
    data: { user: user.toSafeObject(), token: accessToken },
    message: 'Registration successful',
  });

  // Fire welcome email after response is sent (non-blocking)
  sendWelcome({ email: user.email, name: user.name }).catch((err) => {
    console.error('[Register] Welcome email failed:', err.message);
  });
}

module.exports = withErrorHandler(withRateLimit(handler, { max: 10 }));
