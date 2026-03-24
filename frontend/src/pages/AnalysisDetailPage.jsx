import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import BidScoreGauge from '../components/ui/BidScoreGauge';
import { SkeletonCard } from '../components/ui/Skeleton';
import { addNotification } from '../store/slices/uiSlice';
import { analysisApi, proposalsApi } from '../services/api';

// ─── Flag list ───────────────────────────────────────────────────────────────

function FlagList({ flags, variant }) {
  const isGreen = variant === 'green';
  if (flags.length === 0) {
    return <p className="text-sm text-slate-500 italic">None identified</p>;
  }
  return (
    <ul className="space-y-2.5">
      {flags.map((flag) => (
        <li key={flag} className="flex items-start gap-2.5 text-sm">
          {isGreen ? (
            <svg
              className="h-4 w-4 shrink-0 mt-0.5 text-emerald-500"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <svg
              className="h-4 w-4 shrink-0 mt-0.5 text-red-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                clipRule="evenodd"
              />
            </svg>
          )}
          <span className={isGreen ? 'text-slate-700' : 'text-slate-700'}>{flag}</span>
        </li>
      ))}
    </ul>
  );
}

// ─── Cover Letter box ─────────────────────────────────────────────────────────

function CoverLetterBox({ analysisId, initialLetter, tone: initialTone }) {
  const dispatch = useDispatch();
  const [letter, setLetter] = useState(initialLetter || '');
  const [tone, setTone] = useState(initialTone || 'professional');
  const [regenerating, setRegenerating] = useState(false);
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
    setRegenerating(true);
    try {
      const res = await proposalsApi.regenerate({ analysisId, tone });
      setLetter(res.data.cover_letter);
      dispatch(
        addNotification({ type: 'success', message: `Cover letter regenerated (${tone} tone).` }),
      );
    } catch {
      dispatch(
        addNotification({ type: 'error', message: 'Regeneration failed. Please try again.' }),
      );
    } finally {
      setRegenerating(false);
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
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm shadow-violet-500/20">
          <svg
            className="w-4 h-4 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">AI Cover Letter</h3>
          <p className="text-xs text-slate-400">Edit directly before sending</p>
        </div>
      </div>

      {/* Tone selector */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-xs font-medium text-slate-500 shrink-0">Tone:</span>
        {tones.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTone(t)}
            className={`px-3 py-1 text-xs rounded-lg border capitalize font-medium transition-all duration-150 ${
              tone === t
                ? 'border-blue-500 bg-blue-500 text-white shadow-sm shadow-blue-500/20'
                : 'border-slate-200 text-slate-500 bg-slate-50 hover:border-slate-300 hover:text-slate-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Editable textarea */}
      <textarea
        ref={textareaRef}
        value={letter}
        onChange={(e) => setLetter(e.target.value)}
        className="w-full text-sm text-slate-700 leading-relaxed resize-y border border-slate-200 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[180px] bg-slate-50 focus:bg-white transition-all"
        placeholder="AI cover letter will appear here…"
      />

      {/* Word count */}
      <p className="text-xs text-slate-400 text-right mt-1.5">
        {letter.trim().split(/\s+/).filter(Boolean).length} words
      </p>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100">
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm shadow-blue-500/20"
        >
          {copied ? (
            <>
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                  clipRule="evenodd"
                />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              Copy
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleRegenerate}
          disabled={regenerating}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60 transition-all"
        >
          {regenerating ? (
            <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          ) : (
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          )}
          {regenerating ? 'Regenerating…' : 'Regenerate'}
        </button>

        <button
          type="button"
          onClick={handleDownload}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          Download .txt
        </button>
      </div>
    </div>
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
      dispatch(
        addNotification({
          type: 'success',
          message: 'Outcome saved. This improves your AI recommendations.',
        }),
      );
      setTimeout(() => setSaved(false), 3000);
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to save outcome.' }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-sm shadow-amber-500/20">
          <svg
            className="w-4 h-4 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">Record Outcome</h3>
          <p className="text-xs text-slate-400">Help FreelanceIQ learn from your results</p>
        </div>
      </div>

      <div className="space-y-5">
        {/* Did you bid? */}
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2.5">
            Did you submit a bid?
          </p>
          <div className="flex gap-2">
            {[true, false].map((val) => (
              <button
                key={String(val)}
                type="button"
                onClick={() =>
                  setOutcome((prev) => ({
                    ...prev,
                    did_bid: val,
                    did_win: val ? prev.did_win : null,
                  }))
                }
                className={`px-5 py-2 text-sm rounded-xl border font-semibold transition-all duration-150 ${
                  outcome.did_bid === val
                    ? 'border-blue-500 bg-blue-500 text-white shadow-sm shadow-blue-500/20'
                    : 'border-slate-200 text-slate-600 bg-slate-50 hover:border-slate-300'
                }`}
              >
                {val ? 'Yes' : 'No'}
              </button>
            ))}
          </div>
        </div>

        {outcome.did_bid && (
          <>
            {/* Did you win? */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2.5">
                Did you win the contract?
              </p>
              <div className="flex gap-2">
                {[
                  { label: 'Won', val: true },
                  { label: 'Lost', val: false },
                  { label: 'Pending', val: null },
                ].map(({ label, val }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setOutcome((prev) => ({ ...prev, did_win: val }))}
                    className={`px-4 py-2 text-sm rounded-xl border font-semibold transition-all duration-150 ${
                      outcome.did_win === val
                        ? val === true
                          ? 'border-emerald-500 bg-emerald-500 text-white shadow-sm shadow-emerald-500/20'
                          : val === false
                            ? 'border-red-400 bg-red-500 text-white shadow-sm shadow-red-500/20'
                            : 'border-amber-400 bg-amber-500 text-white shadow-sm shadow-amber-500/20'
                        : 'border-slate-200 text-slate-600 bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Actual bid amount */}
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2.5">
                Actual bid amount (USD)
              </label>
              <div className="flex items-center gap-2 max-w-xs">
                <span className="text-slate-400 text-sm font-medium">$</span>
                <input
                  type="number"
                  min="1"
                  value={outcome.actual_bid_amount}
                  onChange={(e) =>
                    setOutcome((prev) => ({ ...prev, actual_bid_amount: e.target.value }))
                  }
                  placeholder="e.g. 850"
                  className="flex-1 px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                />
              </div>
            </div>
          </>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-60 transition-all shadow-sm"
        >
          {saving ? (
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          ) : saved ? (
            <svg className="h-4 w-4 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                clipRule="evenodd"
              />
            </svg>
          ) : null}
          {saved ? 'Saved!' : saving ? 'Saving…' : 'Save outcome'}
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const WIN_PROB_STYLE = (p) =>
  p === 'High'
    ? 'bg-emerald-100 text-emerald-700'
    : p === 'Medium'
      ? 'bg-amber-100 text-amber-700'
      : 'bg-red-100 text-red-700';

const BADGE_STYLE = 'bg-slate-100 text-slate-600 text-xs font-medium px-2.5 py-1 rounded-lg';

export default function AnalysisDetailPage() {
  const { id } = useParams();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analysisApi
      .getById(id)
      .then((res) => {
        setAnalysis(res.data);
      })
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
        <Link
          to="/analysis/history"
          className="text-blue-600 text-sm hover:underline mt-2 inline-block"
        >
          ← Back to history
        </Link>
      </div>
    );
  }

  const { job, result, proposal, outcome } = analysis;

  return (
    <div className="space-y-5">
      {/* Back */}
      <Link
        to="/analysis/history"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to history
      </Link>

      {/* Job card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg lg:text-xl font-bold text-slate-900 leading-tight">
              {job.title}
            </h2>
            <p className="text-sm text-slate-400 mt-0.5 capitalize">
              {job.platform} · {new Date(analysis.created_at).toLocaleDateString()}
            </p>
          </div>
          {job.url && (
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
            >
              View job
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          )}
        </div>
        <p className="text-sm text-slate-600 leading-relaxed mb-4">{job.description}</p>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {job.skills_required.map((skill) => (
            <span key={skill} className={BADGE_STYLE}>
              {skill}
            </span>
          ))}
        </div>
        {(job.budget_min || job.client_hires != null) && (
          <div className="flex flex-wrap gap-5 text-sm text-slate-500 pt-4 border-t border-slate-100">
            {job.budget_min && (
              <span>
                Budget:{' '}
                <span className="font-semibold text-slate-800">
                  ${job.budget_min}–${job.budget_max}
                </span>
              </span>
            )}
            {job.client_hires != null && (
              <span>
                Client hires:{' '}
                <span className="font-semibold text-slate-800">{job.client_hires}</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Score + result row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {/* Gauge */}
        <div className="sm:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 flex flex-col items-center justify-center shadow-sm">
          <BidScoreGauge score={result.bid_score} size={160} strokeWidth={14} />
          <p className="text-xs text-slate-500 text-center mt-3 leading-relaxed max-w-lg">
            {result.score_reasoning}
          </p>
        </div>

        {/* Details */}
        <div className="sm:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
              Suggested bid range
            </p>
            <p className="text-2xl sm:text-3xl font-black text-slate-900">
              ${result.bid_min} – ${result.bid_max}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
              Win probability
            </p>
            <span
              className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full ${WIN_PROB_STYLE(result.win_probability)}`}
            >
              <span className="w-2 h-2 rounded-full bg-current opacity-70" />
              {result.win_probability}
            </span>
          </div>

          <div className="flex gap-6">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
                Competition
              </p>
              <span className={BADGE_STYLE}>{result.competition_level}</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
                Category
              </p>
              <span className={BADGE_STYLE}>{result.category}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Flags */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <svg
                className="w-3.5 h-3.5 text-emerald-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-slate-900">Green Flags</h3>
          </div>
          <FlagList flags={result.green_flags} variant="green" />
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center">
              <svg
                className="w-3.5 h-3.5 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-slate-900">Red Flags</h3>
          </div>
          <FlagList flags={result.red_flags} variant="red" />
        </div>
      </div>

      {/* Cover letter */}
      <CoverLetterBox
        analysisId={analysis._id}
        initialLetter={proposal?.cover_letter}
        tone={proposal?.tone_detected}
      />

      {/* Outcome recorder */}
      <OutcomeRecorder analysisId={analysis._id} initialOutcome={outcome} />
    </div>
  );
}
