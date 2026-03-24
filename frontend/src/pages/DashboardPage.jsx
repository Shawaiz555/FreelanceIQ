import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import BidScoreGauge from '../components/ui/BidScoreGauge';
import { SkeletonCard } from '../components/ui/Skeleton';
import { analyticsApi, analysisApi } from '../services/api';

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon, gradient, hoverTextClass }) {
  return (
    <div className="relative bg-white rounded-[1.5rem] border border-slate-200/60 p-6 overflow-hidden group hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300">
      <div
        className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-gradient-to-br ${gradient || 'from-blue-50/50 to-indigo-50/50'}`}
      />
      <div className="relative flex items-center gap-5">
        {icon && (
          <div
            className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient || 'from-blue-500 to-indigo-600'} flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/10 group-hover:scale-110 transition-transform duration-500`}
          >
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p
            className={`text-[10px] font-black text-slate-400 ${hoverTextClass || 'group-hover:text-slate-500'} uppercase tracking-[0.15em] transition-colors duration-300`}
          >
            {label}
          </p>
          <p
            className={`text-2xl font-black text-slate-900 mt-0.5 tracking-tight transition-colors duration-300 ${hoverTextClass || 'group-hover:text-slate-900'}`}
          >
            {value}
          </p>
          {sub && (
            <p
              className={`text-xs text-slate-400 ${hoverTextClass || 'group-hover:text-slate-500'} mt-1 transition-colors duration-300`}
            >
              {sub}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Quick Bid Widget ─────────────────────────────────────────────────────────

function QuickBidWidget() {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');

  const isValidUrl = (val) => {
    try {
      new URL(val);
      return true;
    } catch {
      return false;
    }
  };

  const handleAnalyze = async () => {
    if (!url.trim()) {
      setError('Paste a job URL to analyse.');
      return;
    }
    if (!isValidUrl(url.trim())) {
      setError('Enter a valid URL (e.g. https://www.upwork.com/jobs/...)');
      return;
    }
    setError('');
    setAnalyzing(true);
    try {
      const res = await analysisApi.create({ url: url.trim() });
      navigate(`/analysis/${res.data._id}`);
    } catch {
      setError('Analysis failed. Please try again.');
      setAnalyzing(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter') handleAnalyze();
  };

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-6 py-8 text-white"
      style={{
        background: 'linear-gradient(135deg, #1e3a8a 0%, #312e81 50%, #1e1b4b 100%)',
      }}
    >
      <div className="absolute inset-0 dot-grid-overlay opacity-20" />
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl" />
      <div className="relative">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center">
            <svg className="h-3.5 w-3.5 text-blue-200" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h3 className="font-bold text-sm sm:text-md md:text-xl tracking-tight">Quick Analyze</h3>
          <span className="flex items-center gap-1 text-xs text-blue-200 ml-auto">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            AI Ready
          </span>
        </div>
        <p className="text-blue-200 text-xs mb-4 leading-relaxed">
          Paste any Upwork, Fiverr, or Freelancer job URL for an instant AI bid score.
        </p>
        <div className="flex gap-2">
          <input
            type="url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (error) setError('');
            }}
            onKeyDown={handleKey}
            placeholder="https://www.upwork.com/jobs/~..."
            className="flex-1 min-w-0 px-3.5 py-2.5 text-sm rounded-xl bg-white/12 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white focus:bg-white focus:text-black transition-all"
          />
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={analyzing}
            className="shrink-0 px-5 py-2.5 text-sm font-bold rounded-xl bg-white text-blue-700 hover:bg-blue-50 disabled:opacity-60 transition-all shadow-lg flex items-center gap-1.5"
          >
            {analyzing ? (
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
            ) : (
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            )}
            {analyzing ? 'Analyzing…' : 'Analyze'}
          </button>
        </div>
        {error && <p className="text-red-300 text-xs mt-2">{error}</p>}
        {analyzing && (
          <p className="text-blue-200 text-xs mt-2 animate-pulse">
            AI is scoring this job — usually takes a few seconds…
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function DashboardEmptyState({ userName }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center w-full">
      <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-indigo-100 border border-blue-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <svg
          className="h-9 w-9 text-blue-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      </div>
      <h3 className="text-xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-2">
        Welcome, {userName}!
      </h3>
      <p className="text-slate-500 max-w-sm mb-1 text-sm leading-relaxed">
        You haven't analyzed any jobs yet. Paste a job URL above to get your first AI bid score.
      </p>
      <p className="text-sm text-blue-600 font-semibold mt-1">
        Use the Chrome extension on any job page for instant scoring
      </p>
      <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-5 w-full text-left">
        {[
          {
            step: '1',
            title: 'Paste a job URL',
            desc: 'Use the quick-analyze widget above or the Chrome extension.',
            color: 'from-blue-500 to-blue-700',
          },
          {
            step: '2',
            title: 'Get your AI score',
            desc: 'FreelanceIQ scores 0–100 and explains the full reasoning.',
            color: 'from-indigo-500 to-purple-600',
          },
          {
            step: '3',
            title: 'Win more projects',
            desc: 'Use the AI cover letter and bid range to craft a winning proposal.',
            color: 'from-emerald-500 to-teal-600',
          },
        ].map(({ step, title, desc, color }) => (
          <div
            key={step}
            className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-md hover:border-blue-200 transition-all duration-200"
          >
            <div
              className={`w-8 h-8 rounded-xl bg-gradient-to-br ${color} text-white text-xs font-bold flex items-center justify-center mb-3 shadow-md`}
            >
              {step}
            </div>
            <p className="text-sm font-semibold text-slate-900 mb-1">{title}</p>
            <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const user = useSelector((state) => state.auth.user);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsApi
      .getDashboard()
      .then((res) => {
        setData(res.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const analysesLeft =
    user?.subscription?.tier === 'free'
      ? Math.max(0, 5 - (user?.usage?.analyses_this_month ?? 0))
      : null;

  const firstName = user?.name?.split(' ')[0] || 'there';
  const totalAnalyses = user?.usage?.total_analyses ?? data?.total_analyses ?? 0;
  const hasAnalyses = !loading && totalAnalyses > 0;
  const isNewUser = !loading && totalAnalyses === 0;

  const WIN_STYLE = (p) =>
    p === 'High'
      ? 'bg-emerald-100 text-emerald-700'
      : p === 'Medium'
        ? 'bg-amber-100 text-amber-700'
        : 'bg-red-100 text-red-700';

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      {(loading || hasAnalyses) && (
        <div className="flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row">
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
              Welcome back, {firstName} 👋
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {analysesLeft != null
                ? `${analysesLeft} free ${analysesLeft === 1 ? 'analysis' : 'analyses'} remaining this month`
                : 'Unlimited analyses on your plan'}
            </p>
          </div>
          {analysesLeft === 0 && (
            <Link to="/billing">
              <button className="flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 transition-all shadow-lg shadow-blue-500/20">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
                    clipRule="evenodd"
                  />
                </svg>
                Upgrade to Pro
              </button>
            </Link>
          )}
        </div>
      )}

      {/* Quick analyse widget */}
      <QuickBidWidget />

      {/* New user empty state */}
      {isNewUser && <DashboardEmptyState userName={firstName} />}

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} className="h-24" />
          ))}
        </div>
      ) : hasAnalyses ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Analyzes this week"
            value={data.analyses_this_week}
            sub={`${totalAnalyses} total`}
            gradient="from-blue-500 to-blue-700"
            hoverTextClass="group-hover:text-blue-600"
            icon={
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            }
          />
          <StatCard
            label="Avg bid score"
            value={`${data.avg_bid_score}/100`}
            gradient="from-violet-500 to-purple-600"
            hoverTextClass="group-hover:text-violet-600"
            icon={
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            }
          />
          <StatCard
            label="Win rate"
            value={`${Math.round((data.win_rate ?? 0) * 100)}%`}
            sub="of bids sent"
            gradient="from-emerald-500 to-teal-600"
            hoverTextClass="group-hover:text-emerald-600"
            icon={
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
          />
        </div>
      ) : null}

      {/* Recent analyses */}
      {(loading || hasAnalyses) && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Recent analyzes</h3>
              <p className="text-xs text-slate-400 mt-0.5">Your last job analyzes</p>
            </div>
            <Link
              to="/analysis/history"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              View all →
            </Link>
          </div>

          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.recent_analyses.map((analysis) => (
                <Link
                  key={analysis._id}
                  to={`/analysis/${analysis._id}`}
                  className="flex items-center gap-4 px-6 py-5 hover:bg-slate-50 transition-all duration-200 group border-l-2 border-transparent hover:border-blue-500"
                >
                  <div className="shrink-0 transition-transform duration-300 group-hover:scale-105">
                    <BidScoreGauge
                      score={analysis.result.bid_score}
                      size={54}
                      strokeWidth={5}
                      showLabel={false}
                      animate={false}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate transition-colors">
                      {analysis.job.title}
                    </p>
                    <p className="text-xs text-slate-400 group-hover:text-slate-900 mt-1 capitalize transition-colors">
                      {analysis.job.platform} · ${analysis.result.bid_min}–$
                      {analysis.result.bid_max} ·{' '}
                      {new Date(analysis.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <span
                      className={`text-[10px] font-black px-2.5 py-1 rounded-lg flex items-center gap-1.5 uppercase tracking-wider shadow-sm ${WIN_STYLE(analysis.result.win_probability)}`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                      {analysis.result.win_probability}
                    </span>
                    <svg
                      className="w-5 h-5 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all duration-300"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
