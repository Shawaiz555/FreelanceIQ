/**
 * FreelanceIQ — Content Script
 *
 * Injected into Upwork and LinkedIn job pages.
 * Detects the job page, extracts job data, injects the sidebar iframe.
 *
 * NOTE: Content scripts do NOT support ES module imports in MV3.
 * Extractor logic is inlined here instead of imported.
 */

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
  var selectors = [
    // Dedicated /jobs/view/ page
    '.job-view-layout',
    // Jobs search / collections right-panel detail pane
    '.jobs-search__job-details--wrapper',
    '.jobs-details__main-content',
    '.jobs-details',
    // Collections / recommended layout
    '.scaffold-layout__detail',
    // Feed/company page promoted job card top card
    '.job-details-jobs-unified-top-card',
    // Generic jobs detail sections
    '[data-view-name="job-details"]',
    '.jobs-unified-top-card',
  ];
  for (var i = 0; i < selectors.length; i++) {
    var el = document.querySelector(selectors[i]);
    if (el && el.offsetParent !== null) return el;
  }
  return null;
}

function isLinkedInJobPage() {
  var href = window.location.href;
  if (!href.includes('linkedin.com')) return false;
  var pathname = window.location.pathname;
  // Sidebar only makes sense on /jobs/* paths or when a job detail panel is visible
  return (
    pathname.startsWith('/jobs/') ||
    _linkedInJobContainer() !== null
  );
}

