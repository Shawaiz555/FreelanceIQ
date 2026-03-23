/**
 * Freelancer.com Job Extractor
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

export function extractFreelancerJob() {
  const url = window.location.href;

  const title = textAll([
    'h1.PageProjectViewLogout-title',
    'h1[class*="project-title"]',
    '[class*="ProjectTitle"]',
    'h1',
  ]);

  const descEl = document.querySelector([
    '.PageProjectViewLogout-description',
    '[class*="ProjectDescription"]',
    '.project-description p',
    '.description-text',
  ].join(', '));

  const description = descEl ? descEl.innerText.trim() : '';

  const budgetRaw = textAll([
    '[class*="Budget"] .value',
    '.project-budget strong',
    '[class*="budget-value"]',
  ]);
  const budget = extractBudget(budgetRaw);

  const skillEls = document.querySelectorAll([
    '.project-skills a',
    '[class*="Skill"] a',
    '[class*="skill-tag"]',
  ].join(', '));

  const skills = [...skillEls]
    .map((el) => el.textContent.trim())
    .filter(Boolean)
    .slice(0, 10);

  return {
    platform: 'freelancer',
    url,
    title: title || 'Freelancer Project',
    description: description || 'No description found.',
    budget_min: budget.min,
    budget_max: budget.max || budget.min,
    skills_required: skills,
    client_hires: 0,
  };
}

export function isFreelancerJobPage() {
  const { href } = window.location;
  return href.includes('freelancer.com') && href.includes('/projects/');
}
