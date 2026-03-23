/**
 * Fiverr Job Request / Buyer Request Extractor
 *
 * Fiverr's "find work" / buyer request pages are the relevant pages for freelancers.
 * URL patterns: /find_work/*, /search/gigs*
 */

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

export function extractFiverrJob() {
  const url = window.location.href;

  // ── Title ─────────────────────────────────────────────────────────────────
  const title = textAll([
    'h1.request-title',
    'h1[class*="title"]',
    '[data-testid="request-title"]',
    '.buyer-request h1',
    '.request-card h2',
    'h1',
  ]);

  // ── Description ───────────────────────────────────────────────────────────
  const descEl = document.querySelector([
    '.request-description',
    '[data-testid="request-description"]',
    '[class*="Description"] p',
    '.buyer-request-description',
    '.request-body p',
  ].join(', '));

  const description = descEl ? descEl.innerText.trim() : '';

  // ── Budget ────────────────────────────────────────────────────────────────
  const budgetRaw = textAll([
    '[data-testid="budget"]',
    '.request-budget',
    '[class*="Budget"]',
    '.budget-amount',
    'span[class*="budget"]',
  ]);
  const budget = extractBudget(budgetRaw);

  // ── Skills / Tags ─────────────────────────────────────────────────────────
  const skillEls = document.querySelectorAll([
    '.request-tags span',
    '[data-testid="tag"]',
    '[class*="Tag"] span',
    '.skills-tag',
  ].join(', '));

  const skills = [...skillEls]
    .map((el) => el.textContent.trim())
    .filter(Boolean)
    .slice(0, 10);

  return {
    platform: 'fiverr',
    url,
    title: title || 'Fiverr Request',
    description: description || 'No description found.',
    budget_min: budget.min,
    budget_max: budget.max || budget.min,
    skills_required: skills,
    client_hires: 0,
  };
}

export function isFiverrJobPage() {
  const { href } = window.location;
  return (
    href.includes('fiverr.com') &&
    (href.includes('/find_work') || href.includes('/buyer_orders') || href.includes('/request/'))
  );
}
