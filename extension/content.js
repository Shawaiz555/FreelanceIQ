/**
 * FreelanceIQ — Content Script
 *
 * Injected into Upwork and LinkedIn job pages.
 * Detects the job page, extracts job data, injects the sidebar iframe.
 *
 * NOTE: Content scripts do NOT support ES module imports in MV3.
 * Extractor logic is inlined here instead of imported.
 */

// Guard: if the extension context has been invalidated (e.g. extension was
// reloaded/updated while this tab was open), chrome.runtime becomes undefined.
// Bail out immediately — the user just needs to refresh the tab.
if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.getURL) {
  throw new Error('[FreelanceIQ] Extension context invalidated — please refresh the tab.');
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function _text(selector, fallback) {
  fallback = fallback || '';
  const el = document.querySelector(selector);
  return el ? el.textContent.trim() : fallback;
}

function _textAll(selectors) {
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el && el.textContent.trim()) return el.textContent.trim();
  }
  return '';
}

function _parseNumber(str) {
  if (!str) return 0;
  const n = parseFloat(str.replace(/[^0-9.]/g, ''));
  return isNaN(n) ? 0 : n;
}

function _extractBudget(str) {
  if (!str) return { min: 0, max: 0 };
  const nums = [...str.matchAll(/[\d,]+\.?\d*/g)].map((m) => _parseNumber(m[0]));
  if (nums.length >= 2) return { min: nums[0], max: nums[1] };
  if (nums.length === 1) return { min: nums[0], max: nums[0] };
  return { min: 0, max: 0 };
}

// ─── Upwork extractor ─────────────────────────────────────────────────────────

function isUpworkJobPage() {
  const { href, pathname } = window.location;
  if (!href.includes('upwork.com')) return false;
  return (
    pathname.includes('/jobs/') ||
    pathname.includes('/ab_test/jobs/') ||
    pathname.includes('/nx/find-work/') ||
    pathname.includes('/nx/search/jobs') ||
    pathname.includes('/nx/jobs/') ||
    /~[0-9a-zA-Z_]{10,}/.test(pathname)
  );
}



function extractUpworkJob() {
  const url = window.location.href;
  const pathname = window.location.pathname;

  const isListingPage = (
    pathname.includes('/nx/find-work/') ||
    pathname.includes('/nx/search/jobs')
  );

  // On listing pages (/nx/find-work/): Upwork expands the clicked SECTION.air3-card-section in place.
  // Description, budget, skills all appear inside that same section — _clickedCardEl is the root.
  // On dedicated pages (/jobs/~xxx): use document.
  // If the card root doesn't contain any description, fall back to document-wide search.
  const cardRoot = (isListingPage && _clickedCardEl && document.contains(_clickedCardEl))
    ? _clickedCardEl
    : null;
  const root = cardRoot || document;

  // ── Title ──────────────────────────────────────────────────────────────────
  // On listing pages: panel h1 or job-details-title is the open job
  // On dedicated pages: h1 is always the job title
  // NEVER use job-tile-title-link document-wide (grabs first listing card)
  let title = '';

  // Selectors that exclude client history sections (SECTION.items.air3-card-section)
  const historyExcludes = [
    'section.items',
    '[class*="client-history"]',
    '[class*="ClientHistory"]',
    '[class*="work-history"]',
    '[class*="WorkHistory"]',
    '[data-test="client-history"]',
    '[data-test="work-history"]',
    '[data-test="client-recent-history"]',
  ];

  function notInHistory(el) {
    return historyExcludes.every(function (sel) { return !el.closest(sel); });
  }

  if (root !== document) {
    // Scoped to detail panel
    const titleSelectors = [
      'h3.job-tile-title',
      '[data-test="job-details-title"]',
      '[data-test="job-title"]',
      '[data-cy="job-title"]',
      'h1', 'h2', 'h3',
    ];
    for (const sel of titleSelectors) {
      const el = root.querySelector(sel);
      if (el && el.textContent.trim().length > 3) { title = el.textContent.trim(); break; }
    }
  } else {
    // Document-wide: try specific selectors first, then headings outside history sections
    const specificSelectors = [
      'h3.job-tile-title',
      '[data-test="job-details-title"]',
      '[data-test="job-title"]',
      '[data-cy="job-title"]',
    ];
    for (const sel of specificSelectors) {
      const els = [...document.querySelectorAll(sel)];
      const el = els.find(function (e) { return e.textContent.trim().length > 3 && notInHistory(e); });
      if (el) { title = el.textContent.trim(); break; }
    }
    // Fallback: first h1/h2/h3 not inside a history section
    if (!title) {
      const allH = [...document.querySelectorAll('h1, h2, h3')];
      for (const h of allH) {
        const t = h.textContent.trim();
        if (t.length > 3 && notInHistory(h)) { title = t; break; }
      }
    }
    // Last resort: title captured at card-click time
    if (!title && _clickedCardTitle) title = _clickedCardTitle;
  }

  // ── Description ────────────────────────────────────────────────────────────
  // Confirmed from live DOM: data-test="job-description-text" contains the description.
  // Also data-test="job-description-line-clamp" for the truncated preview version.
  const descSelectors = [
    '[data-test="job-description-text"]',
    '[data-test="job-description-line-clamp"]',
    '[data-cy="job-description"]',
    '[data-test="Description"]',
    '.air3-line-clamp-wrapper',
    '.air3-line-clamp',
    '[class*="description-text"]',
    '.description-text',
  ];

  let description = '';
  // Try card root first, then fall back to document-wide (Upwork may render detail panel outside the card)
  const descRoots = cardRoot ? [cardRoot, document] : [document];
  outer: for (const descRoot of descRoots) {
    for (const sel of descSelectors) {
      const els = descRoot.querySelectorAll(sel);
      if (els.length > 0) {
        const combined = [...els].map((e) => (e.innerText || e.textContent || '').trim()).join('\n').trim();
        if (combined.length > 30) { description = combined; break outer; }
      }
    }
  }
  // Fallback: largest text block inside root by innerText length
  if (!description) {
    let best = '';
    root.querySelectorAll('div, span, p').forEach(function (el) {
      const t = (el.innerText || '').trim();
      if (t.length > best.length && t.length < 5000 && el.children.length < 10) best = t;
    });
    if (best.length > 80) description = best;
  }

  // ── Budget ─────────────────────────────────────────────────────────────────
  // Upwork renders budget in two ways depending on job type:
  //   Hourly:      [data-test="is-hourly"] — children contain low/high rate values
  //   Fixed price: [data-test="is-fixed-price"] — child contains the fixed amount
  // [data-test="budget"] alone returns a single midpoint — not useful for ranges.
  // Strategy: find all $ amounts inside the container and join them as a range.

  let budgetRaw = '';
  const budgetRoots = cardRoot ? [cardRoot, document] : [document];

  function extractBudgetFromContainer(container) {
    if (!container) return '';
    // Collect all leaf text nodes / small elements that contain $ amounts
    const amounts = [];
    container.querySelectorAll('*').forEach(function (el) {
      // Only leaf-ish elements (no further $ children to avoid double-counting)
      if (el.children.length > 0) return;
      const t = (el.innerText || el.textContent || '').trim();
      if (/^\$[\d,]+(\.\d+)?$/.test(t)) amounts.push(t);
    });
    if (amounts.length >= 2) return amounts[0] + '-' + amounts[amounts.length - 1] + '/hr';
    if (amounts.length === 1) return amounts[0];
    // Fallback: full innerText of container, strip newlines
    const full = (container.innerText || container.textContent || '').trim().replace(/\s+/g, ' ');
    return /\$[\d]/.test(full) ? full : '';
  }

  outer2: for (const budRoot of budgetRoots) {
    // Try all known container selectors
    for (const sel of [
      '[data-test="is-hourly"]',
      '[data-test="is-fixed-price"]',
      '[data-test="budget-wrapper"]',
      '[data-cy="budget"]',
    ]) {
      const el = budRoot.querySelector(sel);
      if (el) {
        const t = extractBudgetFromContainer(el);
        if (t) { budgetRaw = t; break outer2; }
      }
    }
    // [data-test="budget"] — may be single value
    const budgetEl = budRoot.querySelector('[data-test="budget"]');
    if (budgetEl) {
      const t = (budgetEl.innerText || budgetEl.textContent || '').trim();
      if (/\$[\d]/.test(t)) { budgetRaw = t; break outer2; }
    }
  }

  // Prefer the budget captured synchronously at card-click time (most reliable for listing pages)
  if (_clickedCardBudget && /[-–]/.test(_clickedCardBudget)) {
    budgetRaw = _clickedCardBudget;
  } else if (!budgetRaw || !/[-–]/.test(budgetRaw.replace(/\s/g, ''))) {
    // Fallback: regex-scan the root's innerText for a range pattern
    const fullText = (root.innerText || root.textContent || '');
    const rangeMatch = fullText.match(/\$[\d,]+(?:\.\d+)?\s*[-–]\s*\$[\d,]+(?:\.\d+)?(?:\/hr)?/i);
    if (rangeMatch) budgetRaw = rangeMatch[0].trim();
    // If still just a single value but we have a card budget, use it
    if (_clickedCardBudget && (!budgetRaw || !/[-–]/.test(budgetRaw))) budgetRaw = _clickedCardBudget;
  }
  const budget = _extractBudget(budgetRaw);

  // ── Skills ─────────────────────────────────────────────────────────────────
  // Confirmed from live DOM: skills are [data-test="attr-item"] inside [data-test="token-container"]
  const skillSelectors = [
    '[data-test="attr-item"]',
    '[data-test="token"] span',
    '[data-test="skills-list"] [data-test="token"]',
    '[data-cy="skill-badge"]',
    '.up-skill-badge',
    '[class*="skill-badge"]',
  ];

  let skills = [];
  const skillRoots = cardRoot ? [cardRoot, document] : [document];
  outer3: for (const skillRoot of skillRoots) {
    for (const sel of skillSelectors) {
      const els = skillRoot.querySelectorAll(sel);
      if (els.length > 0) {
        const found = [...els].map((e) => e.textContent.trim())
          .filter((t) => t.length > 0 && t.length < 50 && !/skip|previous|next/i.test(t));
        if (found.length > 0) { skills = found.slice(0, 10); break outer3; }
      }
    }
  }

  // ── Client hires ───────────────────────────────────────────────────────────
  const hiresRaw = _textAll([
    '[data-test="client-spendings"]',
    '[data-test="total-hires"] strong',
    '[data-test="client-job-posting-stats"] strong',
    '[data-cy="total-hires"]',
  ]);

  return {
    platform: 'upwork',
    url,
    title: title || 'Upwork Job',
    description: description || 'No description found.',
    budget_min: budget.min,
    budget_max: budget.max || budget.min,
    budget_raw: budgetRaw,
    skills_required: skills,
    client_hires: _parseNumber(hiresRaw),
  };
}

