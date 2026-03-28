import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import BidScoreGauge from '../components/ui/BidScoreGauge';
import { SkeletonCard } from '../components/ui/Skeleton';
import { addNotification } from '../store/slices/uiSlice';
import { analysisApi, proposalsApi } from '../services/api';

// ─── Section card wrapper ─────────────────────────────────────────────────────

function SectionCard({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

function SectionHeader({ icon, iconBg, title, subtitle }) {
  return (
    <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: iconBg }}>
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

// ─── Flag list ────────────────────────────────────────────────────────────────

function FlagList({ flags, variant }) {
  const isGreen = variant === 'green';
  if (!flags || flags.length === 0)
    return <p className="text-sm text-slate-400 italic px-6 pb-5">None identified</p>;
  return (
    <ul className="px-6 pb-5 space-y-2.5">
      {flags.map((flag) => (
        <li key={flag} className="flex items-start gap-2.5 text-sm">
          {isGreen ? (
            <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
              <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          ) : (
            <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
              <svg className="w-3 h-3 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          )}
          <span className="text-slate-700 leading-relaxed">{flag}</span>
        </li>
      ))}
    </ul>
  );
}

// ─── Chip tag ─────────────────────────────────────────────────────────────────

function Chip({ children, color = 'slate' }) {
  const COLORS = {
    slate:   'bg-slate-100 text-slate-600 border-slate-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber:   'bg-amber-50 text-amber-700 border-amber-100',
    red:     'bg-red-50 text-red-700 border-red-100',
    blue:    'bg-blue-50 text-blue-700 border-blue-100',
    violet:  'bg-violet-50 text-violet-700 border-violet-100',
  };
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-lg border ${COLORS[color]}`}>
      {children}
    </span>
  );
}

// ─── Job description with show more/less ─────────────────────────────────────

function JobDescription({ text }) {
  const [expanded, setExpanded] = useState(false);
  // Collapse 2+ consecutive blank lines into one to remove LinkedIn's excessive spacing
  const normalized = text.replace(/\n{3,}/g, '\n\n').trim();
  const LIMIT = 300;
  const isLong = normalized.length > LIMIT;

  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
        {isLong && !expanded ? normalized.slice(0, LIMIT).trimEnd() + '…' : normalized}
      </p>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors flex items-center gap-1"
        >
          {expanded ? 'Show less' : 'Show more'}
          <svg
            className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ─── About the company (expandable) ──────────────────────────────────────────

function CompanyDescription({ text, company }) {
  const [expanded, setExpanded] = useState(false);
  const normalized = text.replace(/\n{3,}/g, '\n\n').trim();
  const LIMIT = 250;
  const isLong = normalized.length > LIMIT;

  return (
    <div className="mt-4 pt-4 border-t border-slate-100">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.14em] mb-1.5">
        {company ? `About ${company}` : 'About the company'}
      </p>
      <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
        {isLong && !expanded ? normalized.slice(0, LIMIT).trimEnd() + '…' : normalized}
      </p>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors flex items-center gap-1"
        >
          {expanded ? 'Show less' : 'Show more'}
          <svg
            className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ─── Cover Letter ─────────────────────────────────────────────────────────────

function CoverLetterBox({ analysisId, initialLetter, tone: initialTone }) {
  const dispatch = useDispatch();
  const [letter, setLetter] = useState(initialLetter || '');
  const [tone, setTone] = useState(initialTone || 'professional');
  const [regenerating, setRegen] = useState(false);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef(null);
  const tones = ['professional', 'confident', 'friendly', 'concise'];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(letter);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      dispatch(addNotification({ type: 'success', message: 'Cover letter copied to clipboard.' }));
    } catch {
      textareaRef.current?.select();
    }
  };

  const handleRegenerate = async () => {
    setRegen(true);
    try {
      const res = await proposalsApi.regenerate({ analysisId, tone });
      setLetter(res.data.cover_letter);
      dispatch(addNotification({ type: 'success', message: `Cover letter regenerated (${tone} tone).` }));
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Regeneration failed. Please try again.' }));
    } finally {
      setRegen(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([letter], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cover-letter-${analysisId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    dispatch(addNotification({ type: 'info', message: 'Cover letter downloaded.' }));
  };

  if (!letter) return null;

  return (
    <SectionCard>
      <SectionHeader
        iconBg="linear-gradient(135deg, #8b5cf6, #a78bfa)"
        icon={<svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
        title="AI Cover Letter"
        subtitle="Edit directly before sending"
      />
      <div className="px-6 py-5 space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-500">Tone:</span>
          {tones.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTone(t)}
              className="px-3 py-1 text-xs rounded-lg border capitalize font-semibold transition-all duration-150"
              style={tone === t
                ? { borderColor: '#8b5cf6', background: '#8b5cf6', color: '#fff', boxShadow: '0 2px 8px -2px rgba(139,92,246,0.5)' }
                : { borderColor: '#e2e8f0', color: '#64748b', background: '#f8fafc' }}
            >
              {t}
            </button>
          ))}
        </div>
        <textarea
          ref={textareaRef}
          value={letter}
          onChange={(e) => setLetter(e.target.value)}
          className="w-full text-sm text-slate-700 leading-relaxed resize-y border border-slate-200 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent min-h-[200px] bg-slate-50 focus:bg-white transition-all"
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400">{letter.trim().split(/\s+/).filter(Boolean).length} words</p>
        </div>
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
          <button type="button" onClick={handleCopy}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl text-white transition-all"
            style={{ background: copied ? '#10b981' : '#6366f1', boxShadow: '0 2px 8px -2px rgba(99,102,241,0.4)' }}>
            {copied ? (
              <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>Copied!</>
            ) : (
              <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>Copy</>
            )}
          </button>
          <button type="button" onClick={handleRegenerate} disabled={regenerating}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 text-slate-700 hover:border-violet-300 hover:text-violet-700 hover:bg-violet-50 disabled:opacity-60 transition-all">
            <svg className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {regenerating ? 'Regenerating…' : 'Regenerate'}
          </button>
          <button type="button" onClick={handleDownload}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download .txt
          </button>
        </div>
      </div>
    </SectionCard>
  );
}

// ─── Outcome recorder ─────────────────────────────────────────────────────────

function OutcomeRecorder({ analysisId, initialOutcome }) {
  const dispatch = useDispatch();
  const [outcome, setOutcome] = useState(
    initialOutcome || { did_bid: false, did_win: null, actual_bid_amount: '' },
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await analysisApi.updateOutcome(analysisId, {
        did_bid: outcome.did_bid,
        did_win: outcome.did_bid ? outcome.did_win : null,
        actual_bid_amount: outcome.actual_bid_amount ? Number(outcome.actual_bid_amount) : null,
      });
      setSaved(true);
      dispatch(addNotification({ type: 'success', message: 'Outcome saved.' }));
      setTimeout(() => setSaved(false), 3000);
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to save outcome.' }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard>
      <SectionHeader
        iconBg="linear-gradient(135deg, #f59e0b, #f97316)"
        icon={<svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
        title="Record Outcome"
        subtitle="Help FreelanceIQ learn from your results"
      />
      <div className="px-6 py-5 space-y-5">
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2.5">Did you submit a bid?</p>
          <div className="flex gap-2">
            {[true, false].map((val) => (
              <button key={String(val)} type="button"
                onClick={() => setOutcome((p) => ({ ...p, did_bid: val, did_win: val ? p.did_win : null }))}
                className="px-5 py-2 text-sm rounded-xl border font-bold transition-all duration-150"
                style={outcome.did_bid === val
                  ? { borderColor: '#6366f1', background: '#6366f1', color: '#fff', boxShadow: '0 2px 8px -2px rgba(99,102,241,0.5)' }
                  : { borderColor: '#e2e8f0', color: '#475569', background: '#f8fafc' }}>
                {val ? 'Yes' : 'No'}
              </button>
            ))}
          </div>
        </div>
        {outcome.did_bid && (
          <>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2.5">Did you win the contract?</p>
              <div className="flex gap-2">
                {[
                  { label: 'Won', val: true, active: '#10b981' },
                  { label: 'Lost', val: false, active: '#ef4444' },
                  { label: 'Pending', val: null, active: '#f59e0b' },
                ].map(({ label, val, active }) => (
                  <button key={label} type="button"
                    onClick={() => setOutcome((p) => ({ ...p, did_win: val }))}
                    className="px-4 py-2 text-sm rounded-xl border font-bold transition-all duration-150"
                    style={outcome.did_win === val
                      ? { borderColor: active, background: active, color: '#fff', boxShadow: `0 2px 8px -2px ${active}80` }
                      : { borderColor: '#e2e8f0', color: '#475569', background: '#f8fafc' }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2.5">
                Actual bid amount (USD)
              </label>
              <div className="flex items-center gap-2 max-w-xs border border-slate-200 rounded-xl bg-slate-50 focus-within:ring-2 focus-within:ring-indigo-400 focus-within:bg-white focus-within:border-transparent transition-all px-3">
                <span className="text-slate-400 text-sm font-bold">$</span>
                <input
                  type="number" min="1"
                  value={outcome.actual_bid_amount}
                  onChange={(e) => setOutcome((p) => ({ ...p, actual_bid_amount: e.target.value }))}
                  placeholder="e.g. 850"
                  className="flex-1 py-2.5 text-sm bg-transparent focus:outline-none text-slate-900 placeholder-slate-400"
                />
              </div>
            </div>
          </>
        )}
        <button type="button" onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl text-white disabled:opacity-60 transition-all"
          style={{ background: saved ? '#10b981' : '#0f172a', boxShadow: '0 2px 8px -2px rgba(15,23,42,0.4)' }}>
          {saved ? (
            <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>Saved!</>
          ) : saving ? 'Saving…' : 'Save outcome'}
        </button>
      </div>
    </SectionCard>
  );
}

// ─── Upwork bid detail view ───────────────────────────────────────────────────

function BidDetailView({ analysis }) {
  const { result, proposal, outcome } = analysis;

  const WIN_COLOR = result.win_probability === 'High'
    ? { bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a', dot: '#22c55e' }
    : result.win_probability === 'Medium'
      ? { bg: '#fefce8', border: '#fde68a', text: '#b45309', dot: '#f59e0b' }
      : { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', dot: '#ef4444' };

  return (
    <>
      {/* Score hero + metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">

        {/* Score gauge */}
        <SectionCard className="sm:col-span-2 flex flex-col items-center justify-center py-8 px-6">
          <BidScoreGauge score={result.bid_score} size={160} strokeWidth={14} />
          <p className="text-xs text-slate-500 text-center mt-4 leading-relaxed">
            {result.score_reasoning}
          </p>
        </SectionCard>

        {/* Metrics */}
        <SectionCard className="sm:col-span-3 p-6 space-y-5">
          {/* Bid range */}
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1">Suggested Bid Range</p>
            <p className="text-3xl font-black text-slate-900 tracking-tight">
              ${result.bid_min}
              <span className="text-slate-400 font-bold mx-1">–</span>
              ${result.bid_max}
            </p>
          </div>

          <div className="h-px bg-slate-100" />

          <div className="grid grid-cols-3 gap-4">
            {/* Win probability */}
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.14em] mb-2">Win Probability</p>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-xl border"
                style={{ background: WIN_COLOR.bg, borderColor: WIN_COLOR.border, color: WIN_COLOR.text }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: WIN_COLOR.dot }} />
                {result.win_probability}
              </span>
            </div>
            {/* Competition */}
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.14em] mb-2">Competition</p>
              <Chip>{result.competition_level}</Chip>
            </div>
            {/* Category */}
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.14em] mb-2">Category</p>
              <Chip>{result.category}</Chip>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Green / Red flags */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SectionCard>
          <SectionHeader
            iconBg="#dcfce7"
            icon={<svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
            title="Green Flags"
          />
          <FlagList flags={result.green_flags} variant="green" />
        </SectionCard>
        <SectionCard>
          <SectionHeader
            iconBg="#fee2e2"
            icon={<svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            title="Red Flags"
          />
          <FlagList flags={result.red_flags} variant="red" />
        </SectionCard>
      </div>

      <CoverLetterBox analysisId={analysis._id} initialLetter={proposal?.cover_letter} tone={proposal?.tone_detected} />
      <OutcomeRecorder analysisId={analysis._id} initialOutcome={outcome} />
    </>
  );
}

// ─── LinkedIn job_match detail view ──────────────────────────────────────────

function MatchDetailView({ analysis }) {
  const { match_result } = analysis;
  const action = match_result?.recommended_action || 'Apply with caveats';

  const ACTION_COLOR = action === 'Apply'
    ? { bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a', icon: '✓' }
    : action === 'Apply with caveats'
      ? { bg: '#fefce8', border: '#fde68a', text: '#b45309', icon: '⚡' }
      : { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', icon: '✗' };

  return (
    <>
      {/* Score hero + recommendation */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">

        {/* Score gauge */}
        <SectionCard className="sm:col-span-2 flex flex-col items-center justify-center py-8 px-6">
          <BidScoreGauge score={match_result?.match_score ?? 0} size={160} strokeWidth={14} label="Match Score" />
          <p className="text-xs text-slate-500 text-center mt-4 leading-relaxed">
            {match_result?.score_reasoning}
          </p>
        </SectionCard>

        {/* Recommendation + skills */}
        <SectionCard className="sm:col-span-3 p-6 space-y-5">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2">Recommendation</p>
            <span className="inline-flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-xl border"
              style={{ background: ACTION_COLOR.bg, borderColor: ACTION_COLOR.border, color: ACTION_COLOR.text }}>
              {ACTION_COLOR.icon} {action}
            </span>
          </div>

          {match_result?.matched_skills?.length > 0 && (
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.14em] mb-2">Matched Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {match_result.matched_skills.map((s) => <Chip key={s} color="emerald">{s}</Chip>)}
              </div>
            </div>
          )}

          {match_result?.skill_gaps?.length > 0 && (
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.14em] mb-2">Skill Gaps</p>
              <div className="flex flex-wrap gap-1.5">
                {match_result.skill_gaps.map((s) => <Chip key={s} color="amber">{s}</Chip>)}
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      {/* Strengths */}
      {match_result?.strengths?.length > 0 && (
        <SectionCard>
          <SectionHeader
            iconBg="#dbeafe"
            icon={<svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            title="Why you're a fit"
          />
          <FlagList flags={match_result.strengths} variant="green" />
        </SectionCard>
      )}

      {analysis.cv_guidance && <CVGuidanceCard guidance={analysis.cv_guidance} />}
    </>
  );
}

// ─── CV Guidance card ─────────────────────────────────────────────────────────

function CVGuidanceCard({ guidance }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <SectionCard>
      <SectionHeader
        iconBg="linear-gradient(135deg, #8b5cf6, #a78bfa)"
        icon={<svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
        title="CV Improvement Guide"
        subtitle="Personalised advice to tailor your CV for this role"
      />

      <div className="px-6 py-5 space-y-5">
        <p className="text-sm text-slate-600 leading-relaxed">{guidance.overall_assessment}</p>

        {guidance.summary_rewrite_hint && (
          <div className="p-4 rounded-xl bg-violet-50 border border-violet-100">
            <p className="text-xs font-bold text-violet-700 mb-1.5">Suggested summary opening</p>
            <p className="text-xs text-violet-800 italic leading-relaxed">"{guidance.summary_rewrite_hint}"</p>
          </div>
        )}

        {guidance.priority_changes?.length > 0 && (
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.14em] mb-3">Top Priority Changes</p>
            <div className="space-y-3">
              {guidance.priority_changes.map((change, i) => (
                <div key={i} className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-amber-400 text-white text-xs font-black flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <div>
                      <span className="text-xs font-bold text-amber-800">{change.section}</span>
                      <p className="text-xs text-amber-700 mt-0.5">{change.issue}</p>
                      <p className="text-xs font-bold text-amber-900 mt-1">→ {change.action}</p>
                      {change.example && (
                        <p className="text-xs text-slate-600 italic mt-1.5 bg-white/70 rounded-lg px-2 py-1.5">
                          e.g. "{change.example}"
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {guidance.keywords_to_add?.length > 0 && (
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.14em] mb-2">Missing Keywords</p>
              <div className="flex flex-wrap gap-1.5">
                {guidance.keywords_to_add.map((kw) => <Chip key={kw} color="red">{kw}</Chip>)}
              </div>
            </div>
          )}
          {guidance.keywords_to_emphasise?.length > 0 && (
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.14em] mb-2">Emphasise More</p>
              <div className="flex flex-wrap gap-1.5">
                {guidance.keywords_to_emphasise.map((kw) => <Chip key={kw} color="blue">{kw}</Chip>)}
              </div>
            </div>
          )}
        </div>
      </div>

      {(guidance.sections_to_improve?.length > 0 || guidance.ats_tips?.length > 0) && (
        <>
          <button type="button" onClick={() => setExpanded((v) => !v)}
            className="w-full flex items-center justify-between px-6 py-3.5 text-xs font-bold text-slate-500 hover:text-slate-700 border-t border-slate-100 hover:bg-slate-50 transition-colors">
            <span>{expanded ? 'Hide' : 'Show'} section tips & ATS checklist</span>
            <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {expanded && (
            <div className="px-6 pb-6 pt-3 space-y-4 border-t border-slate-100">
              {guidance.sections_to_improve?.length > 0 && (
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.14em] mb-2">Section-by-section Fixes</p>
                  <div className="space-y-2">
                    {guidance.sections_to_improve.map((s, i) => (
                      <div key={i} className="rounded-xl bg-slate-50 border border-slate-100 p-3.5">
                        <p className="text-xs font-bold text-slate-700 mb-0.5">{s.section}</p>
                        <p className="text-xs text-slate-500 mb-1">{s.current_weakness}</p>
                        <p className="text-xs font-bold text-slate-700">→ {s.how_to_fix}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {guidance.ats_tips?.length > 0 && (
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.14em] mb-2">ATS & Formatting Checklist</p>
                  <ul className="space-y-1.5">
                    {guidance.ats_tips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                        <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </SectionCard>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AnalysisDetailPage() {
  const { id } = useParams();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analysisApi
      .getById(id)
      .then((res) => setAnalysis(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4 max-w-3xl">
        <div className="h-5 w-28 bg-slate-200 rounded animate-pulse" />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
        <p className="text-slate-500 font-medium">Analysis not found.</p>
        <Link to="/analysis/history" className="text-indigo-600 text-sm hover:underline mt-2 inline-block">
          ← Back to history
        </Link>
      </div>
    );
  }

  const { job } = analysis;
  const isMatch = analysis.analysis_type === 'job_match';

  return (
    <div className="space-y-5">

      {/* ── Back link ── */}
      <Link to="/analysis/history"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-400 hover:text-slate-700 transition-colors group">
        <svg className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
        </svg>
        Back to history
      </Link>

      {/* ── Job card ── */}
      <SectionCard>
        <div className="px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h2 className="text-lg font-black text-slate-900 leading-tight">{job.title}</h2>
                {isMatch && (
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 uppercase tracking-wider border border-blue-200">
                    LinkedIn
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-slate-400 capitalize">{job.platform}</span>
                {isMatch && job.company && <><span className="text-slate-200">·</span><span className="text-xs text-slate-500">{job.company}</span></>}
                {isMatch && job.location && <><span className="text-slate-200">·</span><span className="text-xs text-slate-500">{job.location}</span></>}
                {isMatch && job.seniority_level && <><span className="text-slate-200">·</span><span className="text-xs text-slate-500">{job.seniority_level}</span></>}
                <span className="text-slate-200">·</span>
                <span className="text-xs text-slate-400">{new Date(analysis.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            {job.url && (
              <a href={job.url} target="_blank" rel="noopener noreferrer"
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100 transition-colors">
                View job
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
          </div>

          {job.description && <JobDescription text={job.description} />}

          {job.skills_required?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4">
              {job.skills_required.map((skill) => <Chip key={skill}>{skill}</Chip>)}
            </div>
          )}

          {job.company_description && <CompanyDescription text={job.company_description} company={job.company} />}

          {!isMatch && (job.budget_min > 0 || job.client_hires != null) && (
            <div className="flex flex-wrap gap-5 text-sm text-slate-500 mt-4 pt-4 border-t border-slate-100">
              {job.budget_min > 0 && (
                <span>Budget: <span className="font-bold text-slate-800">${job.budget_min}–${job.budget_max}</span></span>
              )}
              {job.client_hires != null && (
                <span>Client hires: <span className="font-bold text-slate-800">{job.client_hires}</span></span>
              )}
            </div>
          )}
        </div>
      </SectionCard>

      {/* ── Type-specific content ── */}
      {isMatch ? <MatchDetailView analysis={analysis} /> : <BidDetailView analysis={analysis} />}
    </div>
  );
}
