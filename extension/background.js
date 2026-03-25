/**
 * FreelanceIQ — Background Service Worker (MV3)
 *
 * Responsibilities:
 * - Store & retrieve JWT access token and user from chrome.storage.local
 * - Handle token refresh using stored refresh token (no HttpOnly cookie needed)
 * - Relay API calls from content script (avoids CORS issues on job pages)
 * - Periodic token refresh alarm to keep the token fresh
 */

const API_BASE = 'https://freelance-iq.vercel.app/api';

// ─── FreelanceIQ app tab helpers ─────────────────────────────────────────────

/**
 * Find an open FreelanceIQ web app tab (localhost:5173 or freelance-iq.vercel.app).
 * Returns the tab or null.
 */
async function getFiqTab() {
  const tabs = await chrome.tabs.query({
    url: ['http://localhost:5173/*', 'https://freelance-iq.vercel.app/*'],
  });
  return tabs.length > 0 ? tabs[0] : null;
}

/**
 * Ask the web app tab's content script to read localStorage auth,
 * save it to chrome.storage.local, and return it.
 */
async function syncAuthFromWebApp() {
  try {
    const tab = await getFiqTab();
    if (!tab) return null;

    const response = await chrome.tabs.sendMessage(tab.id, { type: 'FIQ_READ_LOCALSTORAGE_AUTH' });
    if (response?.token && response?.user) {
      await setAuth({ token: response.token, user: response.user, expiresIn: 900 });
      return { token: response.token, user: response.user };
    }
  } catch (_) {
    // Tab exists but content script not ready — ignore
  }
  return null;
}

/**
 * Push auth to any open FreelanceIQ web app tab so it auto-logs-in
 * when the user authenticates via the extension popup.
 */
async function pushAuthToWebApp(token, user) {
  try {
    const tab = await getFiqTab();
    if (!tab) return;
    await chrome.tabs.sendMessage(tab.id, { type: 'FIQ_PUSH_AUTH', payload: { token, user } });
  } catch (_) {
    // Tab not ready — fine, web app will pull on next load
  }
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

async function getAuth() {
  const result = await chrome.storage.local.get(['fiq_token', 'fiq_refresh_token', 'fiq_user', 'fiq_token_exp']);
  return {
    token: result.fiq_token || null,
    refreshToken: result.fiq_refresh_token || null,
    user: result.fiq_user || null,
    tokenExp: result.fiq_token_exp || null,
  };
}

async function setAuth({ token, refreshToken, user, expiresIn = 900 }) {
  const exp = Date.now() + expiresIn * 1000;
  const data = { fiq_token: token, fiq_token_exp: exp };
  if (user !== undefined) data.fiq_user = user;
  if (refreshToken !== undefined) data.fiq_refresh_token = refreshToken;
  await chrome.storage.local.set(data);
}

async function clearAuth() {
  await chrome.storage.local.remove(['fiq_token', 'fiq_refresh_token', 'fiq_user', 'fiq_token_exp']);
}

// ─── Token refresh ────────────────────────────────────────────────────────────

async function refreshToken() {
  try {
    const { refreshToken: storedRefresh, user } = await getAuth();
    if (!storedRefresh) {
      await clearAuth();
      return null;
    }

    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Send refresh token in body — extension service workers can't use HttpOnly cookies
        'X-Refresh-Token': storedRefresh,
      },
    });

    if (!response.ok) {
      await clearAuth();
      return null;
    }

    const data = await response.json();
    const newToken = data?.data?.token;
    const newRefresh = data?.data?.refreshToken;
    if (!newToken) {
      await clearAuth();
      return null;
    }

    await setAuth({ token: newToken, refreshToken: newRefresh || storedRefresh, user });
    console.log('[FIQ] Token refreshed');
    return newToken;
  } catch (err) {
    console.error('[FIQ] Token refresh failed:', err.message);
    return null;
  }
}

// ─── API relay (called from content script via chrome.runtime.sendMessage) ────

async function apiRequest({ method = 'GET', path, body }) {
  let { token, tokenExp } = await getAuth();

  // Proactively refresh if token expires within 60s
  if (token && tokenExp && Date.now() > tokenExp - 60_000) {
    token = await refreshToken();
  }

  if (!token) {
    return { error: 'Not authenticated', status: 401 };
  }

  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  };

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_BASE}${path}`, options);

    // 401 → try refresh once then retry
    if (response.status === 401) {
      token = await refreshToken();
      if (!token) return { error: 'Session expired — please log in again', status: 401 };

      options.headers.Authorization = `Bearer ${token}`;
      const retry = await fetch(`${API_BASE}${path}`, options);
      const retryData = await retry.json();
      return { data: retryData, status: retry.status };
    }

    const data = await response.json();
    return { data, status: response.status };
  } catch (err) {
    return { error: err.message, status: 0 };
  }
}

// ─── Login ────────────────────────────────────────────────────────────────────

async function login({ email, password }) {
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || 'Login failed', status: response.status };
    }

    const { user, token, refreshToken: rt } = data.data;
    await setAuth({ token, refreshToken: rt, user });
    pushAuthToWebApp(token, user); // fire-and-forget
    return { data: { user, token }, status: 200 };
  } catch (err) {
    return { error: err.message, status: 0 };
  }
}

// ─── Logout ───────────────────────────────────────────────────────────────────

async function logout() {
  await clearAuth();
  return { success: true };
}

// ─── Message handler ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const { type, payload } = message;

  const handle = async () => {
    switch (type) {
      case 'GET_AUTH': {
        const stored = await getAuth();
        if (stored.token && stored.user) return stored;
        // No token in extension storage — try to pull from open web app tab
        const fromApp = await syncAuthFromWebApp();
        if (fromApp) return { token: fromApp.token, user: fromApp.user, refreshToken: null, tokenExp: null };
        return stored; // still empty
      }

      case 'LOGIN':
        return login(payload);

      case 'LOGOUT':
        return logout();

      case 'API_REQUEST':
        return apiRequest(payload);

      case 'SET_AUTH':
        if (payload?.token && payload?.user) {
          await setAuth({ token: payload.token, refreshToken: payload.refreshToken, user: payload.user });
        }
        return { success: true };

      case 'REFRESH_TOKEN':
        return { token: await refreshToken() };

      default:
        return { error: `Unknown message type: ${type}` };
    }
  };

  handle().then(sendResponse);
  return true; // keep channel open for async response
});

// ─── Alarm: refresh token every 12 minutes ────────────────────────────────────

chrome.alarms.create('token-refresh', { periodInMinutes: 12 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== 'token-refresh') return;
  const { token } = await getAuth();
  if (token) await refreshToken();
});

// ─── On install: clear stale auth ────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    clearAuth();
    console.log('[FIQ] Extension installed');
  }
});
