/**
 * FreelanceIQ — Sidebar JavaScript
 * Runs inside the iframe. Communicates with content.js via postMessage.
 */

// ─── State ────────────────────────────────────────────────────────────────────

let currentAnalysis = null;
let currentJobData = null;
let currentTone = 'professional';
let outcomeState = { did_bid: null, did_win: null };

// ─── DOM refs ─────────────────────────────────────────────────────────────────

const states = ['confirm', 'extracting', 'analyzing', 'unauthenticated', 'result', 'result-match', 'error', 'paste'];

function showState(name) {
  states.forEach((s) => {
    const el = document.getElementById(`state-${s}`);
    if (el) el.classList.toggle('active', s === name);
  });
}

function $(id) { return document.getElementById(id); }

// ─── Gauge (SVG port of BidScoreGauge) ───────────────────────────────────────

function buildGaugeSVG(score) {
  const size = 130;
  const strokeWidth = 11;
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;

  const startAngle = 135;
  const totalAngle = 270;
  const circumference = 2 * Math.PI * radius;
  const arcLength = (totalAngle / 360) * circumference;

  const color = score >= 70 ? '#22c55e' : score >= 45 ? '#eab308' : '#ef4444';

  function polar(angleDeg) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  }

  function buildArc(from, to) {
    const start = polar(from);
    const end = polar(to);
    const largeArc = to - from > 180 ? 1 : 0;
    return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
  }

  const trackPath = buildArc(startAngle, startAngle + totalAngle);
  const fillLength = (score / 100) * arcLength;
  const dashOffset = arcLength - fillLength;

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"
         aria-label="Bid score: ${score} out of 100">
      <path d="${trackPath}" fill="none" stroke="#e5e7eb"
            stroke-width="${strokeWidth}" stroke-linecap="round"/>
      <path d="${trackPath}" fill="none" stroke="${color}"
            stroke-width="${strokeWidth}" stroke-linecap="round"
            stroke-dasharray="${arcLength.toFixed(2)}"
            stroke-dashoffset="${dashOffset.toFixed(2)}"
            style="transition: stroke-dashoffset 0.8s ease"/>
      <text x="${cx}" y="${cy - 3}" text-anchor="middle" dominant-baseline="middle"
            font-size="${size * 0.22}" font-weight="800" fill="${color}"
            font-family="inherit">${score}</text>
      <text x="${cx}" y="${cy + size * 0.14}" text-anchor="middle" dominant-baseline="middle"
            font-size="${size * 0.1}" fill="#9ca3af" font-family="inherit">/ 100</text>
    </svg>
    <div class="gauge-label">Bid Score</div>
  `;
}

// ─── Render result ────────────────────────────────────────────────────────────

function buildMetaGrid(items) {
  return items
    .filter(([, v]) => v)
    .map(([label, value]) => `
      <div class="meta-item">
        <div class="meta-item-label">${label}</div>
        <div class="meta-item-value">${value}</div>
      </div>`)
    .join('');
}

const _togglesSetup = new Set();
function setupToggle(toggleId, bodyId) {
  if (_togglesSetup.has(toggleId)) return;
  _togglesSetup.add(toggleId);
  const btn = $(toggleId);
  const body = $(bodyId);
  if (!btn || !body) return;
  btn.addEventListener('click', () => {
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!expanded));
    body.style.display = expanded ? 'none' : 'block';
  });
}

function renderResult(analysis) {
  currentAnalysis = analysis;
  const { job, result, proposal } = analysis;

  // Job card
  $('result-job-title').textContent = job.title;
  $('result-job-meta').textContent = `${job.platform}${job.budget_min ? ` · $${job.budget_min}–$${job.budget_max}` : ''}`;

  const skillsEl = $('result-skills');
  skillsEl.innerHTML = (job.skills_required || [])
    .slice(0, 6)
    .map((s) => `<span class="skill-tag">${s}</span>`)
    .join('');

  // About this job — meta + description
  const aboutCard = $('result-about-card');
  const desc = (job.description || '').replace(/^no description found\.?/i, '').trim();
  if (desc || job.budget_min || job.budget_max || (job.skills_required || []).length) {
    aboutCard.style.display = 'block';
    $('result-meta-grid').innerHTML = buildMetaGrid([
      ['Platform', job.platform],
      ['Budget', job.budget_min ? `$${job.budget_min}–$${job.budget_max}` : ''],
      ['Client hires', job.client_hires > 0 ? String(job.client_hires) : ''],
      ['Skills', (job.skills_required || []).slice(0, 3).join(', ')],
    ]);
    $('result-job-desc').textContent = desc || 'No description available.';
    setupToggle('result-about-toggle', 'result-about-body');
  }

  // Gauge
  $('gauge-container').innerHTML = buildGaugeSVG(result.bid_score);

  // Score reasoning
  $('score-reasoning').textContent = result.score_reasoning || '';

  // Bid range
  $('bid-range').textContent = `$${result.bid_min} – $${result.bid_max}`;

  // Win probability badge
  const wp = result.win_probability || 'Medium';
  $('win-prob-badge').innerHTML = `
    <span class="win-badge win-${wp}">
      <span class="dot"></span>${wp}
    </span>`;

  // Flags
  renderFlags('green-flags', result.green_flags || [], true);
  renderFlags('red-flags', result.red_flags || [], false);

  // Cover letter
  if (proposal?.cover_letter) {
    $('cover-letter-card').style.display = 'block';
    $('cover-letter-textarea').value = proposal.cover_letter;
    updateWordCount(proposal.cover_letter);

    // Set tone buttons
    currentTone = proposal.tone_detected || 'professional';
    renderToneButtons();
  }

  showState('result');
}

function renderFlags(containerId, flags, isGreen) {
  const el = $(containerId);
  if (!flags.length) {
    el.innerHTML = '<li style="font-size:11px;color:#94a3b8;font-style:italic;">None</li>';
    return;
  }
  el.innerHTML = flags.map((f) => `
    <li class="flag-item">
      <span class="flag-icon">${isGreen
        ? '<svg width="13" height="13" viewBox="0 0 20 20" fill="#22c55e"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd"/></svg>'
        : '<svg width="13" height="13" viewBox="0 0 20 20" fill="#ef4444"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd"/></svg>'
      }</span>
      ${f}
    </li>`).join('');
}

function renderToneButtons() {
  const tones = ['professional', 'confident', 'friendly', 'concise'];
  $('tone-row').innerHTML = tones.map((t) => `
    <button class="tone-btn${t === currentTone ? ' active' : ''}" data-tone="${t}">${t}</button>
  `).join('');

  $('tone-row').querySelectorAll('.tone-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentTone = btn.dataset.tone;
      $('tone-row').querySelectorAll('.tone-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}

function updateWordCount(text) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  $('word-count').textContent = `${words} words`;
}

// ─── Render job_match result (LinkedIn) ──────────────────────────────────────

function renderMatchResult(analysis) {
  currentAnalysis = analysis;
  const { job, match_result, proposal } = analysis;

  // Job card
  $('match-job-title').textContent = job.title;
  const metaParts = [job.platform];
  if (job.company) metaParts.push(job.company);
  if (job.location) metaParts.push(job.location);
  if (job.workplace_type) metaParts.push(job.workplace_type);
  $('match-job-meta').textContent = metaParts.join(' · ');

  const matchSkillsEl = $('match-job-skills');
  matchSkillsEl.innerHTML = (job.skills_required || [])
    .slice(0, 6)
    .map((s) => `<span class="skill-tag">${s}</span>`)
    .join('');

  // About this job — meta + description
  const matchAboutCard = $('match-about-card');
  const matchDesc = (job.description || '').replace(/^no description found\.?/i, '').trim();
  if (matchDesc || job.company || job.location) {
    matchAboutCard.style.display = 'block';
    $('match-meta-grid').innerHTML = buildMetaGrid([
      ['Company', job.company || ''],
      ['Location', job.location || ''],
      ['Workplace', job.workplace_type || ''],
      ['Seniority', job.seniority_level || ''],
      ['Employment', job.employment_type || ''],
      ['Skills', (job.skills_required || []).slice(0, 3).join(', ')],
    ]);
    $('match-job-desc').textContent = matchDesc || 'No description available.';
    setupToggle('match-about-toggle', 'match-about-body');
  }

  // Update analyzing spinner label if still showing
  const analyzingTitle = $('analyzing-title');
  const analyzingSub = $('analyzing-sub');
  if (analyzingTitle) analyzingTitle.textContent = 'Matching your CV…';
  if (analyzingSub) analyzingSub.textContent = 'Comparing your profile to the job';

  // Gauge — reuse buildGaugeSVG with match_score
  const matchScore = match_result?.match_score ?? 0;
  $('match-gauge-container').innerHTML = buildGaugeSVG(matchScore).replace('Bid Score', 'Match Score');

  // Score reasoning
  $('match-score-reasoning').textContent = match_result?.score_reasoning || '';

  // Recommended action badge
  const action = match_result?.recommended_action || 'Apply with caveats';
  const actionKey = action.replace(/\s+/g, '-');
  $('match-action-badge').innerHTML = `
    <span class="action-badge action-${actionKey}">
      ${action === 'Apply' ? '✓' : action === 'Skip' ? '✗' : '⚡'} ${action}
    </span>`;

  // No-CV warning — show if no cv_text was used (heuristic: match_score is very generic)
  // We detect this by checking proposal.template_used
  const noCvWarn = $('match-no-cv-warn');
  if (proposal?.template_used === 'job-match' && matchScore < 5) {
    noCvWarn.style.display = '';
  } else {
    noCvWarn.style.display = 'none';
  }

  // Matched skills
  renderMatchSkills('match-matched-skills', match_result?.matched_skills || [], true);
  renderMatchSkills('match-skill-gaps', match_result?.skill_gaps || [], false);

  // Strengths
  renderFlags('match-strengths', match_result?.strengths || [], true);

  // CV guidance card
  const guidance = analysis.cv_guidance;
  if (guidance) {
    $('match-cv-guidance-card').style.display = 'block';
    $('match-cv-guidance-assessment').textContent = guidance.overall_assessment || '';

    // Missing keywords
    const kwAdd = (guidance.keywords_to_add || []).slice(0, 6);
    if (kwAdd.length) {
      $('match-cv-guidance-keywords').innerHTML =
        '<div style="font-size:10px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">Add these keywords</div>' +
        kwAdd.map((k) => `<span style="display:inline-block;font-size:10px;font-weight:500;padding:2px 7px;border-radius:6px;background:#fef2f2;color:#b91c1c;border:1px solid #fee2e2;margin:2px;">${k}</span>`).join('');
    }

    // Top priority changes (first 2)
    const changes = (guidance.priority_changes || []).slice(0, 2);
    if (changes.length) {
      $('match-cv-guidance-changes').innerHTML =
        '<div style="font-size:10px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">Priority fixes</div>' +
        changes.map((c, i) => `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:6px 8px;margin-bottom:5px;font-size:11px;color:#92400e;"><strong>${c.section}:</strong> ${c.action}</div>`).join('');
    }
  }

  showState('result-match');
}

