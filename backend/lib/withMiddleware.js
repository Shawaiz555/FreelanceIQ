const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const connectDB = require('./db');
const User = require('./models/User');

// ─── AppError ────────────────────────────────────────────────────────────────

class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

// ─── withErrorHandler ────────────────────────────────────────────────────────

function withErrorHandler(handler) {
  return async function (req, res) {
    const requestOrigin = req.headers.origin || '';
    const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',').map(s => s.trim());
    // Always allow chrome-extension:// origins (for the browser extension)
    const isAllowed = allowedOrigins.includes(requestOrigin) || requestOrigin.startsWith('chrome-extension://');
    res.setHeader('Access-Control-Allow-Origin', isAllowed ? requestOrigin : allowedOrigins[0]);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Refresh-Token');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');

    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    try {
      await handler(req, res);
    } catch (err) {
      if (err.isOperational) {
        res.status(err.statusCode).json({ success: false, error: err.message });
      } else {
        console.error('[Unhandled error]', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
      }
    }
  };
}

// ─── withAuth ────────────────────────────────────────────────────────────────

function withAuth(handler) {
  return async function (req, res) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Unauthorized', 401);
    }

    const token = authHeader.slice(7);

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new AppError('Token expired', 401);
      }
      throw new AppError('Invalid token', 401);
    }

    await connectDB();
    const user = await User.findById(decoded.userId);
    if (!user) throw new AppError('User not found', 401);

    req.user = user;
    await handler(req, res);
  };
}

// ─── withRateLimit ───────────────────────────────────────────────────────────

function withRateLimit(handler, opts = {}) {
  const limiter = rateLimit({
    windowMs: opts.windowMs || 15 * 60 * 1000,
    max: opts.max || 20,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        error: opts.message || 'Too many requests, please try again later',
      });
    },
  });

  // Return an async function so errors propagate up to withErrorHandler's try/catch
  return async function (req, res) {
    await new Promise((resolve, reject) => {
      limiter(req, res, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
    // If rate limiter already sent a 429, res.headersSent will be true — stop here
    if (res.headersSent) return;
    await handler(req, res);
  };
}

module.exports = { AppError, withErrorHandler, withAuth, withRateLimit };
