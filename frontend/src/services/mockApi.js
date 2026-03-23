/**
 * Mock API Service
 * Mimics all real API responses for frontend development.
 * Every function returns a Promise to match the real Axios-based API.
 * Replace this with real API calls in Week 7 (Integration phase).
 */

// Simulate network latency
const delay = (ms = 600) => new Promise((resolve) => setTimeout(resolve, ms));

// Mock data fixtures
const MOCK_USER = {
  _id: 'user_mock_001',
  name: 'Ahmed Hassan',
  email: 'ahmed@example.com',
  profile: {
    title: 'Full Stack MERN Developer',
    skills: ['React', 'Node.js', 'MongoDB', 'Express', 'TypeScript'],
    hourly_rate_usd: 25,
    experience_years: 4,
    upwork_url: 'https://upwork.com/freelancers/ahmedhassan',
    fiverr_url: '',
    bio: 'Experienced MERN stack developer specializing in SaaS products and API integrations.',
  },
  subscription: {
    tier: 'free',
    stripe_customer_id: null,
    stripe_subscription_id: null,
    current_period_end: null,
    status: 'active',
  },
  usage: {
    analyses_this_month: 2,
    total_analyses: 14,
    reset_date: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString(),
  },
  settings: {
    email_digest: true,
    extension_auto_open: true,
    language: 'en',
  },
  created_at: '2024-11-15T10:00:00.000Z',
  updated_at: new Date().toISOString(),
};

