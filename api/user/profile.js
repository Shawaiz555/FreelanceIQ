const { AppError, withErrorHandler, withAuth } = require('../lib/withMiddleware');

function parseBody(req) {
  // Vercel dev pre-parses body onto req.body; deployed functions use raw stream
  if (req.body !== undefined) return Promise.resolve(req.body);
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')); }
      catch { reject(new AppError('Invalid JSON body', 400)); }
    });
    req.on('error', reject);
  });
}

async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({
      success: true,
      data: req.user.toSafeObject(),
    });
  }

  if (req.method === 'PATCH') {
    const body = await parseBody(req);

    // Whitelist allowed fields — never allow email, passwordHash, subscription, usage, _id
    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim().length < 2 || body.name.trim().length > 100) {
        throw new AppError('Name must be between 2 and 100 characters', 400);
      }
      req.user.name = body.name.trim();
    }

    if (body.profile && typeof body.profile === 'object') {
      const allowed = ['title', 'skills', 'hourly_rate_usd', 'experience_years', 'upwork_url', 'fiverr_url', 'bio'];
      for (const key of allowed) {
        if (body.profile[key] !== undefined) {
          req.user.profile[key] = body.profile[key];
        }
      }
    }

    if (body.settings && typeof body.settings === 'object') {
      const allowed = ['email_digest', 'extension_auto_open', 'language'];
      for (const key of allowed) {
        if (body.settings[key] !== undefined) {
          req.user.settings[key] = body.settings[key];
        }
      }
    }

    await req.user.save();

    return res.status(200).json({
      success: true,
      data: req.user.toSafeObject(),
      message: 'Profile updated',
    });
  }

  throw new AppError('Method not allowed', 405);
}

module.exports = withErrorHandler(withAuth(handler));
