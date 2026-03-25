import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

const client = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // send HttpOnly refresh token cookie
});

// ─── Token refresh logic ──────────────────────────────────────────────────────

let isRefreshing = false;
let refreshQueue = []; // pending requests waiting for new token

function processQueue(token, error = null) {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  refreshQueue = [];
}

// ─── Request interceptor — attach access token ────────────────────────────────

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('fiq_access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Response interceptor — token refresh on 401 + error unwrapping ──────────

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error?.response?.status;

    // Auto-refresh on 401 (skip refresh endpoint itself to avoid loops)
    if (
      status === 401 &&
      !originalRequest._retried &&
      !originalRequest.url?.includes('/auth/refresh') &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/register')
    ) {
      originalRequest._retried = true;

      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return client(originalRequest);
        });
      }

      isRefreshing = true;
      try {
        const { data } = await client.post('/auth/refresh');
        const newToken = data?.data?.token;
        if (!newToken) throw new Error('No token in refresh response');

        localStorage.setItem('fiq_access_token', newToken);
        client.defaults.headers.common.Authorization = `Bearer ${newToken}`;
        processQueue(newToken);

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return client(originalRequest);
      } catch (refreshError) {
        processQueue(null, refreshError);
        // Clear auth — user must log in again
        localStorage.removeItem('fiq_access_token');
        localStorage.removeItem('fiq_user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Unwrap server error messages so catch blocks get a plain Error with .message
    const data = error?.response?.data;
    const serverMessage = data?.error || data?.message;
    if (serverMessage) {
      const err = new Error(serverMessage);
      err.status = error.response.status;
      err.response = error.response;
      return Promise.reject(err);
    }

    return Promise.reject(error);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  async register({ name, email, password }) {
    const { data } = await client.post('/auth/register', { name, email, password });
    return data;
  },

  async login({ email, password }) {
    const { data } = await client.post('/auth/login', { email, password });
    return data;
  },

  async refresh() {
    const { data } = await client.post('/auth/refresh');
    return data;
  },

  async forgotPassword({ email }) {
    const { data } = await client.post('/auth/forgot-password', { email });
    return data;
  },

  async resetPassword({ token, password }) {
    const { data } = await client.post('/auth/reset-password', { token, password });
    return data;
  },
};

// ─── User ─────────────────────────────────────────────────────────────────────

export const userApi = {
  async getProfile() {
    const { data } = await client.get('/user/profile');
    return data;
  },

  async updateProfile(updates) {
    const { data } = await client.patch('/user/profile', updates);
    return data;
  },

  async uploadCV(file) {
    const form = new FormData();
    form.append('cv', file);
    const { data } = await client.post('/user/cv', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  async removeCV() {
    const { data } = await client.delete('/user/cv');
    return data;
  },
};

// ─── Analysis ─────────────────────────────────────────────────────────────────

export const analysisApi = {
  async create(jobData) {
    const { data } = await client.post('/analysis/create', jobData);
    return data;
  },

  async getHistory({ page = 1, limit = 20, sort = 'newest' } = {}) {
    const { data } = await client.get('/analysis/history', {
      params: { page, limit, sort },
    });
    // Normalise: real API returns { data: [...], pagination: {...} }
    // Mirror mock shape: { data: { analyses: [...], total, page, pages, limit } }
    return {
      success: data.success,
      data: {
        analyses: data.data,
        total: data.pagination?.total ?? data.data.length,
        page: data.pagination?.page ?? page,
        pages: data.pagination?.pages ?? 1,
        limit: data.pagination?.limit ?? limit,
      },
    };
  },

  async getById(id) {
    const { data } = await client.get(`/analysis/${id}`);
    return data;
  },

  async updateOutcome(id, outcome) {
    const { data } = await client.patch(`/analysis/${id}`, outcome);
    return data;
  },

  async delete(id) {
    const { data } = await client.delete(`/analysis/${id}`);
    return data;
  },
};

// ─── Proposals ────────────────────────────────────────────────────────────────

export const proposalsApi = {
  async generate({ jobDescription, tone = 'professional' }) {
    const { data } = await client.post('/proposals/generate', { jobDescription, tone });
    return data;
  },

  async regenerate({ analysisId, tone }) {
    const { data } = await client.post('/proposals/generate', { analysisId, tone });
    return data;
  },
};

// ─── Billing ──────────────────────────────────────────────────────────────────

export const billingApi = {
  async getPlans() {
    const { data } = await client.get('/billing/plans');
    return data;
  },

  async createCheckout({ planId }) {
    const { data } = await client.post('/billing/checkout', { planId });
    return data;
  },

  async createPortal() {
    const { data } = await client.post('/billing/portal');
    return data;
  },
};

// ─── Analytics ────────────────────────────────────────────────────────────────

export const analyticsApi = {
  async getDashboard() {
    const { data } = await client.get('/analytics/dashboard');
    return data;
  },
};

export default client;