const MOCK_ANALYSES = [
  {
    _id: 'analysis_001',
    user_id: 'user_mock_001',
    job: {
      platform: 'upwork',
      url: 'https://www.upwork.com/jobs/~01abc123',
      title: 'Build a SaaS dashboard with React and Node.js',
      description:
        'Looking for an experienced MERN stack developer to build a full-featured analytics dashboard. The project includes user auth, charts, data tables, and Stripe billing integration.',
      budget_min: 500,
      budget_max: 1500,
      skills_required: ['React', 'Node.js', 'MongoDB', 'Stripe'],
      client_hires: 12,
    },
    result: {
      bid_score: 82,
      score_reasoning:
        'Strong match for your skill set. Client has excellent hire history (12 hires). Budget is within your range. Main risk: 35+ proposals already submitted.',
      bid_min: 850,
      bid_max: 1200,
      win_probability: 'High',
      red_flags: ['Competitive — many proposals received', 'No hourly rate specified'],
      green_flags: [
        'Client has hired 12 times before',
        'Budget matches your rate',
        'All your core skills required',
        'Clear project scope',
      ],
      category: 'Web Development',
      competition_level: 'Medium',
    },
    proposal: {
      cover_letter:
        "Hi, I've built 3 similar SaaS dashboards in the past 18 months, including a real-time analytics platform for a logistics company that handles 50k daily events. I notice you need Stripe billing — I integrated Stripe Subscriptions with webhook handling in my last two projects.\n\nI'd deliver this in 3 milestones: auth + layout (Week 1), charts + data tables (Week 2), Stripe billing + testing (Week 3). My bid is $1,050.\n\nCan we do a quick 15-min call this week?",
      tone_detected: 'professional',
      template_used: 'saas_developer',
      word_count: 89,
    },
    outcome: {
      did_bid: true,
      did_win: true,
      actual_bid_amount: 1050,
    },
    ai_tokens_used: 1840,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    _id: 'analysis_002',
    user_id: 'user_mock_001',
    job: {
      platform: 'upwork',
      url: 'https://www.upwork.com/jobs/~02def456',
      title: 'WordPress developer needed for plugin customisation',
      description:
        'Need someone to customise a WooCommerce plugin for a small e-commerce store. Small project, quick turnaround.',
      budget_min: 50,
      budget_max: 150,
      skills_required: ['WordPress', 'WooCommerce', 'PHP'],
      client_hires: 1,
    },
    result: {
      bid_score: 28,
      score_reasoning:
        'Poor fit. Budget is too low ($50–$150) for your hourly rate. WordPress/PHP is not in your core skill set. Client has only hired once with no reviews.',
      bid_min: 50,
      bid_max: 150,
      win_probability: 'Low',
      red_flags: [
        'Budget too low for your rate',
        'Outside your core technology stack',
        'Client has minimal hiring history',
        'Vague project requirements',
      ],
      green_flags: [],
      category: 'WordPress Development',
      competition_level: 'High',
    },
    proposal: {
      cover_letter: '',
      tone_detected: null,
      template_used: null,
      word_count: 0,
    },
    outcome: {
      did_bid: false,
      did_win: null,
      actual_bid_amount: null,
    },
    ai_tokens_used: 980,
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    _id: 'analysis_003',
    user_id: 'user_mock_001',
    job: {
      platform: 'upwork',
      url: 'https://www.upwork.com/jobs/~03ghi789',
      title: 'React Native developer for fitness app MVP',
      description:
        'Building an MVP fitness tracking app with React Native. Features: workout logging, progress charts, push notifications, and social sharing.',
      budget_min: 2000,
      budget_max: 5000,
      skills_required: ['React Native', 'Node.js', 'Firebase'],
      client_hires: 7,
    },
    result: {
      bid_score: 67,
      score_reasoning:
        'Good budget range and client has solid hire history. React Native is adjacent to your React skills but not a core strength. Firebase vs MongoDB may be a learning curve.',
      bid_min: 2500,
      bid_max: 3800,
      win_probability: 'Medium',
      red_flags: [
        'React Native vs React — different skill',
        'Firebase may require learning time',
      ],
      green_flags: [
        'Great budget range',
        'Client hires regularly',
        'Node.js backend in your wheelhouse',
        'MVP scope is well-defined',
      ],
      category: 'Mobile Development',
      competition_level: 'Medium',
    },
    proposal: {
      cover_letter:
        "I've shipped two cross-platform apps using React Native — your fitness app MVP is very achievable in 6 weeks. My Node.js background means I can build the backend API alongside the app (one developer, no coordination overhead).\n\nFor Firebase: I've used it for auth and real-time data on two prior projects. My bid is $3,200 for the full MVP.",
      tone_detected: 'confident',
      template_used: 'mobile_developer',
      word_count: 71,
    },
    outcome: {
      did_bid: true,
      did_win: null,
      actual_bid_amount: 3200,
    },
    ai_tokens_used: 2100,
    created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    _id: 'analysis_004',
    user_id: 'user_mock_001',
    job: {
      platform: 'fiverr',
      url: 'https://www.fiverr.com/requests/12345',
      title: 'Build REST API with Node.js and MongoDB for e-commerce platform',
      description:
        'Need a senior Node.js developer to build a production-ready REST API. Features: product catalogue, cart, orders, payments with Stripe, JWT auth, and admin panel.',
      budget_min: 800,
      budget_max: 1800,
      skills_required: ['Node.js', 'MongoDB', 'Express', 'Stripe', 'JWT'],
      client_hires: 9,
    },
    result: {
      bid_score: 91,
      score_reasoning:
        'Excellent match. All required skills are your core strengths. Client has strong hire history and the budget aligns perfectly with your rate. Low competition on Fiverr for this scope.',
      bid_min: 1100,
      bid_max: 1600,
      win_probability: 'High',
      red_flags: [],
      green_flags: [
        'Perfect skill match — Node.js, MongoDB, Stripe',
        'Client has 9 previous hires with strong reviews',
        'Budget comfortably within your range',
        'Well-scoped project with clear deliverables',
        'Low competition on Fiverr for this stack',
      ],
      category: 'Backend Development',
      competition_level: 'Low',
    },
    proposal: {
      cover_letter:
        "Your project is exactly my wheelhouse — I've built 5 similar e-commerce APIs in the last 2 years, including Stripe subscriptions + webhooks + admin dashboards.\n\nI'll deliver: auth + product API (Week 1), cart + orders (Week 2), Stripe payments + admin (Week 3), testing + docs (Week 4). My bid is $1,300.\n\nI can start Monday — want to see a code sample from a similar project?",
      tone_detected: 'professional',
      template_used: 'backend_developer',
      word_count: 74,
    },
    outcome: {
      did_bid: true,
      did_win: true,
      actual_bid_amount: 1300,
    },
    ai_tokens_used: 1950,
    created_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    _id: 'analysis_005',
    user_id: 'user_mock_001',
    job: {
      platform: 'freelancer',
      url: 'https://www.freelancer.com/projects/123456',
      title: 'Python data scraping script — urgent',
      description:
        'Need a Python developer to write a scraping script for product prices from 3 websites. Must handle pagination and export to CSV. Urgent — 2 day deadline.',
      budget_min: 30,
      budget_max: 80,
      skills_required: ['Python', 'BeautifulSoup', 'Scrapy'],
      client_hires: 2,
    },
    result: {
      bid_score: 19,
      score_reasoning:
        'Very poor fit. Python scraping is outside your JavaScript stack entirely. Budget ($30–$80) is far below your hourly rate. The 2-day deadline adds risk. Skip this one.',
      bid_min: 30,
      bid_max: 80,
      win_probability: 'Low',
      red_flags: [
        'Python/scraping is outside your skill set',
        'Budget ($30–$80) is unprofitable at your rate',
        '2-day deadline — very high pressure',
        'Client has minimal hiring history',
        'Likely to receive 50+ bids from cheaper developers',
      ],
      green_flags: [],
      category: 'Data Engineering',
      competition_level: 'High',
    },
    proposal: {
      cover_letter: '',
      tone_detected: null,
      template_used: null,
      word_count: 0,
    },
    outcome: {
      did_bid: false,
      did_win: null,
      actual_bid_amount: null,
    },
    ai_tokens_used: 870,
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    _id: 'analysis_006',
    user_id: 'user_mock_001',
    job: {
      platform: 'upwork',
      url: 'https://www.upwork.com/jobs/~06jkl012',
      title: 'Next.js developer for B2B SaaS dashboard — long-term contract',
      description:
        'We are a growing B2B startup looking for a senior Next.js developer for a long-term contract. Stack: Next.js 14, TypeScript, PostgreSQL, Prisma, Tailwind CSS. You will be the sole frontend developer.',
      budget_min: 3000,
      budget_max: 6000,
      skills_required: ['Next.js', 'TypeScript', 'PostgreSQL', 'Prisma', 'Tailwind CSS'],
      client_hires: 4,
    },
    result: {
      bid_score: 74,
      score_reasoning:
        'Good opportunity. Budget is excellent and long-term contract means stable income. Next.js is in your React ecosystem. Main gap: PostgreSQL/Prisma vs your MongoDB background — worth mentioning you can adapt.',
      bid_min: 3500,
      bid_max: 5000,
      win_probability: 'Medium',
      red_flags: [
        'PostgreSQL/Prisma vs your MongoDB background',
        'Solo frontend role — higher ownership pressure',
      ],
      green_flags: [
        'Excellent budget range ($3k–$6k)',
        'Long-term contract — stable income',
        'Next.js is in your React ecosystem',
        'TypeScript + Tailwind are your strengths',
        'Small, growing company — likely more autonomy',
      ],
      category: 'Web Development',
      competition_level: 'Medium',
    },
    proposal: {
      cover_letter:
        "Long-term Next.js contracts are exactly what I'm looking for right now. I've shipped 3 SaaS dashboards with Next.js 14 App Router + TypeScript + Tailwind in the past year.\n\nOn PostgreSQL/Prisma: I've worked with Prisma on one project and am comfortable picking up relational schemas — my MongoDB background means data modelling is already familiar.\n\nI'd love to see the existing codebase and discuss the contract structure. My availability is full-time from next Monday.",
      tone_detected: 'professional',
      template_used: 'saas_developer',
      word_count: 95,
    },
    outcome: {
      did_bid: true,
      did_win: false,
      actual_bid_amount: 4200,
    },
    ai_tokens_used: 2240,
    created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    _id: 'analysis_007',
    user_id: 'user_mock_001',
    job: {
      platform: 'upwork',
      url: 'https://www.upwork.com/jobs/~07mno345',
      title: 'Fix critical bug in React app — payment flow broken',
      description:
        'Our checkout flow is broken after a dependency update. Stripe Elements stops working after user navigates between steps. Need someone experienced with React and Stripe to debug and fix urgently.',
      budget_min: 150,
      budget_max: 400,
      skills_required: ['React', 'Stripe', 'Debugging'],
      client_hires: 18,
    },
    result: {
      bid_score: 88,
      score_reasoning:
        'High-value quick win. React + Stripe is your core stack. Client has excellent hire history (18 hires). Urgent bug fix means less competition and higher willingness to pay. Scope is narrow and well-defined.',
      bid_min: 200,
      bid_max: 350,
      win_probability: 'High',
      red_flags: [
        'Fixed-price budget may be tight if root cause is complex',
      ],
      green_flags: [
        'React + Stripe — exact core skills',
        'Client has 18 hires — very trustworthy',
        'Urgency = less competition + faster close',
        'Narrow, well-defined scope',
        'Quick win — frees time for larger contracts',
      ],
      category: 'Web Development',
      competition_level: 'Low',
    },
    proposal: {
      cover_letter:
        "I've debugged this exact pattern before — Stripe Elements re-mounting issues in multi-step React flows are usually caused by remounting the Elements provider on navigation. I can identify the root cause within 30 minutes of accessing the repo.\n\nMy process: (1) reproduce locally, (2) identify root cause, (3) fix + write a regression test. I'll keep you updated every step.\n\nFixed price: $250. I can start in the next hour.",
      tone_detected: 'confident',
      template_used: 'bug_fix',
      word_count: 83,
    },
    outcome: {
      did_bid: true,
      did_win: true,
      actual_bid_amount: 250,
    },
    ai_tokens_used: 1620,
    created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const MOCK_PLANS = [
  {
    id: 'free',
    name: 'Free',
    price_monthly: 0,
    features: [
      '5 analyses per month',
      '1 cover letter per analysis',
      'Bid score (0–100)',
      'AI-suggested bid range',
      'Analysis history (last 10)',
    ],
    limits: { analyses_per_month: 5 },
  },
  {
    id: 'pro',
    name: 'Pro',
    price_monthly: 9,
    popular: true,
    features: [
      'Unlimited bid analyses',
      'Unlimited cover letters',
      'Win probability score',
      'Red & green flag breakdown',
      '10+ niche proposal templates',
      'Profile strength score',
      'Monthly earnings report',
    ],
    limits: { analyses_per_month: null },
  },
  {
    id: 'agency',
    name: 'Agency',
    price_monthly: 29,
    features: [
      'All Pro features',
      'Up to 5 team members',
      'Shared template library',
      'Team analytics dashboard',
      'White-label PDF/DOCX export',
      'API access',
    ],
    limits: { analyses_per_month: null, team_members: 5 },
  },
];

// ─────────────────────────────────────────────
// Auth endpoints
// ─────────────────────────────────────────────

export const authApi = {
  async register({ name, email, password }) {
    await delay(800);
    if (email === 'existing@example.com') {
      throw { response: { data: { error: 'Email already registered' }, status: 409 } };
    }
    const user = { ...MOCK_USER, name, email, _id: `user_${Date.now()}` };
    return {
      success: true,
      data: { user, token: 'mock_access_token_' + Date.now(), refreshToken: 'mock_refresh_token' },
      message: 'Registration successful',
    };
  },

  async login({ email, password }) {
    await delay(700);
    if (password === 'wrong') {
      throw { response: { data: { error: 'Invalid email or password' }, status: 401 } };
    }
    return {
      success: true,
      data: { user: MOCK_USER, token: 'mock_access_token_' + Date.now(), refreshToken: 'mock_refresh_token' },
      message: 'Login successful',
    };
  },

  async forgotPassword({ email }) {
    await delay(600);
    return {
      success: true,
      message: 'Password reset email sent',
    };
  },

  async resetPassword({ token, password }) {
    await delay(600);
    return {
      success: true,
      message: 'Password reset successfully',
    };
  },

  async refresh() {
    await delay(300);
    return {
      success: true,
      data: { token: 'mock_access_token_refreshed_' + Date.now() },
    };
  },
};

// ─────────────────────────────────────────────
// User endpoints
// ─────────────────────────────────────────────

export const userApi = {
  async getProfile() {
    await delay(400);
    return { success: true, data: MOCK_USER };
  },

  async updateProfile(updates) {
    await delay(600);
    const updatedUser = { ...MOCK_USER, ...updates, updated_at: new Date().toISOString() };
    return { success: true, data: updatedUser, message: 'Profile updated' };
  },
};

// ─────────────────────────────────────────────
// Analysis endpoints
// ─────────────────────────────────────────────

export const analysisApi = {
  async create(jobData) {
    await delay(2500); // Simulate AI processing time
    const newAnalysis = {
      ...MOCK_ANALYSES[0],
      _id: `analysis_${Date.now()}`,
      job: { ...MOCK_ANALYSES[0].job, ...jobData },
      created_at: new Date().toISOString(),
    };
    return { success: true, data: newAnalysis };
  },

  async getHistory({ page = 1, limit = 10, sort = '-created_at' } = {}) {
    await delay(500);
    return {
      success: true,
      data: {
        analyses: [...MOCK_ANALYSES].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
        total: MOCK_ANALYSES.length,
        page,
        pages: 1,
        limit,
      },
    };
  },

  async getById(id) {
    await delay(400);
    const analysis = MOCK_ANALYSES.find((a) => a._id === id) || MOCK_ANALYSES[0];
    return { success: true, data: analysis };
  },

  async updateOutcome(id, outcome) {
    await delay(400);
    return { success: true, data: { ...outcome }, message: 'Outcome recorded' };
  },
};

// ─────────────────────────────────────────────
// Proposals endpoints
// ─────────────────────────────────────────────

export const proposalsApi = {
  async generate({ jobDescription, tone = 'professional' }) {
    await delay(2000);
    return {
      success: true,
      data: {
        cover_letter: MOCK_ANALYSES[0].proposal.cover_letter,
        tone_detected: tone,
        word_count: 89,
      },
    };
  },

  async regenerate({ analysisId, tone }) {
    await delay(1800);
    return {
      success: true,
      data: {
        cover_letter:
          "Regenerated proposal with a " +
          tone +
          " tone. I bring 4 years of MERN stack experience and have delivered 20+ SaaS products. Let's discuss your project — I'm confident I can exceed your expectations.",
        tone_detected: tone,
        word_count: 42,
      },
    };
  },
};

// ─────────────────────────────────────────────
// Billing endpoints
// ─────────────────────────────────────────────

export const billingApi = {
  async getPlans() {
    await delay(300);
    return { success: true, data: MOCK_PLANS };
  },

  async createCheckout({ planId }) {
    await delay(700);
    return {
      success: true,
      data: {
        url: 'https://checkout.stripe.com/mock-session?plan=' + planId,
        sessionId: 'cs_mock_' + Date.now(),
      },
    };
  },

  async createPortal() {
    await delay(500);
    return {
      success: true,
      data: { url: 'https://billing.stripe.com/mock-portal' },
    };
  },
};

// ─────────────────────────────────────────────
// Analytics endpoint
// ─────────────────────────────────────────────

export const analyticsApi = {
  async getDashboard() {
    await delay(500);
    return {
      success: true,
      data: {
        analyses_this_week: 3,
        avg_bid_score: Math.round(MOCK_ANALYSES.reduce((s, a) => s + a.result.bid_score, 0) / MOCK_ANALYSES.length),
        win_rate: 0.67,
        total_analyses: MOCK_ANALYSES.length,
        recent_analyses: MOCK_ANALYSES.slice(0, 5),
        score_trend: [68, 71, 65, 74, 72, 78, 82],
      },
    };
  },
};

// Default export — unified mock API object
const mockApi = {
  auth: authApi,
  user: userApi,
  analysis: analysisApi,
  proposals: proposalsApi,
  billing: billingApi,
  analytics: analyticsApi,
};

export default mockApi;
