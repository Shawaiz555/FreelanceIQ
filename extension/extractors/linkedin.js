/**
 * LinkedIn Job Extractor (reference — logic is inlined in content.js)
 *
 * Reads job title, description, requirements, and metadata from LinkedIn job
 * detail panels. LinkedIn renders jobs in a right-hand panel on /jobs/* URLs,
 * feed pages, search pages, and company pages — detection uses DOM presence,
 * not URL pattern alone.
 */

export function linkedInJobContainer() {
  const candidates = [
    document.querySelector('.job-view-layout'),
    document.querySelector('.jobs-search__job-details--wrapper'),
    document.querySelector('.jobs-details'),
    document.querySelector('.scaffold-layout__detail'),
  ];
  for (const el of candidates) {
    if (el && el.offsetParent !== null) return el;
  }
  return null;
}

export function isLinkedInJobPage() {
  const { href, pathname } = window.location;
  if (!href.includes('linkedin.com')) return false;
  if (
    pathname.startsWith('/jobs/view/') ||
    pathname.startsWith('/jobs/collections/') ||
    pathname.startsWith('/jobs/search/') ||
    pathname.startsWith('/jobs/recommended/')
  ) return true;
  return linkedInJobContainer() !== null;
}

export function extractLinkedInJob() {
  const url = window.location.href;
  const root = linkedInJobContainer() || document;

  // ── Title ──────────────────────────────────────────────────────────────────
  // Scope to root — never use bare `document h1` (grabs "0 notifications" nav).
  const titleSelectors = [
    '.job-details-jobs-unified-top-card__job-title h1',
    '.jobs-unified-top-card__job-title h1',
    '.jobs-unified-top-card__job-title',
    '[data-test-job-title]',
    'h1.jobs-unified-top-card__title',
    '.job-details-jobs-unified-top-card__job-title',
    'h1.t-24',
    '.t-24.t-bold.inline',
  ];

  let title = '';
  for (const sel of titleSelectors) {
    const el = root.querySelector(sel);
    if (el) {
      const t = el.textContent.trim();
      if (t.length > 3 && !/^\d+$/.test(t)) { title = t; break; }
    }
  }
  if (!title && root !== document) {
    const h1 = root.querySelector('h1');
    if (h1) {
      const t = h1.textContent.trim();
      if (t.length > 3 && !/^\d+$/.test(t)) title = t;
    }
  }

  // ── Company ────────────────────────────────────────────────────────────────
  const companyEl =
    root.querySelector('.job-details-jobs-unified-top-card__company-name a') ||
    root.querySelector('.jobs-unified-top-card__company-name a') ||
    root.querySelector('[data-test-employer-name]') ||
    root.querySelector('.jobs-unified-top-card__subtitle-primary-grouping a') ||
    root.querySelector('.job-details-jobs-unified-top-card__company-name') ||
    root.querySelector('.jobs-unified-top-card__company-name');

  const company = companyEl ? companyEl.textContent.trim() : '';

  // ── Location ───────────────────────────────────────────────────────────────
  const locationEl =
    root.querySelector('.job-details-jobs-unified-top-card__bullet') ||
    root.querySelector('.jobs-unified-top-card__bullet') ||
    root.querySelector('[data-test-job-location]') ||
    root.querySelector('.jobs-unified-top-card__subtitle-primary-grouping .t-black--light');

  const location = locationEl ? locationEl.textContent.trim() : '';

  // ── Workplace type (Remote / Hybrid / On-site) ────────────────────────────
  const workplaceEl =
    root.querySelector('.job-details-jobs-unified-top-card__workplace-type') ||
    root.querySelector('.jobs-unified-top-card__workplace-type') ||
    root.querySelector('.jobs-unified-top-card__workplace-type-badge');

  const workplace_type = workplaceEl ? workplaceEl.textContent.trim() : '';

  // ── Description ────────────────────────────────────────────────────────────
  const descEl =
    root.querySelector('.jobs-description__content .jobs-box__html-content') ||
    root.querySelector('.jobs-description-content__text') ||
    root.querySelector('#job-details') ||
    root.querySelector('.jobs-description__content') ||
    root.querySelector('.jobs-description') ||
    root.querySelector('.job-details-about-the-job-module__description') ||
    root.querySelector('[data-test-job-description]') ||
    root.querySelector('.jobs-details__main-content') ||
    root.querySelector('.jobs-box__html-content');

  const description = descEl ? (descEl.innerText || descEl.textContent || '').trim() : '';

  // ── Skills ─────────────────────────────────────────────────────────────────
  const skillEls = root.querySelectorAll(
    '.job-details-skill-match-status-list__skill-name, ' +
    '.jobs-ppc-criteria__skill, ' +
    '[data-test-skill-name], ' +
    '.job-details-how-you-match__skills-item-subtitle'
  );

  const skills = [...skillEls]
    .map((el) => el.textContent.trim())
    .filter((t) => t.length > 0 && t.length < 60)
    .slice(0, 10);

  // ── Seniority / employment type ────────────────────────────────────────────
  const criteriaItems = root.querySelectorAll(
    '.description__job-criteria-item, ' +
    '.job-details-jobs-unified-top-card__job-insight'
  );

  let seniority_level = '';
  let employment_type = '';

  criteriaItems.forEach((item) => {
    const label = (item.querySelector('h3') || item.querySelector('[class*="label"]') || {}).textContent || '';
    const value = item.textContent || '';
    const lowerLabel = label.toLowerCase();
    if (lowerLabel.includes('seniority')) seniority_level = value.trim();
    if (lowerLabel.includes('employment')) employment_type = value.trim();
  });

  return {
    platform: 'linkedin',
    url,
    title: title || 'LinkedIn Job',
    company,
    location,
    workplace_type,
    seniority_level,
    employment_type,
    description: description || 'No description found.',
    budget_min: 0,
    budget_max: 0,
    skills_required: skills,
    client_hires: 0,
  };
}
