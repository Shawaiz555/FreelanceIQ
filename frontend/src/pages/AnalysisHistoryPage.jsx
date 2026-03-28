import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import BidScoreGauge from '../components/ui/BidScoreGauge';
import { SkeletonCard } from '../components/ui/Skeleton';
import { analysisApi } from '../services/api';

const PLATFORMS = ['All', 'upwork', 'linkedin'];
const SORT_OPTIONS = [
  { value: 'date_desc',  label: 'Newest first' },
  { value: 'date_asc',   label: 'Oldest first' },
  { value: 'score_desc', label: 'Score: High → Low' },
  { value: 'score_asc',  label: 'Score: Low → High' },
];

const BADGE_COLORS = {
  High:                 { bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a', dot: '#22c55e' },
  Apply:                { bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a', dot: '#22c55e' },
  Medium:               { bg: '#fefce8', border: '#fde68a', text: '#b45309', dot: '#f59e0b' },
  'Apply with caveats': { bg: '#fefce8', border: '#fde68a', text: '#b45309', dot: '#f59e0b' },
};
const DEFAULT_BADGE = { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', dot: '#ef4444' };

const OUTCOME_COLORS = {
  true:  { bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a', label: 'Won' },
  false: { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', label: 'Lost' },
  null:  { bg: '#f8fafc', border: '#e2e8f0', text: '#64748b', label: 'Bid sent' },
};

function getScore(analysis) {
  if (analysis.analysis_type === 'job_match') return analysis.match_result?.match_score ?? 0;
  return analysis.result?.bid_score ?? 0;
}

function getBadgeLabel(analysis) {
  if (analysis.analysis_type === 'job_match') return analysis.match_result?.recommended_action ?? '—';
  return analysis.result?.win_probability ?? '—';
}

export default function AnalysisHistoryPage() {
  const [analyses, setAnalyses]             = useState([]);
  const [loading, setLoading]               = useState(true);
  const [fetchError, setFetchError]         = useState('');
  const [search, setSearch]                 = useState('');
  const [platform, setPlatform]             = useState('All');
  const [sort, setSort]                     = useState('date_desc');
  const [deletingId, setDeletingId]         = useState(null);
  const [deleteLoading, setDeleteLoading]   = useState(null);

  async function handleDelete(e, id) {
    e.preventDefault();
    e.stopPropagation();
    if (deletingId !== id) { setDeletingId(id); return; }
    setDeleteLoading(id);
    try {
      await analysisApi.delete(id);
      setAnalyses((prev) => prev.filter((a) => a._id !== id));
    } catch { /* keep item */ }
    finally { setDeleteLoading(null); setDeletingId(null); }
  }

  function cancelDelete(e, id) {
    e.preventDefault();
    e.stopPropagation();
    if (deletingId === id) setDeletingId(null);
  }

  useEffect(() => {
    analysisApi.getHistory()
      .then((res) => setAnalyses(res.data.analyses || []))
      .catch((err) => setFetchError(err.message || 'Failed to load history'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let result = [...analyses];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((a) => a.job.title.toLowerCase().includes(q));
    }
    if (platform !== 'All') {
      result = result.filter((a) => a.job.platform.toLowerCase() === platform.toLowerCase());
    }
    result.sort((a, b) => {
      if (sort === 'date_desc')  return new Date(b.created_at) - new Date(a.created_at);
      if (sort === 'date_asc')   return new Date(a.created_at) - new Date(b.created_at);
      if (sort === 'score_desc') return getScore(b) - getScore(a);
      if (sort === 'score_asc')  return getScore(a) - getScore(b);
      return 0;
    });
    return result;
  }, [analyses, search, platform, sort]);

  const hasFilters = search.trim() || platform !== 'All';
  const clearFilters = () => { setSearch(''); setPlatform('All'); };

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Analysis History</h2>
          {!loading && analyses.length > 0 && (
            <p className="text-sm text-slate-400 mt-0.5">{analyses.length} total {analyses.length === 1 ? 'analysis' : 'analyses'}</p>
          )}
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by job title…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent focus:bg-white transition-all"
            />
          </div>

          {/* Platform pills */}
          <div className="flex gap-1.5 flex-wrap">
            {PLATFORMS.map((p) => (
              <button key={p} type="button" onClick={() => setPlatform(p)}
                className="px-3.5 py-2 text-xs font-bold rounded-xl border capitalize transition-all duration-150"
                style={platform === p
                  ? { borderColor: '#6366f1', background: '#6366f1', color: '#fff', boxShadow: '0 2px 8px -2px rgba(99,102,241,0.4)' }
                  : { borderColor: '#e2e8f0', color: '#64748b', background: '#fff' }}>
                {p}
              </button>
            ))}
          </div>

          {/* Sort */}
          <select value={sort} onChange={(e) => setSort(e.target.value)}
            className="px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent focus:bg-white transition-all cursor-pointer">
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {hasFilters && !loading && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
            <span className="text-xs text-slate-500">
              Showing <span className="font-bold text-slate-700">{filtered.length}</span> of {analyses.length}
            </span>
            <button type="button" onClick={clearFilters}
              className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <SkeletonCard key={i} />)}</div>

      ) : fetchError ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-red-100 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-3">
            <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-slate-700 font-bold mb-1">Failed to load history</p>
          <p className="text-slate-400 text-sm max-w-xs mx-auto">{fetchError}</p>
        </div>

      ) : analyses.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto mb-3">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-slate-700 font-bold mb-1">No analyses yet</p>
          <p className="text-slate-400 text-sm max-w-xs mx-auto">
            Your analysis history will appear here once you start analysing jobs.
          </p>
        </div>

      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-slate-500 text-sm font-medium">No analyses match your filters.</p>
          <button type="button" onClick={clearFilters}
            className="mt-2 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors">
            Clear filters
          </button>
        </div>

      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          {filtered.map((analysis, idx) => {
            const isMatch  = analysis.analysis_type === 'job_match';
            const score    = getScore(analysis);
            const label    = getBadgeLabel(analysis);
            const bc       = BADGE_COLORS[label] || DEFAULT_BADGE;
            const isDeleting = deletingId === analysis._id;

            if (isDeleting) {
              return (
                <div key={analysis._id}
                  className="flex items-center gap-4 px-6 py-4 border-l-4 border-red-400"
                  style={{
                    background: '#fff5f5',
                    borderBottom: idx < filtered.length - 1 ? '1px solid #fecaca' : 'none',
                  }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-red-800">Delete this analysis?</p>
                    <p className="text-xs text-red-400 mt-0.5 truncate">{analysis.job.title}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={(e) => cancelDelete(e, analysis._id)}
                      className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors">
                      Cancel
                    </button>
                    <button onClick={(e) => handleDelete(e, analysis._id)} disabled={deleteLoading === analysis._id}
                      className="px-4 py-2 text-xs font-bold rounded-xl text-white disabled:opacity-60 transition-all"
                      style={{ background: '#ef4444', boxShadow: '0 2px 8px -2px rgba(239,68,68,0.5)' }}>
                      {deleteLoading === analysis._id ? 'Deleting…' : 'Yes, delete'}
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={analysis._id}
                className="group relative"
                style={{ borderBottom: idx < filtered.length - 1 ? '1px solid #f1f5f9' : 'none' }}
              >
                <Link
                  to={`/analysis/${analysis._id}`}
                  className="flex items-center gap-3 px-4 py-4 sm:px-6 hover:bg-slate-50/80 transition-all duration-200 border-l-2 border-transparent hover:border-indigo-500 pr-10 sm:pr-14"
                >
                  {/* Score gauge */}
                  <div className="shrink-0 transition-transform duration-300 group-hover:scale-105">
                    <BidScoreGauge score={score} size={48} strokeWidth={4.5} showLabel={false} animate={false} />
                  </div>

                  {/* Title + meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-bold text-slate-900 truncate group-hover:text-indigo-700 transition-colors">
                        {analysis.job.title}
                      </p>
                      {isMatch && (
                        <span className="shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 uppercase tracking-wider border border-blue-100">
                          LinkedIn
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 capitalize truncate">
                      {analysis.job.platform}
                      {isMatch
                        ? analysis.job.company ? ` · ${analysis.job.company}` : ''
                        : analysis.result?.bid_min ? ` · $${analysis.result.bid_min}–$${analysis.result.bid_max}` : ''}
                      {' · '}{new Date(analysis.created_at).toLocaleDateString()}
                    </p>
                    {/* Badge shown inline below meta on mobile */}
                    <div className="flex items-center gap-1.5 mt-1.5 sm:hidden flex-wrap">
                      <span
                        className="text-[9px] font-black px-2 py-0.5 rounded-lg inline-flex items-center gap-1 uppercase tracking-wider"
                        style={{ background: bc.bg, border: `1px solid ${bc.border}`, color: bc.text }}>
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: bc.dot }} />
                        {label}
                      </span>
                      {!isMatch && analysis.outcome?.did_bid && (() => {
                        const oc = OUTCOME_COLORS[String(analysis.outcome.did_win)] || OUTCOME_COLORS.null;
                        return (
                          <span className="text-[9px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider"
                            style={{ background: oc.bg, border: `1px solid ${oc.border}`, color: oc.text }}>
                            {oc.label}
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Badges + arrow — hidden on mobile, shown on sm+ */}
                  <div className="hidden sm:flex items-center gap-2 shrink-0 flex-wrap justify-end">
                    <span
                      className="text-[10px] font-black px-2.5 py-1 rounded-lg flex items-center gap-1.5 uppercase tracking-wider"
                      style={{ background: bc.bg, border: `1px solid ${bc.border}`, color: bc.text }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: bc.dot }} />
                      {label}
                    </span>
                    {!isMatch && analysis.outcome?.did_bid && (() => {
                      const oc = OUTCOME_COLORS[String(analysis.outcome.did_win)] || OUTCOME_COLORS.null;
                      return (
                        <span className="text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider"
                          style={{ background: oc.bg, border: `1px solid ${oc.border}`, color: oc.text }}>
                          {oc.label}
                        </span>
                      );
                    })()}
                  </div>
                  <svg
                    className="w-4 h-4 shrink-0 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all duration-300"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>

                {/* Delete button */}
                <button
                  onClick={(e) => handleDelete(e, analysis._id)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 p-2 rounded-xl hover:bg-red-50 text-slate-300 hover:text-red-500"
                  title="Delete analysis">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