function renderMatchSkills(containerId, skills, isPresent) {
  const el = $(containerId);
  if (!skills.length) {
    el.innerHTML = '<li style="font-size:11px;color:#94a3b8;font-style:italic;">None</li>';
    return;
  }
  el.innerHTML = skills.map((s) => `
    <li class="match-skill-item">
      <span class="flag-icon">${isPresent
        ? '<svg width="13" height="13" viewBox="0 0 20 20" fill="#22c55e"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd"/></svg>'
        : '<svg width="13" height="13" viewBox="0 0 20 20" fill="#f59e0b"><path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/></svg>'
      }</span>
      ${s}
    </li>`).join('');
}

// ─── Message listener (from content.js) ──────────────────────────────────────

// Track the platform of the current page so goToPaste() can auto-select it
var _detectedPlatform = null;

window.addEventListener('message', (event) => {
  // Only accept messages from our extension
  if (event.data?.source !== 'fiq-content') return;
  const { type, payload } = event.data;

  // Capture platform whenever it arrives so manual "Paste" clicks can use it
  if (payload?.platform) _detectedPlatform = payload.platform;

  switch (type) {
    case 'SET_STATE':
      if (payload.state === 'error') {
        const isClickPrompt = payload.message && payload.message.startsWith('Click on a job');
        const errorCard = $('error-card');
        const errorTitle = $('error-title');
        if (isClickPrompt) {
          errorCard.className = 'card info-card';
          errorTitle.className = 'info-title';
          errorTitle.textContent = 'No job selected';
          $('error-msg').className = 'info-msg';
          $('retry-btn').style.display = 'none';
        } else {
          errorCard.className = 'card error-card';
          errorTitle.className = 'error-title';
          errorTitle.textContent = 'Analysis failed';
          $('error-msg').className = 'error-msg';
          $('retry-btn').style.display = '';
        }
        $('error-msg').textContent = payload.message || 'Something went wrong.';
      }
      if (payload.state === 'paste' && payload.platform) {
        const sel = $('paste-platform');
        if (sel) sel.value = payload.platform;
        // Hide the platform selector — auto-detected from URL
        const selWrap = $('paste-platform-wrap');
        if (selWrap) selWrap.style.display = 'none';
      }
      showState(payload.state);
      break;

    case 'CONFIRM_JOB': {
      // Show confirm state with full job preview — user must click Analyse to proceed
      $('confirm-job-title').textContent = payload.title || 'Untitled job';
      $('confirm-platform-badge').textContent = payload.platform || 'upwork';

      // Budget — prefer raw text (preserves "/hr", ranges, etc.) over parsed min/max
      const budgetSection = $('confirm-budget-section');
      const budgetText = payload.budget_raw && /\$/.test(payload.budget_raw)
        ? payload.budget_raw
        : (payload.budget_min || payload.budget_max)
          ? (() => { const lo = payload.budget_min || 0; const hi = payload.budget_max || lo; return lo === hi ? `$${lo}` : `$${lo} – $${hi}`; })()
          : '';
      if (budgetText) {
        $('confirm-budget').textContent = budgetText;
        budgetSection.style.display = '';
      } else {
        budgetSection.style.display = 'none';
      }

      // Description
      const descEl = $('confirm-desc');
      const desc = (payload.description || '').trim();
      const hasDesc = desc && desc !== 'No description found.' && desc.length > 30;
      if (hasDesc) {
        descEl.textContent = desc;
        descEl.classList.remove('no-desc');
      } else {
        descEl.textContent = 'No description visible yet — it may load after you click.';
        descEl.classList.add('no-desc');
      }
      // Show/hide the "description not loaded" guide
      // Suppress on pages where no job is expected (e.g. /jobs home feed)
      const guideEl = $('confirm-no-desc-guide');
      if (guideEl) guideEl.style.display = (!hasDesc && !payload.noGuide) ? 'block' : 'none';

      // Disable Analyse button when no description is available yet
      const analyseBtn = $('confirm-analyse-btn');
      if (analyseBtn) analyseBtn.disabled = !hasDesc;

      // Skills
      const skillsSection = $('confirm-skills-section');
      const skills = payload.skills_required || [];
      if (skills.length > 0) {
        $('confirm-skills').innerHTML = skills.slice(0, 8)
          .map((s) => `<span class="skill-tag">${s}</span>`).join('');
        skillsSection.style.display = '';
      } else {
        skillsSection.style.display = 'none';
      }

      showState('confirm');
      break;
    }

    case 'JOB_EXTRACTED':
      currentJobData = payload;
      // Show preview in analyzing state
      $('extracted-preview').style.display = 'block';
      $('preview-title').textContent = payload.title;
      if (payload.platform === 'linkedin') {
        const parts = [payload.platform];
        if (payload.company) parts.push(payload.company);
        $('preview-meta').textContent = parts.join(' · ');
        // Update spinner label for LinkedIn
        const at = $('analyzing-title');
        const as = $('analyzing-sub');
        if (at) at.textContent = 'Matching your CV to this job…';
        if (as) as.textContent = 'Usually takes 3–5 seconds';
      } else {
        $('preview-meta').textContent = `${payload.platform} · $${payload.budget_min}–$${payload.budget_max}`;
      }
      break;

    case 'ANALYSIS_RESULT':
      if (payload.analysis_type === 'job_match') {
        renderMatchResult(payload);
      } else {
        renderResult(payload);
      }
      break;
  }
});