// ─── LinkedIn extractor ───────────────────────────────────────────────────────

/**
 * Returns the best available job detail container on any LinkedIn page.
 * LinkedIn renders jobs in: dedicated /jobs/view/ pages, right-hand detail
 * panels on /jobs/search/, AND embedded feed cards on the home/company pages.
 * We check all known container patterns, returning the first visible one.
 */
function _linkedInJobContainer() {
  // Return the tightest visible job detail panel — used only to SCOPE queries,
  // so it must NOT be a broad page wrapper (e.g. .top-card-layout wraps the
  // entire /jobs/view/ page and makes h1/h2 fallback unreliable).
  var selectors = [
    // /jobs/view/ — tight title+company card only (NOT the whole page wrapper)
    '.top-card-layout__entity-info',
    // /jobs/view/ older class
    '.job-view-layout',
    // Split-panel layouts (search / collections / top-applicant / easy-apply)
    '.jobs-search__job-details--wrapper',
    '.jobs-search__job-details',
    '.jobs-details__main-content',
    '.jobs-details',
    '[data-view-name="job-details"]',
    '.job-details-jobs-unified-top-card',
    '.jobs-unified-top-card',
    '.jobs-details-top-card',
    '.artdeco-card.jobs-details',
    '.scaffold-layout__detail',
    '.scaffold-layout__detail-container',
  ];
  for (var i = 0; i < selectors.length; i++) {
    var el = document.querySelector(selectors[i]);
    if (el && el.offsetParent !== null) return el;
  }
  return null;
}

/**
 * Returns true if a candidate title string looks like a real job title
 * rather than a LinkedIn UI artifact (notification counts, nav labels, etc.)
 */
function _isValidJobTitle(t) {
  if (!t || t.length < 3) return false;
  // Reject pure numbers
  if (/^\d+$/.test(t)) return false;
  // Reject LinkedIn notification artifacts: "0 notifications", "2 new notifications", etc.
  if (/\bnotification/i.test(t)) return false;
  // Reject short nav-like strings that appear in LinkedIn's header
  if (/^(home|jobs|messaging|network|me|for business|try premium|post a job)$/i.test(t)) return false;
  // Reject "X new" patterns (notification badges)
  if (/^\d+\s+new$/i.test(t)) return false;
  // Reject LinkedIn Premium upsell / UI section headings on view pages
  if (/^use ai to assess|^how your profile|^about the (job|role|company)|^similar jobs|^people also viewed|^job activity|^meet the (hiring|team)|^company highlights/i.test(t)) return false;
  // Reject job-alert and footer-like prompts
  if (/^set (an? )?alert|^sign in|^sign up|^join now|^dismiss|^see all|^show (more|less)|^apply (on|with)|^easy apply|^save job|^report this/i.test(t)) return false;
  // Reject long strings that are clearly sentences / paragraphs (nav labels are short)
  // Allow up to 120 chars — LinkedIn job titles can be verbose
  if (t.length > 120) return false;
  return true;
}

/**
 * Pages where the sidebar opens but skips extraction — user must paste the job.
 * /jobs/view/ DOM extraction is unreliable (wrong title/description).
 * /jobs/easy-apply/ is an application flow, not a browsable job detail.
 */
function isLinkedInPasteOnlyPage() {
  var pathname = window.location.pathname;
  return pathname.startsWith('/jobs/view/') || pathname.startsWith('/jobs/easy-apply/');
}

/**
 * Pages where the sidebar opens but there is no specific job to extract yet
 * (the user is on the jobs home feed, not viewing any particular listing).
 */
function isLinkedInJobsHomePage() {
  var pathname = window.location.pathname;
  return pathname === '/jobs' || pathname === '/jobs/';
}

function isLinkedInJobPage() {
  var href = window.location.href;
  if (!href.includes('linkedin.com')) return false;
  var pathname = window.location.pathname;
  // All LinkedIn job URL patterns — sidebar opens on all of them.
  // Paste-only pages (view/easy-apply) open the sidebar but skip extraction.
  return (
    pathname === '/jobs' ||
    pathname === '/jobs/' ||
    pathname.startsWith('/jobs/') ||
    _linkedInJobContainer() !== null
  );
}