function extractLinkedInJob() {
  var url = window.location.href;

  // Scope all queries to the job detail container to avoid grabbing
  // nav/notification elements (e.g. "0 notifications" h1).
  var root = _linkedInJobContainer() || document;

  // ── Title ──────────────────────────────────────────────────────────────────
  // Try scoped selectors first — NEVER fall back to bare `document h1`.
  var titleSelectors = [
    '.job-details-jobs-unified-top-card__job-title h1',
    '.jobs-unified-top-card__job-title h1',
    '.jobs-unified-top-card__job-title',
    '[data-test-job-title]',
    'h1.jobs-unified-top-card__title',
    '.job-details-jobs-unified-top-card__job-title',
    'h1.t-24',
    '.t-24.t-bold.inline',
  ];

  var title = '';
  for (var ti = 0; ti < titleSelectors.length; ti++) {
    var titleEl = root.querySelector(titleSelectors[ti]);
    if (titleEl) {
      var t = titleEl.textContent.trim();
      // Reject nav artifacts — short strings or pure numbers
      if (t.length > 3 && !/^\d+$/.test(t)) { title = t; break; }
    }
  }
  // Last resort: find the first visible h1 on the page that isn't a nav artifact
  if (!title) {
    var h1Els = document.querySelectorAll('h1');
    for (var hi = 0; hi < h1Els.length; hi++) {
      var h1t = h1Els[hi].textContent.trim();
      if (h1t.length > 3 && !/^\d+$/.test(h1t) && h1Els[hi].offsetParent !== null) {
        // Skip elements inside nav/header
        if (!h1Els[hi].closest('nav, header')) { title = h1t; break; }
      }
    }
  }

  // ── Company ────────────────────────────────────────────────────────────────
  var companyEl =
    root.querySelector('.job-details-jobs-unified-top-card__company-name a') ||
    root.querySelector('.jobs-unified-top-card__company-name a') ||
    root.querySelector('[data-test-employer-name]') ||
    root.querySelector('.jobs-unified-top-card__subtitle-primary-grouping a') ||
    root.querySelector('.job-details-jobs-unified-top-card__company-name') ||
    root.querySelector('.jobs-unified-top-card__company-name');

  var company = companyEl ? companyEl.textContent.trim() : '';

  // ── Location ───────────────────────────────────────────────────────────────
  var locationEl =
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
    '.show-more-less-html__markup',            // Primary — works on all layouts
    '#job-details',                             // Dedicated /jobs/view/ page
    '.jobs-description__content .jobs-box__html-content',
    '.jobs-description-content__text',
    '.jobs-description__content',
    '.jobs-description',
    '.job-details-about-the-job-module__description',
    '[data-test-job-description]',
    '.jobs-box__html-content',
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
      if (candidate2) { descEl = candidate2; break; }
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
var currentUrl = location.href;

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
  console.log('_linkedInJobContainer():', root === document ? 'document (no container found)' : root.className.slice(0, 60));

  // All h1 elements
  document.querySelectorAll('h1').forEach(function (el, i) {
    console.log('h1[' + i + ']:', JSON.stringify(el.textContent.trim().slice(0, 80)),
      '| class:', el.className.slice(0, 50),
      '| visible:', el.offsetParent !== null,
      '| inside root:', root.contains(el));
  });

  // Title selectors
  var titleSelectors = [
    '.job-details-jobs-unified-top-card__job-title h1',
    '.jobs-unified-top-card__job-title h1',
    '.jobs-unified-top-card__job-title',
    '[data-test-job-title]',
    'h1.jobs-unified-top-card__title',
    '.job-details-jobs-unified-top-card__job-title',
    'h1.t-24',
    '.t-24.t-bold.inline',
  ];
  titleSelectors.forEach(function (sel) {
    var el = root.querySelector(sel);
    console.log('title "' + sel + '":', el ? JSON.stringify(el.textContent.trim().slice(0, 80)) : 'not found');
  });

  // Description selectors (checked document-wide)
  var descSelectors = [
    '.show-more-less-html__markup',
    '#job-details',
    '.jobs-description__content .jobs-box__html-content',
    '.jobs-description-content__text',
    '.jobs-description__content',
    '.jobs-description',
    '.job-details-about-the-job-module__description',
    '[data-test-job-description]',
    '.jobs-box__html-content',
  ];
  descSelectors.forEach(function (sel) {
    var el = document.querySelector(sel);
    console.log('desc "' + sel + '":', el ? JSON.stringify(el.innerText.trim().slice(0, 100)) : 'not found');
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
  frame.style.cssText = `
    position: fixed;
    top: 0;
    right: 0;
    width: 340px;
    height: 100vh;
    border: none;
    z-index: 2147483645;
    box-shadow: -8px 0 40px rgba(0,0,0,0.18);
    transform: translateX(100%);
    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    border-radius: 16px 0 0 16px;
    overflow: hidden;
  `;
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
 * Retries up to 5 times (every 800ms) waiting for the description to load.
 */
function _showLinkedInConfirm() {
  _awaitingConfirm = true;

  var attempts = 0;
  var maxAttempts = 5;

  function tryExtract() {
    var jobPreview = extractLinkedInJob();
    var hasDesc = jobPreview && jobPreview.description &&
                  jobPreview.description !== 'No description found.' &&
                  jobPreview.description.length > 50;

    // Send whatever we have on the first attempt so sidebar shows quickly
    // then update if we get a better description on retry
    if (attempts === 0 || hasDesc || attempts >= maxAttempts) {
      sendToSidebar({
        type: 'CONFIRM_JOB',
        payload: jobPreview || {
          title: 'LinkedIn Job',
          platform: 'linkedin',
          budget_min: 0,
          budget_max: 0,
          description: '',
          skills_required: [],
        },
      });
    }

    if (!hasDesc && attempts < maxAttempts) {
      attempts++;
      setTimeout(tryExtract, 800);
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

  // LinkedIn: block only when we're NOT on a /jobs/ path AND no container is visible.
  // On /jobs/* URLs (collections, search, recommended, view) always proceed to confirm
  // even if the container selector doesn't match — extractLinkedInJob falls back to document.
  var isLinkedInJobsPath = isLinkedIn && window.location.pathname.startsWith('/jobs/');
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

function onUrlChange() {
  var newUrl = location.href;
  if (newUrl === currentUrl) return;
  currentUrl = newUrl;

  if (sidebarFrame) {
    sidebarFrame.remove();
    sidebarFrame = null;
  }
  if (toggleBtn) {
    toggleBtn.remove();
    toggleBtn = null;
  }
  sidebarOpen = false;
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

  // Wait for SPA page to settle before reinitialising
  var attempts = 0;
  var poll = setInterval(function () {
    attempts++;
    if (document.readyState === 'complete' || attempts >= 10) {
      clearInterval(poll);
      init();
    }
  }, 500);
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
  var isLinkedIn = window.location.href.includes('linkedin.com') && pathname.startsWith('/jobs/');

  if (!isFindWork && !isLinkedIn) return;

  if (isFindWork) {
    // Attach to any cards already in the DOM
    attachCardClickListeners();
  }

  // Watch for job detail panel appearing (both Upwork lazy-load and LinkedIn SPA navigation)
  var _lastLinkedInContainer = null;
  _jobPanelObserver = new MutationObserver(function () {
    if (isFindWork) {
      attachCardClickListeners();
    }
    // LinkedIn: detect when job detail panel appears for the first time or changes
    if (isLinkedIn) {
      var container = _linkedInJobContainer();
      if (container && container !== _lastLinkedInContainer) {
        _lastLinkedInContainer = container;
        // New job detail loaded — if sidebar is open, re-trigger confirm
        if (sidebarFrame && sidebarOpen) {
          _awaitingConfirm = false;
          setTimeout(function () { _showLinkedInConfirm(); }, 300);
        }
      }
    }
  });

  _jobPanelObserver.observe(document.body, { childList: true, subtree: true });
}

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
  var auth = await chrome.runtime.sendMessage({ type: 'GET_AUTH' });
  window.postMessage({
    source: 'fiq-extension',
    type: 'FIQ_AUTH_RESPONSE',
    payload: (auth && auth.token && auth.user) ? { token: auth.token, user: auth.user } : null,
  }, '*');
}

// ─── Init ─────────────────────────────────────────────────────────────────────

function isJobPage() {
  return isUpworkJobPage() || isLinkedInJobPage();
}

function init() {
  // On the FreelanceIQ web app — just broadcast presence, no sidebar needed
  if (isFreelanceIQApp()) {
    // Handle messages from background — only registered on the FreelanceIQ app page.
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
        // Extension just logged in — tell the web app page to pick up the auth
        window.postMessage({
          source: 'fiq-extension',
          type: 'FIQ_AUTH_RESPONSE',
          payload: { token: message.payload.token, user: message.payload.user },
        }, '*');
        sendResponse({ ok: true });
        return true;
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
    // Respond to requests from the page
    window.addEventListener('message', function (e) {
      if (!e.data) return;
      if (e.data.type === 'FIQ_PING_REQUEST') pingFreelanceIQApp();
      if (e.data.type === 'FIQ_GET_AUTH') handleGetAuth();
      if (e.data.type === 'FIQ_SET_AUTH' && e.data.payload) {
        chrome.runtime.sendMessage({ type: 'SET_AUTH', payload: e.data.payload });
      }
      if (e.data.type === 'FIQ_LOGOUT') {
        chrome.runtime.sendMessage({ type: 'LOGOUT' });
      }
    });
    return;
  }

  if (!isJobPage()) return;
  if (document.getElementById('fiq-sidebar-frame')) return;

  sidebarFrame = createSidebarFrame();
  toggleBtn = createToggleButton();

  document.body.appendChild(sidebarFrame);
  document.body.appendChild(toggleBtn);

  chrome.storage.local.get(['fiq_auto_open'], function (result) {
    if (result.fiq_auto_open !== false) {
      if (sidebarFrame.contentDocument && sidebarFrame.contentDocument.readyState === 'complete') {
        if (!sidebarOpen) toggleSidebar();
      } else {
        sidebarFrame.addEventListener('load', function () {
          if (!sidebarOpen) toggleSidebar();
        });
      }
    }
  });

  // On /nx/find-work/ pages, watch for job panel opens (no URL change occurs)
  watchForJobPanelOpen();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
