const mongoose = require('mongoose');
const connectDB = require('../lib/db');
const Analysis = require('../lib/models/Analysis');
const { AppError, withErrorHandler, withAuth } = require('../lib/withMiddleware');

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
  // Vercel file-based routing: id comes from req.query (e.g. ?id=xxx)
  // Express local dev server: id comes from req.params (app.all('/api/analysis/:id', ...))
  const id = req.query.id || req.params?.id;

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid analysis ID', 400);
  }

  await connectDB();

  // ── GET /api/analysis/[id] ────────────────────────────────────────────────
  if (req.method === 'GET') {
    const analysis = await Analysis.findOne({ _id: id, user_id: req.user._id }).lean();
    if (!analysis) throw new AppError('Analysis not found', 404);

    return res.status(200).json({ success: true, data: analysis });
  }

  // ── PATCH /api/analysis/[id]/outcome ─────────────────────────────────────
  // The route is /api/analysis/[id] with ?outcome=1 or just PATCH on the resource.
  // Vercel file-based routing: PATCH method on this file handles the outcome update.
  if (req.method === 'PATCH') {
    const body = await parseBody(req);
    const { did_bid, did_win, actual_bid_amount } = body;

    const update = {};
    if (typeof did_bid === 'boolean') update['outcome.did_bid'] = did_bid;
    if (typeof did_win === 'boolean' || did_win === null) update['outcome.did_win'] = did_win;
    if (actual_bid_amount !== undefined) {
      if (actual_bid_amount !== null && (typeof actual_bid_amount !== 'number' || actual_bid_amount < 0)) {
        throw new AppError('actual_bid_amount must be a non-negative number or null', 400);
      }
      update['outcome.actual_bid_amount'] = actual_bid_amount;
    }

    if (Object.keys(update).length === 0) {
      throw new AppError('No valid outcome fields provided', 400);
    }

    const analysis = await Analysis.findOneAndUpdate(
      { _id: id, user_id: req.user._id },
      { $set: update },
      { new: true, lean: true }
    );
    if (!analysis) throw new AppError('Analysis not found', 404);

    return res.status(200).json({ success: true, data: analysis });
  }

  // ── DELETE /api/analysis/[id] ─────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const analysis = await Analysis.findOneAndDelete({ _id: id, user_id: req.user._id });
    if (!analysis) throw new AppError('Analysis not found', 404);

    return res.status(200).json({ success: true, message: 'Analysis deleted' });
  }

  throw new AppError('Method not allowed', 405);
}

module.exports = withErrorHandler(withAuth(handler));