function extractLinkedInJob() {
  var url = window.location.href;
  var pathname = window.location.pathname;

  // Scope all queries to the job detail container to avoid grabbing
  // nav/notification elements (e.g. "0 notifications" h1).
  // On /jobs/view/ pages there is no split panel so no container class matches —
  // use <main> as the root so we exclude the global nav without needing a specific class.
  var isViewPage = pathname.startsWith('/jobs/view/');
  var root = _linkedInJobContainer() ||
    (isViewPage ? (document.querySelector('main') || document) : document);

  // ── Title ──────────────────────────────────────────────────────────────────
  // IMPORTANT: Never query document-wide for bare h1/h2 — LinkedIn's global nav
  // contains "N notifications" h1 elements that will be grabbed instead.
  // Always scope title search to the confirmed job detail container (root).
  // If root is document (no container found), use specific class selectors only.

  // Ordered from most-specific to least-specific.
  var titleSelectors = [
    // /jobs/view/ dedicated page — confirmed 2024-2025
    'h1.top-card-layout__title',
    '.top-card-layout__entity-info h1',
    '.top-card-layout__title',
    // Unified top-card present on all split-panel layouts (search/collections/top-applicant)
    '.job-details-jobs-unified-top-card__job-title h1',
    '.job-details-jobs-unified-top-card__job-title a',
    '.job-details-jobs-unified-top-card__job-title',
    // Classic search/collections right panel
    '.jobs-unified-top-card__job-title h1',
    '.jobs-unified-top-card__job-title a',
    '.jobs-unified-top-card__job-title',
    // Specific heading classes
    'h1.jobs-unified-top-card__title',
    'h2.jobs-unified-top-card__title',
    // jobs-details top-card title
    '.jobs-details-top-card__job-title',
    // data attribute
    '[data-test-job-title]',
    // Older topcard layout
    'h1.topcard__title',
  ];

  var title = '';
  // 1. Try specific class selectors scoped to root (safest — no nav pollution)
  for (var ti = 0; ti < titleSelectors.length; ti++) {
    var titleEl = root.querySelector(titleSelectors[ti]);
    if (titleEl) {
      var t = titleEl.textContent.trim();
      if (_isValidJobTitle(t)) { title = t; break; }
    }
  }
  // 2. If root didn't have it, try document-wide with specific selectors ONLY
  //    (never fall to bare h1/h2 document-wide)
  if (!title) {
    for (var ti2 = 0; ti2 < titleSelectors.length; ti2++) {
      var titleEl2 = document.querySelector(titleSelectors[ti2]);
      if (titleEl2) {
        var t2 = titleEl2.textContent.trim();
        if (_isValidJobTitle(t2)) { title = t2; break; }
      }
    }
  }
  // 3. Last resort: scan headings inside root.
  //    Prefer h1 over h2 to avoid grabbing lower-page section headings.
  //    root is never raw document on view pages (it's the container or <main>).
  if (!title && root !== document) {
    // First pass: h1 only
    var h1s = root.querySelectorAll('h1');
    for (var hi = 0; hi < h1s.length; hi++) {
      var ht1 = h1s[hi].textContent.trim();
      if (_isValidJobTitle(ht1) && h1s[hi].offsetParent !== null) {
        title = ht1; break;
      }
    }
    // Second pass: h2 only if no valid h1 found AND root is a tight container (not <main>)
    if (!title && root.tagName !== 'MAIN') {
      var h2s = root.querySelectorAll('h2');
      for (var hi2 = 0; hi2 < h2s.length; hi2++) {
        var ht2 = h2s[hi2].textContent.trim();
        if (_isValidJobTitle(ht2) && h2s[hi2].offsetParent !== null) {
          title = ht2; break;
        }
      }
    }
  }

  // ── Company ────────────────────────────────────────────────────────────────
  var companyEl =
    // /jobs/view/ top-card layout
    document.querySelector('.topcard__org-name-link') ||
    document.querySelector('.top-card-layout__card-relation-entity-info a') ||
    document.querySelector('.topcard__flavor a') ||
    root.querySelector('.job-details-jobs-unified-top-card__company-name a') ||
    root.querySelector('.jobs-unified-top-card__company-name a') ||
    root.querySelector('[data-test-employer-name]') ||
    root.querySelector('.jobs-unified-top-card__subtitle-primary-grouping a') ||
    root.querySelector('.job-details-jobs-unified-top-card__company-name') ||
    root.querySelector('.jobs-unified-top-card__company-name');

  var company = companyEl ? companyEl.textContent.trim() : '';

  // ── Location ───────────────────────────────────────────────────────────────
  var locationEl =
    // /jobs/view/ top-card layout
    document.querySelector('.topcard__flavor--bullet') ||
    document.querySelector('.top-card-layout__first-subline span') ||
    root.querySelector('.job-details-jobs-unified-top-card__bullet') ||
    root.querySelector('.jobs-unified-top-card__bullet') ||
    root.querySelector('[data-test-job-location]') ||
    root.querySelector('.jobs-unified-top-card__subtitle-primary-grouping .t-black--light');

  var location = locationEl ? locationEl.textContent.trim() : '';

  // ── Workplace type (Remote / Hybrid / On-site) ────────────────────────────
  var workplaceEl =
    root.querySelector('.job-details-jobs-unified-top-card__workplace-type') ||
    root.querySelector('.jobs-unified-top-card__workplace-type') ||
    root.querySelector('.jobs-unified-top-card__workplace-type-badge');

  var workplace_type = workplaceEl ? workplaceEl.textContent.trim() : '';

  // ── Description ────────────────────────────────────────────────────────────
  // LinkedIn renders the job body inside .show-more-less-html__markup (most reliable,
  // works across /jobs/view/, /jobs/search/, /jobs/collections/ layouts).
  // We try document-wide for these since root may be a narrow container that doesn't
  // include the description pane.
  var descSelectors = [
    // Primary — confirmed working across all layouts (view/search/collections/easy-apply) 2024-2025
    '.show-more-less-html__markup',
    // Dedicated /jobs/view/ page — LinkedIn 2024-2025 class names
    '#job-details',
    '.jobs-description__content--truncated .jobs-description-content__text',
    '.jobs-description__content .jobs-box__html-content',
    '.jobs-description-content__text',
    '.jobs-description__content',
    '.jobs-description',
    '.jobs-description-text',
    // About-the-job module (collections/recommended/view layouts 2024-2025)
    '.job-details-about-the-job-module__description',
    '.job-details-about-the-job-module',
    // topcard description (guest/public /jobs/view/ page)
    '.description__text--rich',
    '.description__text',
    // Generic html content box
    '.jobs-box__html-content',
    '[data-test-job-description]',
    // Artdeco card description text
    '.artdeco-card .description-text',
    '.description-text',
    // Any element with "description" in its id (LinkedIn sometimes uses this)
    '[id*="job-description"]',
    '[id*="jobDescription"]',
    // Section with "about the job" (view page 2025 layout variant)
    'section.description',
    '.description',
  ];

  var descEl = null;
  // Always try document-wide first for description — the pane is often outside `root`
  for (var di = 0; di < descSelectors.length; di++) {
    var candidate = document.querySelector(descSelectors[di]);
    if (candidate && (candidate.innerText || candidate.textContent || '').trim().length > 50) {
      descEl = candidate;
      break;
    }
  }
  // If root is scoped, also try within root as fallback
  if (!descEl && root !== document) {
    for (var di2 = 0; di2 < descSelectors.length; di2++) {
      var candidate2 = root.querySelector(descSelectors[di2]);
      if (candidate2 && (candidate2.innerText || candidate2.textContent || '').trim().length > 50) {
        descEl = candidate2; break;
      }
    }
  }
  // Last resort for view pages: find the largest text block inside <main>
  // that isn't a nav or button area
  if (!descEl && isViewPage) {
    var mainEl = document.querySelector('main');
    if (mainEl) {
      var allDivs = mainEl.querySelectorAll('div, section, article');
      var bestEl = null; var bestLen = 200; // require at least 200 chars
      for (var li = 0; li < allDivs.length; li++) {
        var d = allDivs[li];
        // Skip elements that only contain other block children (containers, not text nodes)
        var directText = (d.innerText || d.textContent || '').trim();
        // Skip navigation-like elements
        if (d.closest('nav, header, footer, [role="navigation"], [role="banner"]')) continue;
        // Only consider leaf-ish elements (fewer than 5 direct block children)
        var blockChildren = d.querySelectorAll(':scope > div, :scope > section, :scope > article, :scope > p');
        if (blockChildren.length > 5) continue;
        if (directText.length > bestLen) { bestLen = directText.length; bestEl = d; }
      }
      if (bestEl) descEl = bestEl;
    }
  }

  var description = descEl ? (descEl.innerText || descEl.textContent || '').trim() : '';
  // Strip leading "About the job" heading that LinkedIn includes in some containers
  description = description.replace(/^about\s+the\s+job[\s\n]*/i, '').trim();

  // ── Skills ─────────────────────────────────────────────────────────────────
  var skillEls = root.querySelectorAll(
    '.job-details-skill-match-status-list__skill-name, ' +
    '.jobs-ppc-criteria__skill, ' +
    '[data-test-skill-name], ' +
    '.job-details-how-you-match__skills-item-subtitle'
  );

  var skills = [].slice.call(skillEls)
    .map(function (el) { return el.textContent.trim(); })
    .filter(function (t) { return t.length > 0 && t.length < 60; })
    .slice(0, 10);

  // ── Seniority / employment type ────────────────────────────────────────────
  var seniority_level = '';
  var employment_type = '';

  var criteriaItems = root.querySelectorAll(
    '.description__job-criteria-item, ' +
    '.job-details-jobs-unified-top-card__job-insight'
  );

  [].forEach.call(criteriaItems, function (item) {
    var labelEl = item.querySelector('h3') || item.querySelector('[class*="label"]');
    var label = labelEl ? labelEl.textContent : '';
    var value = item.textContent || '';
    var lowerLabel = label.toLowerCase();
    if (lowerLabel.indexOf('seniority') !== -1) seniority_level = value.trim();
    if (lowerLabel.indexOf('employment') !== -1) employment_type = value.trim();
  });

  return {
    platform: 'linkedin',
    url: url,
    title: title || 'LinkedIn Job',
    company: company,
    location: location,
    workplace_type: workplace_type,
    seniority_level: seniority_level,
    employment_type: employment_type,
    description: description || 'No description found.',
    budget_min: 0,
    budget_max: 0,
    skills_required: skills,
    client_hires: 0,
  };
}

// ─── State ────────────────────────────────────────────────────────────────────

var sidebarFrame = null;
var toggleBtn = null;
var sidebarOpen = false;
var sidebarFrameLoaded = false; // true once the sidebar iframe fires its load event
var currentUrl = location.href;
var _autoOpenEnabled = true; // cached fiq_auto_open setting — read once at startup

