/**
 * Local development server — replaces `vercel dev` for testing without Vercel/GitHub.
 * Run: node server.cjs  (or: npm run api)
 * API available at http://localhost:3001/api/*
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const express = require('express');
const app = express();

// Parse JSON bodies (equivalent to what vercel dev does automatically)
app.use(express.json());

// ─── Auth ─────────────────────────────────────────────────────────────────────
app.all('/api/auth/register', require('./api/auth/register'));
app.all('/api/auth/login', require('./api/auth/login'));
app.all('/api/auth/refresh', require('./api/auth/refresh'));
app.all('/api/auth/forgot-password', require('./api/auth/forgot-password'));
app.all('/api/auth/reset-password', require('./api/auth/reset-password'));

// ─── User ─────────────────────────────────────────────────────────────────────
app.all('/api/user/profile', require('./api/user/profile'));

// ─── Analysis ─────────────────────────────────────────────────────────────────
app.all('/api/analysis/create', require('./api/analysis/create'));
app.all('/api/analysis/history', require('./api/analysis/history'));
app.all('/api/analysis/:id', require('./api/analysis/[id]'));

// ─── Proposals ────────────────────────────────────────────────────────────────
app.all('/api/proposals/generate', require('./api/proposals/generate'));

// ─── Billing ──────────────────────────────────────────────────────────────────
app.all('/api/billing/plans', require('./api/billing/plans'));
app.all('/api/billing/checkout', require('./api/billing/checkout'));
app.all('/api/billing/portal', require('./api/billing/portal'));
app.all('/api/billing/webhook', require('./api/billing/webhook'));

// ─── Analytics ────────────────────────────────────────────────────────────────
app.all('/api/analytics/dashboard', require('./api/analytics/dashboard'));

const http = require('http');
const PORT = 3001;
const server = http.createServer(app);
server.listen(PORT, () => {
  console.log(`[API] Local dev server running at http://localhost:${PORT} successfully!`);
});
