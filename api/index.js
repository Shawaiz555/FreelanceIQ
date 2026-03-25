const express = require('express');

const app = express();

// Webhook must use raw body BEFORE express.json() for HMAC signature verification
app.all('/api/billing/webhook', express.raw({ type: '*/*' }), require('../backend/billing/webhook'));

app.use(express.json());

// ─── Auth ─────────────────────────────────────────────────────────────────────
app.all('/api/auth/register',       require('../backend/auth/register'));
app.all('/api/auth/login',          require('../backend/auth/login'));
app.all('/api/auth/refresh',        require('../backend/auth/refresh'));
app.all('/api/auth/forgot-password',require('../backend/auth/forgot-password'));
app.all('/api/auth/reset-password', require('../backend/auth/reset-password'));

// ─── User ─────────────────────────────────────────────────────────────────────
app.all('/api/user/profile',        require('../backend/user/profile'));

// ─── Analysis ─────────────────────────────────────────────────────────────────
app.all('/api/analysis/create',     require('../backend/analysis/create'));
app.all('/api/analysis/history',    require('../backend/analysis/history'));
app.all('/api/analysis/:id',        require('../backend/analysis/[id]'));

// ─── Proposals ────────────────────────────────────────────────────────────────
app.all('/api/proposals/generate',  require('../backend/proposals/generate'));

// ─── Billing ──────────────────────────────────────────────────────────────────
app.all('/api/billing/plans',       require('../backend/billing/plans'));
app.all('/api/billing/checkout',    require('../backend/billing/checkout'));
app.all('/api/billing/portal',      require('../backend/billing/portal'));

// ─── Analytics ────────────────────────────────────────────────────────────────
app.all('/api/analytics/dashboard', require('../backend/analytics/dashboard'));

module.exports = app;