// Keep _autoOpenEnabled in sync whenever any context (popup, web app) changes storage
chrome.storage.onChanged.addListener(function (changes, area) {
  if (area === 'local' && 'fiq_auto_open' in changes) {
    _autoOpenEnabled = changes.fiq_auto_open.newValue !== false;
  }
});

// ─── Job extraction with retry ────────────────────────────────────────────────

function detectAndExtract() {
  if (isUpworkJobPage()) return extractUpworkJob();
  if (isLinkedInJobPage()) return extractLinkedInJob();
  return null;
}

/**
 * Debug helper — call window.fiqDebug() from DevTools console on Upwork
 * to see what the DOM contains so we can tune selectors.
 */
window.fiqDebug = function () {
  console.group('[FreelanceIQ] DOM debug — ' + window.location.pathname);

  // All h1/h2 elements and their parent's data-test attribute
  ['h1','h2'].forEach(function (tag) {
    document.querySelectorAll(tag).forEach(function (el, i) {
      var parent = el.parentElement;
      var grandparent = parent && parent.parentElement;
      console.log(tag + '[' + i + ']:', JSON.stringify(el.textContent.trim().slice(0, 100)),
        '\n  parent:', parent ? parent.tagName + '.' + parent.className.slice(0,40) + ' data-test=' + parent.getAttribute('data-test') : '-',
        '\n  grandparent:', grandparent ? grandparent.tagName + ' data-test=' + grandparent.getAttribute('data-test') : '-');
    });
  });

  // All [data-test] attributes that contain "title", "job", "description", "budget", "hourly", "fixed", or "skill"
  document.querySelectorAll('[data-test]').forEach(function (el) {
    var dt = el.getAttribute('data-test') || '';
    if (/title|job|description|budget|hourly|fixed|skill|attr-item/.test(dt.toLowerCase())) {
      console.log('data-test="' + dt + '":', JSON.stringify((el.innerText || el.textContent).trim().slice(0, 80)),
        '| tag:', el.tagName, '| children:', el.children.length, '| visible:', el.offsetParent !== null);
    }
  });

  // Budget regex scan on root innerText
  var rootText = (_clickedCardEl && document.contains(_clickedCardEl)
    ? _clickedCardEl : document.body).innerText || '';
  var rangeMatch = rootText.match(/\$[\d,]+(?:\.\d+)?\s*[-–]\s*\$[\d,]+(?:\.\d+)?(?:\s*\/?\s*hr(?:our)?)?/i);
  console.log('Budget regex match on root text:', rangeMatch ? rangeMatch[0] : 'none found');

  // Clicked card element inspection
  console.log('_clickedCardEl:', _clickedCardEl ? _clickedCardEl.tagName + ' contains=' + document.contains(_clickedCardEl) : 'null');
  if (_clickedCardEl && document.contains(_clickedCardEl)) {
    var cardTests = [..._clickedCardEl.querySelectorAll('[data-test]')].map(function (e) {
      return 'data-test="' + e.getAttribute('data-test') + '": ' + JSON.stringify(e.textContent.trim().slice(0, 60));
    });
    console.log('clicked card [data-test] elements:', cardTests);
    console.log('clicked card h3:', _clickedCardEl.querySelector('h3') ? _clickedCardEl.querySelector('h3').textContent.trim().slice(0,80) : 'none');
  }

  // All article[data-ev-job-uid] cards
  var cards = document.querySelectorAll('article[data-ev-job-uid]');
  console.log('article[data-ev-job-uid] count:', cards.length);
  cards.forEach(function (card, i) {
    var a = card.querySelector('a[href*="/jobs/"]');
    var dt = [...card.querySelectorAll('[data-test]')].map(function (e) { return e.getAttribute('data-test'); }).join(', ');
    console.log('card[' + i + '] first job link:', a ? JSON.stringify(a.textContent.trim().slice(0, 80)) : 'none', '| data-tests:', dt.slice(0,100));
  });

  // Detail panel candidates
  var panelTests = [
    '[data-test="job-details-section"]', '[data-test="JobDetails"]',
    '[data-test="job-detail"]', '[data-cy="job-details"]', '[data-test="job-details"]',
    '.job-details-panel', '[class*="JobDetailsPanel"]', '[class*="JobDetailView"]',
  ];
  panelTests.forEach(function (sel) {
    var el = document.querySelector(sel);
    if (el) console.log('PANEL FOUND:', sel, '| snippet:', el.innerText.trim().slice(0, 80));
    else console.log('panel miss:', sel);
  });

  // Vars state
  console.log('_clickedCardTitle:', JSON.stringify(_clickedCardTitle));
  console.log('_jobCardWasClicked:', _jobCardWasClicked);
  console.log('_awaitingConfirm:', _awaitingConfirm);

  // What our extractor produces
  console.log('extractUpworkJob():', extractUpworkJob());
  console.groupEnd();
};

/**
 * LinkedIn debug — call window.fiqLinkedInDebug() from DevTools on any LinkedIn page.
 * Logs every candidate container and selector so we can tune the extractor.
 */
window.fiqLinkedInDebug = function () {
  console.group('[FreelanceIQ] LinkedIn DOM debug — ' + window.location.href);

  // Container candidates
  var containerSelectors = [
    '.top-card-layout__entity-info',
    '.job-view-layout',
    '.jobs-search__job-details--wrapper',
    '.jobs-details',
    '.job-details-jobs-unified-top-card',
    '.scaffold-layout__detail',
    '[data-job-id]',
  ];
  containerSelectors.forEach(function (sel) {
    var el = document.querySelector(sel);
    console.log('container "' + sel + '":', el ? 'FOUND visible=' + (el.offsetParent !== null) + ' snippet=' + JSON.stringify(el.innerText.trim().slice(0, 60)) : 'NOT FOUND');
  });

  var root = _linkedInJobContainer() || document;
  var mainEl = document.querySelector('main');
  console.log('_linkedInJobContainer():', root === document ? 'document (no container found)' : root.className.slice(0, 80));
  console.log('<main> exists:', !!mainEl, '| isViewPage:', window.location.pathname.startsWith('/jobs/view/'));

  // All h1 elements
  document.querySelectorAll('h1').forEach(function (el, i) {
    console.log('h1[' + i + ']:', JSON.stringify(el.textContent.trim().slice(0, 80)),
      '| class:', el.className.slice(0, 60),
      '| visible:', el.offsetParent !== null,
      '| inside main:', mainEl ? mainEl.contains(el) : 'no main');
  });
  // All h2 elements (first 6)
  var allH2 = document.querySelectorAll('h2');
  for (var h2i = 0; h2i < Math.min(allH2.length, 6); h2i++) {
    console.log('h2[' + h2i + ']:', JSON.stringify(allH2[h2i].textContent.trim().slice(0, 80)),
      '| class:', allH2[h2i].className.slice(0, 60),
      '| visible:', allH2[h2i].offsetParent !== null,
      '| valid:', _isValidJobTitle(allH2[h2i].textContent.trim()));
  }

  // Title selectors — document-wide
  var titleSelectors = [
    'h1.top-card-layout__title',
    '.top-card-layout__entity-info h1',
    '.top-card-layout__title',
    '.job-details-jobs-unified-top-card__job-title h1',
    '.jobs-unified-top-card__job-title h1',
    '.jobs-unified-top-card__job-title',
    '[data-test-job-title]',
    'h1.jobs-unified-top-card__title',
    '.job-details-jobs-unified-top-card__job-title',
    'h1.topcard__title',
  ];
  titleSelectors.forEach(function (sel) {
    var el = document.querySelector(sel);
    console.log('title "' + sel + '":', el ? JSON.stringify(el.textContent.trim().slice(0, 80)) : 'NOT FOUND');
  });

  // Description selectors (checked document-wide)
  var descSelectors = [
    '.show-more-less-html__markup',
    '#job-details',
    '.jobs-description__content--truncated .jobs-description-content__text',
    '.jobs-description-content__text',
    '.jobs-description__content',
    '.jobs-description',
    '.job-details-about-the-job-module__description',
    '.job-details-about-the-job-module',
    '.description__text--rich',
    '.description__text',
    '[data-test-job-description]',
    '.jobs-box__html-content',
    'section.description',
    '.description',
  ];
  descSelectors.forEach(function (sel) {
    var el = document.querySelector(sel);
    console.log('desc "' + sel + '":', el ? ('len=' + (el.innerText || el.textContent || '').trim().length + ' snippet=' + JSON.stringify((el.innerText || el.textContent || '').trim().slice(0, 80))) : 'NOT FOUND');
  });

  // What the extractor currently produces
  console.log('extractLinkedInJob():', extractLinkedInJob());
  console.groupEnd();
};

