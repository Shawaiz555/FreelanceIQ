import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import BidScoreGauge from '../components/ui/BidScoreGauge';
import { SkeletonCard } from '../components/ui/Skeleton';
import { analysisApi } from '../services/api';

const PLATFORMS = ['All', 'upwork', 'linkedin'];
const SORT_OPTIONS = [
  { value: 'date_desc', label: 'Newest first' },
  { value: 'date_asc', label: 'Oldest first' },
  { value: 'score_desc', label: 'Score: High → Low' },
  { value: 'score_asc', label: 'Score: Low → High' },
];

const WIN_STYLE = (p) =>
  p === 'High'
    ? 'bg-emerald-100 text-emerald-700'
    : p === 'Medium'
      ? 'bg-amber-100 text-amber-700'
      : 'bg-red-100 text-red-700';

const OUTCOME_STYLE = (o) =>
  o === true
    ? 'bg-emerald-100 text-emerald-700'
    : o === false
      ? 'bg-red-100 text-red-600'
      : 'bg-slate-100 text-slate-500';

export default function AnalysisHistoryPage() {
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [search, setSearch] = useState('');
  const [platform, setPlatform] = useState('All');
  const [sort, setSort] = useState('date_desc');
  const [deletingId, setDeletingId] = useState(null); // id currently showing confirm
  const [deleteLoading, setDeleteLoading] = useState(null); // id currently being deleted

  async function handleDelete(e, id) {
    e.preventDefault();
    e.stopPropagation();
    if (deletingId !== id) {
      setDeletingId(id);
      return;
    }
    // Confirmed — delete
    setDeleteLoading(id);
    try {
      await analysisApi.delete(id);
      setAnalyses((prev) => prev.filter((a) => a._id !== id));
    } catch {
      // silently ignore — keep item in list
    } finally {
      setDeleteLoading(null);
      setDeletingId(null);
    }
  }

  function cancelDelete(e, id) {
    e.preventDefault();
    e.stopPropagation();
    if (deletingId === id) setDeletingId(null);
  }

  useEffect(() => {
    analysisApi
      .getHistory()
      .then((res) => {
        setAnalyses(res.data.analyses || []);
      })
      .catch((err) => {
        setFetchError(err.message || 'Failed to load history');
      })
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
      if (sort === 'date_desc') return new Date(b.created_at) - new Date(a.created_at);
      if (sort === 'date_asc') return new Date(a.created_at) - new Date(b.created_at);
      if (sort === 'score_desc') return b.result.bid_score - a.result.bid_score;
      if (sort === 'score_asc') return a.result.bid_score - b.result.bid_score;
      return 0;
    });
    return result;
  }, [analyses, search, platform, sort]);

  const hasFilters = search.trim() || platform !== 'All';
  const clearFilters = () => {
    setSearch('');
    setPlatform('All');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Analysis history</h2>
          {!loading && analyses.length > 0 && (
            <p className="text-sm text-slate-400 mt-0.5">{analyses.length} total analyzes</p>
          )}
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search by job title…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
            />
          </div>

          {/* Platform filter pills */}
          <div className="flex gap-1.5 flex-wrap">
            {PLATFORMS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPlatform(p)}
                className={`px-3.5 py-2 text-xs font-semibold rounded-xl border capitalize transition-all duration-150 ${
                  platform === p
                    ? 'border-blue-500 bg-blue-500 text-white shadow-sm shadow-blue-500/20'
                    : 'border-slate-200 text-slate-500 bg-white hover:border-slate-300 hover:text-slate-700'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* Active filter indicator */}
        {hasFilters && !loading && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
            <span className="text-xs text-slate-500">
              Showing <span className="font-semibold text-slate-700">{filtered.length}</span> of{' '}
              {analyses.length}
            </span>
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1"
            >
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : fetchError ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-red-100">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg
              className="h-8 w-8 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v3m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              />
            </svg>
          </div>
          <p className="text-slate-700 font-semibold mb-1">Failed to load history</p>
          <p className="text-slate-400 text-sm max-w-xs mx-auto">{fetchError}</p>
        </div>
      ) : analyses.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg
              className="h-8 w-8 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
              />
            </svg>
          </div>
          <p className="text-slate-700 font-semibold mb-1">No analyses yet</p>
          <p className="text-slate-400 text-sm max-w-xs mx-auto">
            Your analysis history will appear here once you start analysing jobs.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg
              className="h-5 w-5 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <p className="text-slate-500 text-sm font-medium">No analyses match your filters.</p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-2 text-xs font-semibold text-blue-600 hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm divide-y divide-slate-100">
          {filtered.map((analysis) => (
            <div key={analysis._id} className="group">
              {deletingId === analysis._id ? (
                /* ── Inline delete confirmation row ── */
                <div className="flex items-center gap-4 px-6 py-4 bg-red-50 border-l-2 border-red-400">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-red-800">Delete this analysis?</p>
                    <p className="text-xs text-red-500 mt-0.5 truncate">{analysis.job.title}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => cancelDelete(e, analysis._id)}
                      className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, analysis._id)}
                      disabled={deleteLoading === analysis._id}
                      className="px-4 py-2 text-xs font-bold rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-60 flex items-center gap-1.5"
                    >
                      {deleteLoading === analysis._id ? (
                        <>
                          <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
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
                              d="M4 12a8 8 0 018-8v8z"
                            />
                          </svg>
                          Deleting…
                        </>
                      ) : (
                        <>
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2.5}
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                          Yes, delete
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* ── Normal row ── */
                <div className="relative">
                  <Link
                    to={`/analysis/${analysis._id}`}
                    className="flex items-center gap-4 px-6 py-5 hover:bg-slate-50 transition-all duration-200 border-l-2 border-transparent hover:border-blue-500 pr-14"
                  >
                    <div className="shrink-0 transition-transform duration-300 group-hover:scale-105">
                      <BidScoreGauge
                        score={analysis.result.bid_score}
                        size={56}
                        strokeWidth={5}
                        showLabel={false}
                        animate={false}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                        {analysis.job.title}
                      </p>
                      <p className="text-xs text-slate-400 group-hover:text-slate-500 mt-1 capitalize transition-colors">
                        {analysis.job.platform} · ${analysis.result.bid_min}–$
                        {analysis.result.bid_max} ·{' '}
                        {new Date(analysis.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                      <span
                        className={`text-[10px] font-black px-2.5 py-1 rounded-lg flex items-center gap-1.5 uppercase tracking-wider shadow-sm ${WIN_STYLE(analysis.result.win_probability)}`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                        {analysis.result.win_probability}
                      </span>
                      {analysis.outcome?.did_bid && (
                        <span
                          className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider shadow-sm ${OUTCOME_STYLE(analysis.outcome.did_win)}`}
                        >
                          {analysis.outcome.did_win === true
                            ? 'Won'
                            : analysis.outcome.did_win === false
                              ? 'Lost'
                              : 'Bid sent'}
                        </span>
                      )}
                      <svg
                        className="w-5 h-5 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all duration-300"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2.5}
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                  {/* Trash icon — visible on row hover */}
                  <button
                    onClick={(e) => handleDelete(e, analysis._id)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500"
                    title="Delete analysis"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
