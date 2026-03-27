/**
 * FreelanceIQ — Extension Popup
 */

function $(id) { return document.getElementById(id); }

const views = ['loading', 'login', 'auth'];
function showView(name) {
  views.forEach((v) => {
    $(`view-${v}`)?.classList.toggle('active', v === name);
  });
}

// ─── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  showView('loading');

  const auth = await chrome.runtime.sendMessage({ type: 'GET_AUTH' });

  if (auth?.token && auth?.user) {
    renderAuth(auth.user);
  } else {
    showView('login');
  }

  // Load auto-open setting
  chrome.storage.local.get(['fiq_auto_open'], (result) => {
    const autoOpen = result.fiq_auto_open !== false;
    const toggle = $('auto-open-toggle');
    if (autoOpen) toggle.classList.add('on');
  });
}

// ─── Auth view ────────────────────────────────────────────────────────────────

function renderAuth(user) {
  const initials = (user.name || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  $('user-avatar').textContent = initials;
  $('user-name').textContent = user.name || '—';
  $('user-email').textContent = user.email || '—';

  const tier = user.subscription?.tier || 'free';
  const tierEl = $('user-tier');
  tierEl.textContent = tier;
  tierEl.className = `tier-badge tier-${tier}`;

  // Usage stats
  const used = user.usage?.analyses_this_month ?? 0;
  const totalEver = user.usage?.total_analyses ?? 0;
  $('stat-used').textContent = used;
  $('stat-total').textContent = totalEver;

  if (tier === 'free') {
    const limit = 5;
    const remaining = Math.max(0, limit - used);
    $('stat-remaining').textContent = remaining;

    const pct = Math.min(Math.round((used / limit) * 100), 100);
    $('usage-bar-section').style.display = 'block';
    $('usage-label-text').textContent = `${used} / ${limit} analyses`;
    $('usage-label-pct').textContent = `${pct}%`;
    $('usage-bar').style.width = `${pct}%`;
    if (pct >= 80) $('usage-bar').classList.add('near');
  } else {
    $('stat-remaining').textContent = '∞';
  }

  showView('auth');
}

// ─── Login ────────────────────────────────────────────────────────────────────

$('login-btn').addEventListener('click', async () => {
  const email = $('email').value.trim();
  const password = $('password').value;
  const errEl = $('login-error');
  errEl.classList.remove('visible');

  if (!email || !password) {
    errEl.textContent = 'Please enter your email and password.';
    errEl.classList.add('visible');
    return;
  }

  const btn = $('login-btn');
  btn.disabled = true;
  btn.textContent = 'Signing in…';

  const result = await chrome.runtime.sendMessage({
    type: 'LOGIN',
    payload: { email, password },
  });

  btn.disabled = false;
  btn.textContent = 'Sign in';

  if (result.error || result.status >= 400) {
    errEl.textContent = result.data?.error || result.error || 'Login failed.';
    errEl.classList.add('visible');
    return;
  }

  renderAuth(result.data.user);
});

// Toggle password visibility
$('toggle-password').addEventListener('click', () => {
  const input = $('password');
  const icon = $('eye-icon');
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  icon.innerHTML = show
    ? `<path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>`
    : `<path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>`;
});

// Allow Enter key to submit login
$('password').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') $('login-btn').click();
});
$('email').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') $('password').focus();
});

// ─── Logout ───────────────────────────────────────────────────────────────────

$('logout-btn').addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ type: 'LOGOUT' });
  $('email').value = '';
  $('password').value = '';
  showView('login');
});

// ─── Auto-open toggle ─────────────────────────────────────────────────────────

$('auto-open-toggle').addEventListener('click', () => {
  const toggle = $('auto-open-toggle');
  const isOn = toggle.classList.toggle('on');
  chrome.storage.local.set({ fiq_auto_open: isOn });
});

// ─── Re-sync when extension storage changes ───────────────────────────────────
// Handles case where user logs in on the web app while popup is already open.

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;

  // Sync auto-open toggle if changed by content.js or settings page
  if (changes.fiq_auto_open) {
    const toggle = $('auto-open-toggle');
    const isOn = changes.fiq_auto_open.newValue !== false;
    toggle.classList.toggle('on', isOn);
  }

  if (!changes.fiq_token && !changes.fiq_user) return;

  // Re-read auth and update popup view
  chrome.runtime.sendMessage({ type: 'GET_AUTH' }).then((auth) => {
    if (auth?.token && auth?.user) {
      renderAuth(auth.user);
    } else {
      showView('login');
    }
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────

init();
