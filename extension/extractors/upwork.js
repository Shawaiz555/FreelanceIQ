/**
 * Upwork Job Data Extractor
 *
 * Selectors are ordered by reliability (most stable first, most fragile last).
 * Upwork uses a React SPA — DOM may not be fully rendered on first load.
 * content.js calls this after a MutationObserver fires or a delay.
 */

function text(selector, fallback = '') {
  const el = document.querySelector(selector);
  return el ? el.textContent.trim() : fallback;
}

function textAll(selectors) {
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el && el.textContent.trim()) return el.textContent.trim();
  }
  return '';
}

function parseNumber(str) {
  if (!str) return 0;
  const n = parseFloat(str.replace(/[^0-9.]/g, ''));
  return isNaN(n) ? 0 : n;
}

function extractBudget(str) {
  if (!str) return { min: 0, max: 0 };
  const nums = [...str.matchAll(/[\d,]+\.?\d*/g)].map((m) => parseNumber(m[0]));
  if (nums.length >= 2) return { min: nums[0], max: nums[1] };
  if (nums.length === 1) return { min: nums[0], max: nums[0] };
  return { min: 0, max: 0 };
}

export function extractUpworkJob() {
  const url = window.location.href;

  // ── Title ─────────────────────────────────────────────────────────────────
  const title = textAll([
    'h1[data-test="job-details-title"]',
    'h1.job-details-title',
    'h1[class*="Title"]',
    'h1[class*="title"]',
    '[data-test="job-title"]',
    '.job-title h1',
    'h1',
  ]);

  // ── Description ───────────────────────────────────────────────────────────
  const descEl = document.querySelector([
    '[data-test="job-description-text"]',
    '[class*="JobDescription"]',
    '.job-description',
    '[data-cy="job-description"]',
    'section[data-test="Description"] p',
    '.description',
    '[class*="description"]',
  ].join(', '));

  const description = descEl ? descEl.innerText.trim() : '';

  // ── Budget ────────────────────────────────────────────────────────────────
  const budgetRaw = textAll([
    '[data-test="budget"]',
    '[data-cy="budget"]',
    '[class*="Budget"] strong',
    '[class*="budget"] strong',
    '.js-budget',
    '[data-qa="budget"]',
  ]);
  const budget = extractBudget(budgetRaw);

  // Also check for hourly rate range
  if (!budget.min) {
    const hourlyRaw = textAll([
      '[data-test="hourly-rate"]',
      '[class*="HourlyRate"]',
      '[data-cy="hourly-rate"]',
    ]);
    const hourly = extractBudget(hourlyRaw);
    if (hourly.min) {
      budget.min = hourly.min;
      budget.max = hourly.max;
    }
  }

  // ── Skills ────────────────────────────────────────────────────────────────
  const skillEls = document.querySelectorAll([
    '[data-test="skills-list"] [data-test="token"]',
    '[class*="Skills"] [class*="Skill"]',
    '.skills-list .skill',
    '[data-cy="skill-badge"]',
    'button[class*="skill"]',
    '[class*="skill-badge"]',
  ].join(', '));

  const skills = [...skillEls]
    .map((el) => el.textContent.trim())
    .filter(Boolean)
    .slice(0, 10);

  // ── Client hires ──────────────────────────────────────────────────────────
  const hiresRaw = textAll([
    '[data-test="client-job-posting-stats"] strong',
    '[class*="ClientStats"] strong',
    '[data-cy="total-hires"]',
    '[class*="clientStats"]',
  ]);
  const client_hires = parseNumber(hiresRaw);

  // ── Platform detection ────────────────────────────────────────────────────
  const platform = 'upwork';

  return {
    platform,
    url,
    title: title || 'Upwork Job',
    description: description || 'No description found.',
    budget_min: budget.min,
    budget_max: budget.max || budget.min,
    skills_required: skills,
    client_hires,
  };
}

/**
 * Returns true if this page is an Upwork job detail page
 * (not search results or profile pages).
 */
export function isUpworkJobPage() {
  const { href, pathname } = window.location;
  return (
    href.includes('upwork.com') &&
    (pathname.includes('/jobs/') || pathname.match(/~[0-9a-f]{16}/))
  );
}