// Confirm: user clicks "Analyse this job"
$('confirm-analyse-btn').addEventListener('click', () => {
  showState('extracting');
  window.parent.postMessage({ source: 'fiq-sidebar', type: 'CONFIRM_ANALYSE' }, '*');
});

// Tell content.js we are ready
window.parent.postMessage({ source: 'fiq-sidebar', type: 'SIDEBAR_READY' }, '*');

// ─── Button handlers ──────────────────────────────────────────────────────────

// Close
$('closeBtn').addEventListener('click', () => {
  window.parent.postMessage({ source: 'fiq-sidebar', type: 'CLOSE_SIDEBAR' }, '*');
});

// Copy cover letter
$('copy-btn').addEventListener('click', async () => {
  const text = $('cover-letter-textarea').value;
  try {
    await navigator.clipboard.writeText(text);
    const btn = $('copy-btn');
    const original = btn.innerHTML;
    btn.textContent = '✓ Copied!';
    btn.classList.add('copied-flash');
    setTimeout(() => { btn.innerHTML = original; btn.classList.remove('copied-flash'); }, 1800);
  } catch {
    $('cover-letter-textarea').select();
  }
});

// Regenerate cover letter
$('regen-btn').addEventListener('click', async () => {
  if (!currentAnalysis) return;
  const btn = $('regen-btn');
  btn.disabled = true;
  btn.textContent = 'Regenerating…';

  const result = await chrome.runtime.sendMessage({
    type: 'API_REQUEST',
    payload: {
      method: 'POST',
      path: '/proposals/generate',
      body: { analysisId: currentAnalysis._id, tone: currentTone },
    },
  });

  btn.disabled = false;
  btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg> Regenerate`;

  if (result?.data?.data?.cover_letter) {
    $('cover-letter-textarea').value = result.data.data.cover_letter;
    updateWordCount(result.data.data.cover_letter);
  }
});

// Download cover letter
$('download-btn').addEventListener('click', () => {
  const text = $('cover-letter-textarea').value;
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cover-letter-${currentAnalysis?._id || Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
});

// Live word count
$('cover-letter-textarea').addEventListener('input', (e) => {
  updateWordCount(e.target.value);
});

// Outcome: did you bid?
$('bid-yes').addEventListener('click', () => {
  outcomeState.did_bid = true;
  $('bid-yes').classList.add('selected-yes');
  $('bid-no').classList.remove('selected-no');
  $('win-outcome-section').style.display = 'block';
});

$('bid-no').addEventListener('click', () => {
  outcomeState.did_bid = false;
  outcomeState.did_win = null;
  $('bid-no').classList.add('selected-no');
  $('bid-yes').classList.remove('selected-yes');
  $('win-outcome-section').style.display = 'none';
});

// Outcome: win/loss/pending
['won', 'lost', 'pending'].forEach((key) => {
  $(`outcome-${key}`).addEventListener('click', () => {
    outcomeState.did_win = key === 'won' ? true : key === 'lost' ? false : null;
    ['won', 'lost', 'pending'].forEach((k) => {
      $(`outcome-${k}`).className = 'outcome-btn' + (k === key ? ` selected-${key}` : '');
    });
  });
});

// Save outcome
$('save-outcome-btn').addEventListener('click', async () => {
  if (!currentAnalysis) return;
  const btn = $('save-outcome-btn');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  const actualBid = $('actual-bid').value;
  await chrome.runtime.sendMessage({
    type: 'API_REQUEST',
    payload: {
      method: 'PATCH',
      path: `/analysis/${currentAnalysis._id}`,
      body: {
        did_bid: outcomeState.did_bid,
        did_win: outcomeState.did_win,
        actual_bid_amount: actualBid ? Number(actualBid) : null,
      },
    },
  });

  btn.disabled = false;
  btn.textContent = '✓ Saved!';
  setTimeout(() => { btn.textContent = 'Save outcome'; }, 2000);
});

// Re-analyse
$('reanalyse-btn').addEventListener('click', () => {
  showState('extracting');
  window.parent.postMessage({ source: 'fiq-sidebar', type: 'SIDEBAR_READY' }, '*');
});

// Retry on error
$('retry-btn').addEventListener('click', () => {
  showState('extracting');
  window.parent.postMessage({ source: 'fiq-sidebar', type: 'SIDEBAR_READY' }, '*');
});

// Re-analyse match
$('match-reanalyse-btn').addEventListener('click', () => {
  showState('extracting');
  window.parent.postMessage({ source: 'fiq-sidebar', type: 'SIDEBAR_READY' }, '*');
});

// ─── Paste job description feature ────────────────────────────────────────────

// Entry points → show paste form (auto-detect platform from page URL)
function goToPaste() {
  const sel = $('paste-platform');
  const wrap = $('paste-platform-wrap');
  if (_detectedPlatform) {
    if (sel) sel.value = _detectedPlatform === 'linkedin' ? 'linkedin' : 'upwork';
    if (wrap) wrap.style.display = 'none';
  } else {
    // No platform detected yet — show the selector so user can choose
    if (wrap) wrap.style.display = '';
  }
  showState('paste');
}
$('paste-from-error-btn').addEventListener('click', goToPaste);
$('paste-from-confirm-btn').addEventListener('click', goToPaste);

// Back → return to error state (safe fallback)
$('paste-back-btn').addEventListener('click', () => showState('error'));

// Character counter + button enable/disable
$('paste-desc').addEventListener('input', () => {
  const val = $('paste-desc').value;
  $('paste-char-hint').textContent = `${val.length} / 15000`;
  $('paste-analyse-btn').disabled = val.trim().length < 50;
});

// Submit paste analysis
$('paste-analyse-btn').addEventListener('click', runPasteAnalysis);

async function runPasteAnalysis() {
  const platform = $('paste-platform').value;
  const title = ($('paste-title').value || '').trim() || 'Manual Entry';
  const desc = ($('paste-desc').value || '').trim();
  const errEl = $('paste-error');

  // Validate
  if (desc.length < 50) {
    errEl.textContent = 'Description must be at least 50 characters.';
    errEl.style.display = 'block';
    return;
  }
  errEl.style.display = 'none';

  // Auth check
  const auth = await chrome.runtime.sendMessage({ type: 'GET_AUTH' });
  if (!auth?.token) {
    showState('unauthenticated');
    return;
  }

  // Show analyzing state with appropriate label
  const analyzingTitle = $('analyzing-title');
  const analyzingSub = $('analyzing-sub');
  if (analyzingTitle) analyzingTitle.textContent = platform === 'linkedin' ? 'Matching your CV to this job…' : 'AI is scoring this job…';
  if (analyzingSub) analyzingSub.textContent = 'Usually takes 3–5 seconds';
  showState('analyzing');

  // 'other' platform uses bid pipeline (treated as upwork)
  const apiPlatform = platform === 'other' ? 'upwork' : platform;

  const res = await chrome.runtime.sendMessage({
    type: 'API_REQUEST',
    payload: {
      method: 'POST',
      path: '/analysis/create',
      body: {
        platform: apiPlatform,
        title,
        description: desc,
        url: '',
        budget_min: 0,
        budget_max: 0,
        skills_required: [],
      },
    },
  });

  if (res?.data?.success && res.data.data) {
    if (res.data.data.analysis_type === 'job_match') {
      renderMatchResult(res.data.data);
    } else {
      renderResult(res.data.data);
    }
  } else {
    const errMsg = res?.data?.error || res?.error || 'Analysis failed. Please try again.';
    // Show error state with message
    $('error-title').textContent = 'Analysis failed';
    $('error-msg').textContent = errMsg;
    showState('error');
  }
}
