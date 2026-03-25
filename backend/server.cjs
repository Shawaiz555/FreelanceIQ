/**
 * Local development server — replaces `vercel dev` for testing without Vercel/GitHub.
 * Run: node server.cjs  (or: npm run api)
 * API available at http://localhost:3001/api/*
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const express = require('express');
const app = express();

// Webhook route must use raw body parser BEFORE express.json() runs,
// so the HMAC-SHA256 signature can be verified against the raw bytes.
app.all('/api/billing/webhook', express.raw({ type: '*/*' }), require('./billing/webhook'));

// Parse JSON bodies for all other routes
app.use(express.json());

// ─── Auth ─────────────────────────────────────────────────────────────────────
app.all('/api/auth/register', require('./auth/register'));
app.all('/api/auth/login', require('./auth/login'));
app.all('/api/auth/refresh', require('./auth/refresh'));
app.all('/api/auth/forgot-password', require('./auth/forgot-password'));
app.all('/api/auth/reset-password', require('./auth/reset-password'));

// ─── User ─────────────────────────────────────────────────────────────────────
app.all('/api/user/profile', require('./user/profile'));

// ─── Analysis ─────────────────────────────────────────────────────────────────
app.all('/api/analysis/create', require('./analysis/create'));
app.all('/api/analysis/history', require('./analysis/history'));
app.all('/api/analysis/:id', require('./analysis/[id]'));

// ─── Proposals ────────────────────────────────────────────────────────────────
app.all('/api/proposals/generate', require('./proposals/generate'));

// ─── Billing ──────────────────────────────────────────────────────────────────
app.all('/api/billing/plans', require('./billing/plans'));
app.all('/api/billing/checkout', require('./billing/checkout'));
app.all('/api/billing/portal', require('./billing/portal'));
// Note: /api/billing/webhook is registered above express.json() for raw body access

// ─── Analytics ────────────────────────────────────────────────────────────────
app.all('/api/analytics/dashboard', require('./analytics/dashboard'));

const http = require('http');
const PORT = 3001;
const server = http.createServer(app);
server.listen(PORT, () => {
  console.log(`[API] Local dev server running at http://localhost:${PORT} successfully!`);
});