function extractWithRetry(maxAttempts, delayMs) {
  maxAttempts = maxAttempts || 8;
  delayMs = delayMs || 1200;

  return new Promise(function (resolve) {
    var attempts = 0;

    function attempt() {
      attempts++;
      var job = detectAndExtract();

      if (job && job.title !== 'Upwork Job' && job.title !== 'LinkedIn Job' &&
          job.description && job.description.length > 50) {
        resolve(job);
        return;
      }

      if (attempts >= maxAttempts) {
        resolve(job || null);
        return;
      }

      setTimeout(attempt, delayMs);
    }

    var immediateJob = detectAndExtract();
    if (immediateJob && immediateJob.description && immediateJob.description.length > 50) {
      resolve(immediateJob);
      return;
    }

    setTimeout(attempt, delayMs);
  });
}

// ─── Sidebar iframe ───────────────────────────────────────────────────────────

function createToggleButton() {
  var btn = document.createElement('button');
  btn.id = 'fiq-toggle-btn';
  btn.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fill-rule="evenodd" clip-rule="evenodd"
        d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
        fill="white"/>
    </svg>
    <span id="fiq-btn-label">FreelanceIQ</span>
  `;
  btn.style.cssText = `
    position: fixed;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    z-index: 2147483646;
    background: linear-gradient(135deg, #1e3a8a, #4338ca);
    color: white;
    border: none;
    border-radius: 10px 0 0 10px;
    padding: 10px 14px;
    cursor: pointer;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 13px;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 8px;
    box-shadow: -4px 0 20px rgba(0,0,0,0.25);
    transition: all 0.2s ease;
    writing-mode: horizontal-tb;
  `;

  btn.addEventListener('mouseenter', function () {
    btn.style.paddingRight = '18px';
    btn.style.background = 'linear-gradient(135deg, #1d4ed8, #4f46e5)';
  });
  btn.addEventListener('mouseleave', function () {
    btn.style.paddingRight = '14px';
    btn.style.background = 'linear-gradient(135deg, #1e3a8a, #4338ca)';
  });

  btn.addEventListener('click', toggleSidebar);
  return btn;
}

function createSidebarFrame() {
  var frame = document.createElement('iframe');
  frame.id = 'fiq-sidebar-frame';
  frame.src = chrome.runtime.getURL('sidebar/sidebar.html');
  frame.style.cssText = 'position:fixed;top:0;right:0;width:340px;height:100vh;border:none;' +
    'z-index:2147483645;box-shadow:-8px 0 40px rgba(0,0,0,0.18);' +
    'transform:translateX(100%);transition:transform 0.3s cubic-bezier(0.16,1,0.3,1);' +
    'border-radius:16px 0 0 16px;overflow:hidden;';
  sidebarFrameLoaded = false;
  frame.addEventListener('load', function onFrameLoad() {
    // Guard: ignore if this frame was already replaced by a newer init() call
    if (sidebarFrame !== frame) return;
    sidebarFrameLoaded = true;
    if (_autoOpenEnabled && !sidebarOpen) {
      toggleSidebar();
    }
  });
  return frame;
}

function toggleSidebar() {
  sidebarOpen = !sidebarOpen;

  if (sidebarOpen) {
    sidebarFrame.style.transform = 'translateX(0)';
    toggleBtn.style.right = '340px';
    toggleBtn.style.borderRadius = '10px 0 0 10px';
    var label = document.getElementById('fiq-btn-label');
    if (label) label.textContent = '✕ Close';

    // On LinkedIn, re-trigger confirm/paste whenever sidebar is manually opened
    // (SIDEBAR_READY only fires once on iframe load)
    var isLinkedIn = window.location.href.includes('linkedin.com');
    var isLinkedInJobsPath = isLinkedIn && (
      window.location.pathname === '/jobs' ||
      window.location.pathname === '/jobs/' ||
      window.location.pathname.startsWith('/jobs/')
    );
    if (isLinkedInJobsPath) {
      _awaitingConfirm = false;
      if (isLinkedInPasteOnlyPage()) {
        sendToSidebar({ type: 'SET_STATE', payload: { state: 'paste', platform: window.location.href.includes('linkedin.com') ? 'linkedin' : 'upwork' } });
      } else {
        setTimeout(function () { _showLinkedInConfirm(); }, 300);
      }
    }
  } else {
    sidebarFrame.style.transform = 'translateX(100%)';
    toggleBtn.style.right = '0';
    var label2 = document.getElementById('fiq-btn-label');
    if (label2) label2.textContent = 'FreelanceIQ';
  }
}

// ─── Messaging with sidebar ───────────────────────────────────────────────────

function sendToSidebar(msg) {
  if (!sidebarFrame || !sidebarFrame.contentWindow) return;
  sidebarFrame.contentWindow.postMessage(
    Object.assign({ source: 'fiq-content' }, msg),
    '*'
  );
}

window.addEventListener('message', function (event) {
  if (event.data && event.data.source !== 'fiq-sidebar') return;
  if (!event.data) return;

  if (event.data.type === 'CLOSE_SIDEBAR') {
    sidebarOpen = true;
    toggleSidebar();
  }

  if (event.data.type === 'SIDEBAR_READY') {
    startAnalysis();
  }

  if (event.data.type === 'CONFIRM_ANALYSE') {
    // User clicked "Analyse" on the confirm card — set flag so startAnalysis skips the confirm gate
    _awaitingConfirm = true;
    startAnalysis();
  }
});

// ─── Analysis flow ────────────────────────────────────────────────────────────

/**
 * Returns true if this is a pure listing/search page with NO job detail visible.
 * On /nx/find-work/ pages, a job detail panel can be open — that is NOT a listing page.
 */
function isListingPageWithNoJobOpen() {
  var pathname = window.location.pathname;

  // Dedicated job detail URLs — always a job page
  if (
    pathname.includes('/nx/jobs/') ||
    /~[0-9a-zA-Z_]{10,}/.test(pathname) ||
    pathname.includes('/ab_test/jobs/')
  ) {
    return false;
  }

  // /nx/find-work/ and /nx/search/jobs — could be listing OR detail panel open
  var isFindWorkOrSearch = (
    pathname.includes('/nx/find-work/') ||
    pathname.includes('/nx/search/jobs') ||
    pathname === '/jobs' ||
    pathname === '/jobs/'
  );

  if (!isFindWorkOrSearch) return false;

  // On find-work / search pages: only allow analysis if user explicitly clicked a card.
  // Never auto-detect from DOM because listing page headers also contain h1 / data-test elements.
  return !_jobCardWasClicked;
}

var _awaitingConfirm = false;   // true when sidebar is showing the confirm prompt

/**
 * Show the confirm card with full extracted job preview.
 * Extracts data immediately from the DOM so the user can verify before confirming.
 */
function _showConfirm() {
  _awaitingConfirm = true;

  // If we have a card click, extract immediately (card is expanded in DOM right now)
  if (_clickedCardTitle || _clickedCardEl) {
    var jobPreview = extractUpworkJob();
    // Prefer the synchronously captured title over whatever the extractor found
    if (_clickedCardTitle && jobPreview) jobPreview.title = _clickedCardTitle;
    sendToSidebar({
      type: 'CONFIRM_JOB',
      payload: jobPreview || {
        title: _clickedCardTitle || 'Job detected',
        platform: 'upwork',
        budget_min: 0,
        budget_max: 0,
        description: '',
        skills_required: [],
      },
    });
    return;
  }

  // Dedicated job page — wait for DOM to settle then extract
  setTimeout(function () {
    var jobPreview = extractUpworkJob();
    sendToSidebar({
      type: 'CONFIRM_JOB',
      payload: jobPreview || {
        title: 'Job on this page',
        platform: 'upwork',
        budget_min: 0,
        budget_max: 0,
        description: '',
        skills_required: [],
      },
    });
  }, 500);
}

/**
 * LinkedIn-specific confirm — extracts job from the visible detail panel.
 * Retries up to 15 times (every 1 s) waiting for the description to load.
 * Only one retry loop runs at a time — calling again cancels the previous one.
 */
var _linkedInConfirmTimer = null; // cancellation token for the active retry loop

function _showLinkedInConfirm() {
  // Never run extraction on paste-only pages — bail out immediately.
  if (isLinkedInPasteOnlyPage()) {
    sendToSidebar({ type: 'SET_STATE', payload: { state: 'paste', platform: window.location.href.includes('linkedin.com') ? 'linkedin' : 'upwork' } });
    return;
  }

  _awaitingConfirm = true;

  // Cancel any in-progress retry loop from a previous call
  if (_linkedInConfirmTimer !== null) {
    clearTimeout(_linkedInConfirmTimer);
    _linkedInConfirmTimer = null;
  }

  var attempts = 0;
  var maxAttempts = 15; // 15 × 1 s = 15 s coverage for slow page loads
  var lastSentTitle = '';

  function tryExtract() {
    _linkedInConfirmTimer = null;

    var jobPreview = extractLinkedInJob();
    var title = (jobPreview && jobPreview.title) || '';
    var hasRealTitle = title && title !== 'LinkedIn Job' && title.length > 3;
    var hasDesc = jobPreview && jobPreview.description &&
                  jobPreview.description !== 'No description found.' &&
                  jobPreview.description.length > 50;

    // Send on the first attempt (shows sidebar quickly), whenever we get a
    // better title than before, and when description is finally available.
    var shouldSend = attempts === 0 || hasDesc || attempts >= maxAttempts ||
                     (hasRealTitle && title !== lastSentTitle);

    if (shouldSend) {
      if (title) lastSentTitle = title;
      var confirmPayload = jobPreview || {
        title: 'LinkedIn Job',
        platform: 'linkedin',
        budget_min: 0,
        budget_max: 0,
        description: '',
        skills_required: [],
      };
      // On the /jobs home feed there is no job detail visible — suppress the
      // "refresh the page" guide since it doesn't apply there.
      if (isLinkedInJobsHomePage()) confirmPayload.noGuide = true;
      sendToSidebar({ type: 'CONFIRM_JOB', payload: confirmPayload });
    }

    if (!hasDesc && attempts < maxAttempts) {
      attempts++;
      _linkedInConfirmTimer = setTimeout(tryExtract, 1000);
    }
  }

  tryExtract();
}

/**
 * Entry point called by SIDEBAR_READY.
 * On listing pages, shows the confirm state so user chooses when to analyse.
 * On dedicated job pages, goes straight to the AI pipeline.
 */
async function startAnalysis() {
  var isLinkedIn = window.location.href.includes('linkedin.com');

  // Paste-only pages (view/easy-apply): cancel any running retry loop, go straight to paste form.
  if (isLinkedIn && isLinkedInPasteOnlyPage()) {
    _awaitingConfirm = false;
    if (_linkedInConfirmTimer !== null) {
      clearTimeout(_linkedInConfirmTimer);
      _linkedInConfirmTimer = null;
    }
    sendToSidebar({ type: 'SET_STATE', payload: { state: 'paste', platform: window.location.href.includes('linkedin.com') ? 'linkedin' : 'upwork' } });
    return;
  }

  // LinkedIn: block only when we're NOT on a /jobs/ path AND no container is visible.
  var isLinkedInJobsPath = isLinkedIn && (
    window.location.pathname === '/jobs' ||
    window.location.pathname === '/jobs/' ||
    window.location.pathname.startsWith('/jobs/')
  );
  if (isLinkedIn && !isLinkedInJobsPath && !_linkedInJobContainer()) {
    _awaitingConfirm = false;
    sendToSidebar({
      type: 'SET_STATE',
      payload: {
        state: 'error',
        message: 'Navigate to a LinkedIn Jobs page, then click a job to analyse it.',
      },
    });
    return;
  }

  // Upwork listing/search pages with no job open at all
  if (!isLinkedIn && isListingPageWithNoJobOpen()) {
    _awaitingConfirm = false;
    sendToSidebar({
      type: 'SET_STATE',
      payload: {
        state: 'error',
        message: 'Click on a job post to analyse it with FreelanceIQ.',
      },
    });
    return;
  }

  // Always show confirm before analysis — user must explicitly trigger it.
  if (!_awaitingConfirm) {
    if (isLinkedIn) {
      _showLinkedInConfirm();
    } else {
      _showConfirm();
    }
    return;
  }

  // User confirmed — run the full pipeline
  _awaitingConfirm = false;
  sendToSidebar({ type: 'SET_STATE', payload: { state: 'extracting' } });

  var jobData = await extractWithRetry();

  if (!jobData) {
    sendToSidebar({
      type: 'SET_STATE',
      payload: {
        state: 'error',
        message: "Couldn't extract job data from this page. Try refreshing.",
      },
    });
    return;
  }

  sendToSidebar({ type: 'JOB_EXTRACTED', payload: jobData });
  sendToSidebar({ type: 'SET_STATE', payload: { state: 'analyzing' } });

  var auth = await chrome.runtime.sendMessage({ type: 'GET_AUTH' });
  if (!auth || !auth.token) {
    sendToSidebar({ type: 'SET_STATE', payload: { state: 'unauthenticated' } });
    return;
  }

  var result = await chrome.runtime.sendMessage({
    type: 'API_REQUEST',
    payload: {
      method: 'POST',
      path: '/analysis/create',
      body: jobData,
    },
  });

  if (result.error || result.status >= 400) {
    var errMsg = (result.data && result.data.error) || result.error || 'Analysis failed';
    sendToSidebar({
      type: 'SET_STATE',
      payload: { state: 'error', message: errMsg },
    });
    return;
  }

  sendToSidebar({
    type: 'ANALYSIS_RESULT',
    payload: result.data.data,
  });
  // State is set by sidebar's renderResult / renderMatchResult based on analysis_type
}

// ─── SPA navigation handling ──────────────────────────────────────────────────

/**
 * Extract base path from a URL (strips query string and hash).
 */
function _urlBasePath(url) {
  try {
    var u = new URL(url);
    return u.origin + u.pathname;
  } catch (_) {
    return url.split('?')[0].split('#')[0];
  }
}

function onUrlChange() {
  var newUrl = location.href;
  if (newUrl === currentUrl) return;
  var prevUrl = currentUrl;
  currentUrl = newUrl;

  var isLinkedInNav = newUrl.includes('linkedin.com');

  // ── LinkedIn same-path job switch (currentJobId param change) ────────────
  // On /jobs/collections/ and /jobs/search/, clicking a job only changes the
  // ?currentJobId= query param via replaceState — the base path stays the same.
  // Do NOT tear down and rebuild the sidebar; just refresh the confirm card.
  if (isLinkedInNav && _urlBasePath(newUrl) === _urlBasePath(prevUrl) && sidebarFrame) {
    if (_linkedInConfirmTimer !== null) {
      clearTimeout(_linkedInConfirmTimer);
      _linkedInConfirmTimer = null;
    }
    _awaitingConfirm = false;
    // Small delay for LinkedIn to swap in the new job detail DOM
    setTimeout(function () { _showLinkedInConfirm(); }, 400);
    return;
  }

  // ── Full navigation (different path) — rebuild sidebar ───────────────────
  if (sidebarFrame) {
    sidebarFrame.remove();
    sidebarFrame = null;
  }
  if (toggleBtn) {
    toggleBtn.remove();
    toggleBtn = null;
  }
  sidebarOpen = false;
  sidebarFrameLoaded = false;
  if (_jobPanelObserver) {
    _jobPanelObserver.disconnect();
    _jobPanelObserver = null;
  }
  _lastAnalysedJobTitle = '';
  _jobCardWasClicked = false;
  _awaitingConfirm = false;
  _clickedCardEl = null;
  _clickedCardTitle = '';
  _clickedCardBudget = '';
  if (_linkedInConfirmTimer !== null) {
    clearTimeout(_linkedInConfirmTimer);
    _linkedInConfirmTimer = null;
  }

  // Wait for SPA page to settle before reinitialising.
  if (isLinkedInNav) {
    setTimeout(init, 150);
  } else {
    var attempts = 0;
    var poll = setInterval(function () {
      attempts++;
      if (document.readyState === 'complete' || attempts >= 10) {
        clearInterval(poll);
        init();
      }
    }, 500);
  }
}

/**
 * On /nx/find-work/ listing pages, clicking a job card opens a detail panel
 * WITHOUT a URL change. We detect this two ways:
 * 1. Direct click listener on job card elements (most reliable)
 * 2. MutationObserver as fallback for cards loaded after init
 */
var _jobPanelObserver = null;
var _jobPanelDebounce = null;
var _lastAnalysedJobTitle = '';
var _cardClickListeners = new WeakSet();
var _jobCardWasClicked = false;  // true once user clicks a job card on listing page
var _clickedCardEl = null;       // the article[data-ev-job-uid] element the user clicked
var _clickedCardTitle = '';      // title read synchronously from clicked card at click time
var _clickedCardBudget = '';     // budget range read synchronously from card innerText at click time

function onJobCardClick(event) {
  if (!sidebarFrame) return;
  var card = event.currentTarget;
  _clickedCardEl = card;
  _jobCardWasClicked = true;
  _awaitingConfirm = false;

  // Read the job title RIGHT NOW — Upwork uses H3.job-tile-title (text directly in H3, not in <a>)
  var titleEl = card.querySelector('h3.job-tile-title') ||
    card.querySelector('[data-test="job-tile-title-link"]') ||
    card.querySelector('h2.job-tile-title') ||
    card.querySelector('h3') ||
    card.querySelector('h2');

  _clickedCardTitle = titleEl ? titleEl.textContent.trim() : '';
  console.log('[FreelanceIQ] card clicked, title:', JSON.stringify(_clickedCardTitle));

  // Log budget-related DOM elements inside the clicked card for debugging
  var budgetDebugEls = [...card.querySelectorAll('[data-test]')].filter(function (e) {
    return /budget|hourly|fixed|price/.test(e.getAttribute('data-test') || '');
  });
  console.log('[FreelanceIQ] budget elements in card:', budgetDebugEls.map(function (e) {
    return { 'data-test': e.getAttribute('data-test'), text: (e.innerText || e.textContent).trim().slice(0, 80), children: e.children.length };
  }));
  // Regex-scan the card's visible text for a price range — capture synchronously at click time
  var cardText = card.innerText || '';
  var priceRange = cardText.match(/\$[\d,]+(?:\.\d+)?\s*[-–]\s*\$[\d,]+(?:\.\d+)?(?:\/hr)?/i);
  _clickedCardBudget = priceRange ? priceRange[0].trim() : '';
  console.log('[FreelanceIQ] price range regex in card text:', _clickedCardBudget || 'not found',
    '| card innerText snippet:', JSON.stringify(cardText.slice(0, 200)));

  clearTimeout(_jobPanelDebounce);
  _jobPanelDebounce = setTimeout(function () {
    if (!sidebarOpen) toggleSidebar();
    // Small delay for sidebar iframe to be ready, then show confirm
    setTimeout(function () { _showConfirm(); }, 400);
  }, 150);
}

function attachCardClickListeners() {
  // Confirmed Upwork DOM (2024-2025):
  //   Job tile root:  SECTION.air3-card-section
  //   Job title:      H3.job-tile-title  (text directly in H3, no inner <a>)
  // Also support legacy article[data-ev-job-uid] layout.

  document.querySelectorAll('section.air3-card-section, article[data-ev-job-uid]').forEach(function (card) {
    // Only attach to sections that actually contain a job title heading
    // Skip sections without a job title heading, or inside history/feedback sections
    if (card.tagName === 'SECTION') {
      if (!card.querySelector('h3.job-tile-title, h2.job-tile-title')) return;
      if (card.closest('section.items') || card.closest('[class*="client-history"]')) return;
    }
    if (_cardClickListeners.has(card)) return;
    _cardClickListeners.add(card);
    card.addEventListener('click', onJobCardClick);
  });
}

function watchForJobPanelOpen() {
  if (_jobPanelObserver) return; // already watching

  var pathname = window.location.pathname;
  var isFindWork = pathname.includes('/nx/find-work/') || pathname.includes('/nx/search/jobs');
  var isLinkedIn = window.location.href.includes('linkedin.com');

  if (!isFindWork && !isLinkedIn) return;

  if (isFindWork) {
    attachCardClickListeners();
  }

  // Track last seen job title to detect job card switches on LinkedIn
  var _lastSeenJobTitle = '';
  var _linkedInDebounce = null;

  // Specific class selectors for job title — NEVER use bare h1/h2 document-wide
  // (LinkedIn's nav contains "N notifications" h1 elements that would be grabbed)
  var _liTitleSelectors = [
    // /jobs/view/ dedicated page — confirmed 2024-2025
    'h1.top-card-layout__title',
    '.top-card-layout__entity-info h1',
    '.top-card-layout__title',
    // Unified top-card (split-panel layouts)
    '.job-details-jobs-unified-top-card__job-title h1',
    '.job-details-jobs-unified-top-card__job-title a',
    '.job-details-jobs-unified-top-card__job-title',
    '.jobs-unified-top-card__job-title h1',
    '.jobs-unified-top-card__job-title a',
    '.jobs-unified-top-card__job-title',
    'h1.jobs-unified-top-card__title',
    'h2.jobs-unified-top-card__title',
    '.jobs-details-top-card__job-title',
    '[data-test-job-title]',
    'h1.topcard__title',
  ];

  function _readLinkedInTitle() {
    // Try specific selectors document-wide (they are scoped to job detail classes)
    for (var i = 0; i < _liTitleSelectors.length; i++) {
      var el = document.querySelector(_liTitleSelectors[i]);
      if (el) {
        var t = el.textContent.trim();
        if (_isValidJobTitle(t)) return t;
      }
    }
    // Fallback: h1/h2 inside the job container or <main> (never raw document-wide)
    var container = _linkedInJobContainer() ||
      (window.location.pathname.startsWith('/jobs/view/') ? document.querySelector('main') : null);
    if (container) {
      var headings = container.querySelectorAll('h1, h2');
      for (var hi = 0; hi < headings.length; hi++) {
        var ht = headings[hi].textContent.trim();
        if (_isValidJobTitle(ht) && headings[hi].offsetParent !== null) return ht;
      }
    }
    return '';
  }

  function _openSidebarForLinkedInJob() {
    // Ensure sidebar elements exist (handles first load on /jobs/ home)
    if (!sidebarFrame) {
      sidebarFrame = createSidebarFrame();
      toggleBtn = createToggleButton();
      document.body.appendChild(sidebarFrame);
      document.body.appendChild(toggleBtn);
    }

    _awaitingConfirm = false;

    // toggleSidebar() handles calling _showLinkedInConfirm() when opening on LinkedIn.
    // When sidebar is already open, call it directly.
    function triggerConfirmOrPaste() {
      if (isLinkedInPasteOnlyPage()) {
        if (!sidebarOpen) toggleSidebar();
        sendToSidebar({ type: 'SET_STATE', payload: { state: 'paste', platform: window.location.href.includes('linkedin.com') ? 'linkedin' : 'upwork' } });
        return;
      }
      if (!sidebarOpen) {
        toggleSidebar(); // toggleSidebar calls _showLinkedInConfirm() itself
      } else {
        _awaitingConfirm = false;
        setTimeout(function () { _showLinkedInConfirm(); }, 300);
      }
    }

    chrome.storage.local.get(['fiq_auto_open'], function (result) {
      if (result.fiq_auto_open === false) {
        if (sidebarOpen) {
          _awaitingConfirm = false;
          if (isLinkedInPasteOnlyPage()) {
            sendToSidebar({ type: 'SET_STATE', payload: { state: 'paste', platform: window.location.href.includes('linkedin.com') ? 'linkedin' : 'upwork' } });
          } else {
            setTimeout(function () { _showLinkedInConfirm(); }, 300);
          }
        }
        return;
      }
      // Use sidebarFrameLoaded flag — contentDocument is cross-origin (always null on LinkedIn).
      if (sidebarFrameLoaded) {
        triggerConfirmOrPaste();
      } else {
        sidebarFrame.addEventListener('load', function onLoad() {
          sidebarFrame.removeEventListener('load', onLoad);
          triggerConfirmOrPaste();
        });
      }
    });
  }

  _jobPanelObserver = new MutationObserver(function () {
    if (isFindWork) {
      attachCardClickListeners();
    }

    if (isLinkedIn) {
      // Debounce — LinkedIn fires many mutations per job switch
      clearTimeout(_linkedInDebounce);
      _linkedInDebounce = setTimeout(function () {
        var currentTitle = _readLinkedInTitle();
        // Fall back to container detection if title selectors miss
        if (!currentTitle && _linkedInJobContainer()) currentTitle = '__container__' + Date.now();
        if (!currentTitle || currentTitle === _lastSeenJobTitle) return;
        _lastSeenJobTitle = currentTitle;
        _openSidebarForLinkedInJob();
      }, 500);
    }
  });

  _jobPanelObserver.observe(document.body, { childList: true, subtree: true });

  // Initial job detection poll — catches jobs already rendered when the observer starts.
  // MutationObserver won't fire for DOM that's already present.
  // NOTE: init() handles auto-opening the sidebar on first load.
  //       This poll + observer only handle subsequent job-card switches.
  if (isLinkedIn) {
    var _initPollCount = 0;
    var _initPollMax = 12; // 12 × 500ms = 6 seconds
    var _initPollTimer = setInterval(function () {
      _initPollCount++;

      var currentTitle = _readLinkedInTitle();

      // Accept container-only match if title selectors miss
      if (!currentTitle && _linkedInJobContainer()) {
        currentTitle = '__container_found__';
      }

      // Broad h1 fallback — LinkedIn changes class names frequently
      if (!currentTitle) {
        var allH1s = document.querySelectorAll('h1');
        for (var hi = 0; hi < allH1s.length; hi++) {
          var h1t = allH1s[hi].textContent.trim();
          if (h1t.length > 5 && !/^\d+$/.test(h1t) && !allH1s[hi].closest('nav, header, [role="navigation"]')) {
            currentTitle = h1t;
            break;
          }
        }
      }

      if (currentTitle && currentTitle !== _lastSeenJobTitle) {
        clearInterval(_initPollTimer);
        _lastSeenJobTitle = currentTitle;
        // Sidebar is already open from init() — just refresh the confirm card with job data
        if (sidebarOpen) {
          _awaitingConfirm = false;
          setTimeout(function () { _showLinkedInConfirm(); }, 100);
        } else {
          _openSidebarForLinkedInJob();
        }
      } else if (_initPollCount >= _initPollMax) {
        clearInterval(_initPollTimer);
      }
    }, 500);
  }
}

// ─── SPA navigation hooks ──────────────────────────────────────────────────────
// Upwork: patch pushState/replaceState (Upwork does not overwrite them after inject).
// LinkedIn: LinkedIn's SPA router re-patches history.pushState after document_idle,
//           breaking our patch. Use the Navigation API (Chrome 102+) as the primary
//           hook for LinkedIn, with a URL-polling interval as a universal fallback.

var _pushState = history.pushState.bind(history);
history.pushState = function () {
  _pushState.apply(history, arguments);
  onUrlChange();
};

var _replaceState = history.replaceState.bind(history);
history.replaceState = function () {
  _replaceState.apply(history, arguments);
  onUrlChange();
};

window.addEventListener('popstate', onUrlChange);

// Navigation API — fires for all same-document navigations regardless of who
// calls pushState. Supported in Chrome 102+. Guards against LinkedIn overwriting
// our history.pushState patch.
if (typeof navigation !== 'undefined' && navigation.addEventListener) {
  navigation.addEventListener('navigate', function (e) {
    if (!e.isSameDocument) return; // cross-document navigations are full page loads
    // Let the navigation complete before checking the URL
    setTimeout(onUrlChange, 0);
  });
}

// Polling fallback — catches any URL change we missed (e.g. LinkedIn overwriting
// our pushState patch before the Navigation API became available, or edge cases
// where navigation events don't fire). Runs only on LinkedIn.
(function () {
  if (!location.href.includes('linkedin.com')) return;
  setInterval(function () {
    if (location.href !== currentUrl) {
      onUrlChange();
    }
  }, 500);
})();

// ─── FreelanceIQ app detection ────────────────────────────────────────────────

function isFreelanceIQApp() {
  var host = window.location.hostname;
  var port = window.location.port;
  return host === 'freelance-iq.vercel.app' || (host === 'localhost' && port === '5173');
}

function pingFreelanceIQApp() {
  window.postMessage({ source: 'fiq-extension', type: 'FIQ_EXTENSION_INSTALLED' }, '*');
}

async function handleGetAuth() {
  try {
    var auth = await chrome.runtime.sendMessage({ type: 'GET_AUTH' });
    window.postMessage({
      source: 'fiq-extension',
      type: 'FIQ_AUTH_RESPONSE',
      payload: (auth && auth.token && auth.user) ? { token: auth.token, user: auth.user } : null,
    }, '*');
  } catch (_) {
    // Background service worker not available — report no auth
    window.postMessage({ source: 'fiq-extension', type: 'FIQ_AUTH_RESPONSE', payload: null }, '*');
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────

function isJobPage() {
  return isUpworkJobPage() || isLinkedInJobPage();
}

// ─── FreelanceIQ web app bridge ───────────────────────────────────────────────
// Registered immediately (synchronously) so the message listener is ready
// before the page's useEffect fires FIQ_PING_REQUEST / FIQ_GET_AUTO_OPEN.
if (isFreelanceIQApp()) {
  // Handle messages from background service worker
  chrome.runtime.onMessage.addListener(function (message, _sender, sendResponse) {
    if (message.type === 'FIQ_READ_LOCALSTORAGE_AUTH') {
      try {
        var token = localStorage.getItem('fiq_access_token');
        var userRaw = localStorage.getItem('fiq_user');
        var user = userRaw ? JSON.parse(userRaw) : null;
        sendResponse((token && user) ? { token: token, user: user } : null);
      } catch (_) {
        sendResponse(null);
      }
      return true;
    }
    if (message.type === 'FIQ_PUSH_AUTH' && message.payload) {
      window.postMessage({
        source: 'fiq-extension',
        type: 'FIQ_AUTH_RESPONSE',
        payload: { token: message.payload.token, user: message.payload.user },
      }, '*');
      sendResponse({ ok: true });
      return true;
    }
    if (message.type === 'FIQ_PUSH_LOGOUT') {
      window.postMessage({ source: 'fiq-extension', type: 'FIQ_FORCE_LOGOUT' }, '*');
      sendResponse({ ok: true });
      return true;
    }
  });

  // Respond to postMessages from the page
  window.addEventListener('message', function (e) {
    if (!e.data) return;
    if (e.data.type === 'FIQ_PING_REQUEST') pingFreelanceIQApp();
    if (e.data.type === 'FIQ_GET_AUTH') handleGetAuth();
    if (e.data.type === 'FIQ_SET_AUTH' && e.data.payload) {
      chrome.runtime.sendMessage({ type: 'SET_AUTH', payload: e.data.payload }).catch(function () {});
    }
    if (e.data.type === 'FIQ_LOGOUT') {
      chrome.runtime.sendMessage({ type: 'LOGOUT' }).catch(function () {});
    }
    if (e.data.type === 'FIQ_SET_AUTO_OPEN' && typeof e.data.value === 'boolean') {
      _autoOpenEnabled = e.data.value;
      chrome.storage.local.set({ fiq_auto_open: e.data.value });
    }
    if (e.data.type === 'FIQ_GET_AUTO_OPEN') {
      // Read from storage directly to guarantee accuracy regardless of init timing
      chrome.storage.local.get(['fiq_auto_open'], function (r) {
        _autoOpenEnabled = r.fiq_auto_open !== false;
        window.postMessage({ source: 'fiq-extension', type: 'FIQ_AUTO_OPEN_STATE', value: _autoOpenEnabled }, '*');
      });
    }
  });

  pingFreelanceIQApp();
  // Re-ping on SPA route changes (React Router uses pushState)
  var _origPush = history.pushState.bind(history);
  history.pushState = function () {
    _origPush.apply(history, arguments);
    setTimeout(pingFreelanceIQApp, 50);
  };
  window.addEventListener('popstate', pingFreelanceIQApp);
}

function init() {
  if (isFreelanceIQApp()) return; // all web app logic handled above

  if (!isJobPage()) return;
  if (document.getElementById('fiq-sidebar-frame')) return;

  sidebarFrame = createSidebarFrame();
  toggleBtn = createToggleButton();

  document.body.appendChild(sidebarFrame);
  document.body.appendChild(toggleBtn);

  // Auto-open is handled synchronously inside createSidebarFrame's load listener
  // using the cached _autoOpenEnabled flag (no async storage.get needed here).

  // Watch for job panel opens (Upwork listing pages + LinkedIn job switches)
  watchForJobPanelOpen();
}

// Read the auto-open setting before init() so _autoOpenEnabled is correct
// when createSidebarFrame's load handler fires.
chrome.storage.local.get(['fiq_auto_open'], function (r) {
  _autoOpenEnabled = r.fiq_auto_open !== false;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
});

// ─── Re-injection guard ───────────────────────────────────────────────────────
// LinkedIn (and some SPAs) may replace document.body during hydration, which
// removes the injected sidebar frame and toggle button from the DOM.
// Watch for our elements being removed and re-run init() if that happens.
(function () {
  var _reinjecting = false;
  var _bodyObserver = new MutationObserver(function () {
    if (_reinjecting) return;
    // Only care if our frame has disappeared from the document
    if (sidebarFrame && !document.contains(sidebarFrame)) {
      _reinjecting = true;
      // Reset state so init() runs cleanly
      if (sidebarFrame) { try { sidebarFrame.remove(); } catch (_) {} sidebarFrame = null; }
      if (toggleBtn) { try { toggleBtn.remove(); } catch (_) {} toggleBtn = null; }
      sidebarOpen = false;
      sidebarFrameLoaded = false;
      if (_jobPanelObserver) { _jobPanelObserver.disconnect(); _jobPanelObserver = null; }
      setTimeout(function () { _reinjecting = false; init(); }, 200);
    }
  });
  // Observe <html> for <body> replacement, and <body> for direct-child removals.
  // subtree:false on each keeps mutation volume low while covering both cases.
  _bodyObserver.observe(document.documentElement, { childList: true, subtree: false });
  if (document.body) {
    _bodyObserver.observe(document.body, { childList: true, subtree: false });
  }
})();
