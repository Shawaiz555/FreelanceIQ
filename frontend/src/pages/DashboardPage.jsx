import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import BidScoreGauge from '../components/ui/BidScoreGauge';
import { SkeletonCard } from '../components/ui/Skeleton';
import { analyticsApi } from '../services/api';

// ─── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ data = [], color = '#6366f1' }) {
  if (!data || data.length < 2) return null;
  const W = 72, H = 28;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((v - min) / range) * (H - 4) - 2;
    return [x, y];
  });
  const last = data[data.length - 1];
  const isUp = last >= data[0];
  const lineColor = isUp ? '#10b981' : '#f43f5e';
  const line = `M ${pts.map((p) => p.join(',')).join(' L ')}`;
  const area = `${line} L ${W},${H} L 0,${H} Z`;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
      <defs>
        <linearGradient id={`sg-${lineColor.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity="0.2" />
          <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sg-${lineColor.replace('#','')})`} />
      <path d={line} fill="none" stroke={lineColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={3} fill={lineColor} />
    </svg>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon, accentBg, accentText, accentShadow, trend }) {
  return (
    <div
      className="relative bg-white rounded-2xl p-5 overflow-hidden group cursor-default transition-all duration-300 hover:-translate-y-1"
      style={{
        border: '1px solid #e8eaf0',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 12px 40px -8px ${accentShadow}, 0 1px 4px rgba(0,0,0,0.04)`; e.currentTarget.style.borderColor = `${accentShadow}60`; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; e.currentTarget.style.borderColor = '#e8eaf0'; }}
    >
      {/* Top accent line */}
      <div className="absolute top-0 left-6 right-6 h-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: `linear-gradient(90deg, transparent, ${accentShadow}, transparent)` }} />

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3.5 flex-1 min-w-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110"
            style={{ background: accentBg, boxShadow: `0 4px 12px -2px ${accentShadow}` }}
          >
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">{label}</p>
            <p className="text-[1.6rem] font-black text-slate-900 mt-0.5 tracking-tight leading-none" style={{ color: accentText }}>{value}</p>
            {sub && <p className="text-[11px] text-slate-400 mt-1.5 font-medium">{sub}</p>}
          </div>
        </div>
        {trend && trend.length >= 2 && (
          <div className="shrink-0 self-end pb-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
            <Sparkline data={trend} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function DashboardEmptyState({ userName }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center w-full">
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
        style={{
          background: 'linear-gradient(135deg, #eef2ff, #ede9fe)',
          border: '1px solid #c7d2fe',
          boxShadow: '0 8px 24px -8px rgba(99,102,241,0.3)',
        }}
      >
        <svg className="h-9 w-9 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      </div>

      <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2 tracking-tight">
        Welcome, {userName}!
      </h3>
      <p className="text-slate-500 max-w-sm mb-1 text-sm leading-relaxed">
        You haven't analyzed any jobs yet. Use the Chrome extension on any Upwork or LinkedIn job page to get started.
      </p>
      <p className="text-sm font-bold mt-1" style={{ color: '#6366f1' }}>
        Use the Chrome extension on any job page for instant scoring
      </p>

      <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full text-left">
        {[
          { step: '1', title: 'Paste a job URL', desc: 'Use the Chrome extension on any Upwork or LinkedIn job page.', bg: 'linear-gradient(135deg,#6366f1,#818cf8)', shadow: 'rgba(99,102,241,0.35)' },
          { step: '2', title: 'Get your AI score', desc: 'FreelanceIQ scores 0–100 and explains the full reasoning.', bg: 'linear-gradient(135deg,#8b5cf6,#a78bfa)', shadow: 'rgba(139,92,246,0.35)' },
          { step: '3', title: 'Win more projects', desc: 'Use the AI cover letter and bid range to craft a winning proposal.', bg: 'linear-gradient(135deg,#10b981,#34d399)', shadow: 'rgba(16,185,129,0.35)' },
        ].map(({ step, title, desc, bg, shadow }) => (
          <div
            key={step}
            className="bg-white rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1"
            style={{ border: '1px solid #e8eaf0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 12px 32px -8px ${shadow}`; e.currentTarget.style.borderColor = `${shadow}80`; }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; e.currentTarget.style.borderColor = '#e8eaf0'; }}
          >
            <div
              className="w-8 h-8 rounded-xl text-white text-xs font-black flex items-center justify-center mb-3"
              style={{ background: bg, boxShadow: `0 4px 12px -4px ${shadow}` }}
            >
              {step}
            </div>
            <p className="text-sm font-bold text-slate-900 mb-1">{title}</p>
            <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Badge styles ─────────────────────────────────────────────────────────────

const WIN_STYLE_MAP = {
  High:                { bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a', dot: '#22c55e' },
  Apply:               { bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a', dot: '#22c55e' },
  Medium:              { bg: '#fefce8', border: '#fde68a', text: '#b45309', dot: '#f59e0b' },
  'Apply with caveats':{ bg: '#fefce8', border: '#fde68a', text: '#b45309', dot: '#f59e0b' },
};
const DEFAULT_WIN_STYLE = { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', dot: '#ef4444' };

function getWinStyle(p) {
  return WIN_STYLE_MAP[p] || DEFAULT_WIN_STYLE;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const user = useSelector((state) => state.auth.user);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsApi
      .getDashboard()
      .then((res) => { setData(res.data); })
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

  const getBadgeLabel = (analysis) => {
    if (analysis.analysis_type === 'job_match') return analysis.match_result?.recommended_action ?? '—';
    return analysis.result?.win_probability ?? '—';
  };

  return (
    <div className="space-y-6">

      {/* ── Welcome banner ── */}
      {(loading || hasAnalyses) && (
        <div className="flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              Welcome back,{' '}
              <span className="inline-block" style={{
                background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #3b82f6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                {firstName}
              </span>
              {' '}👋
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {analysesLeft != null
                ? `${analysesLeft} free ${analysesLeft === 1 ? 'analysis' : 'analyses'} remaining this month`
                : 'Unlimited analyses on your plan'}
            </p>
          </div>

          {analysesLeft === 0 && (
            <Link to="/billing">
              <button
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl text-white transition-all duration-300 hover:-translate-y-0.5"
                style={{
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  boxShadow: '0 4px 16px -4px rgba(99,102,241,0.5)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 8px 24px -4px rgba(99,102,241,0.65)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 4px 16px -4px rgba(99,102,241,0.5)'; }}
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                </svg>
                Upgrade to Pro
              </button>
            </Link>
          )}
        </div>
      )}

      {/* ── New user empty state ── */}
      {isNewUser && <DashboardEmptyState userName={firstName} />}

      {/* ── Stats ── */}
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
            accentBg="linear-gradient(135deg, #6366f1, #818cf8)"
            accentText="#4f46e5"
            accentShadow="rgba(99,102,241,0.45)"
            trend={data.score_trend}
            icon={
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
          />
          <StatCard
            label="Avg bid score"
            value={`${data.avg_bid_score}/100`}
            accentBg="linear-gradient(135deg, #8b5cf6, #a78bfa)"
            accentText="#7c3aed"
            accentShadow="rgba(139,92,246,0.45)"
            icon={
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
          />
          <StatCard
            label="Win rate"
            value={`${Math.round((data.win_rate ?? 0) * 100)}%`}
            sub="of bids sent"
            accentBg="linear-gradient(135deg, #10b981, #34d399)"
            accentText="#059669"
            accentShadow="rgba(16,185,129,0.45)"
            icon={
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </div>
      ) : null}

      {/* ── Recent analyses ── */}
      {(loading || hasAnalyses) && (
        <div
          className="bg-white rounded-2xl overflow-hidden"
          style={{
            border: '1px solid #e8eaf0',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Recent analyzes</h3>
              <p className="text-xs text-slate-400 mt-0.5">Your last job analyzes</p>
            </div>
            <Link
              to="/analysis/history"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-500 transition-colors"
            >
              View all →
            </Link>
          </div>

          {/* Rows */}
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.recent_analyses.map((analysis) => {
                const label = getBadgeLabel(analysis);
                const ws = getWinStyle(label);
                const score = analysis.analysis_type === 'job_match'
                  ? analysis.match_result?.match_score ?? 0
                  : analysis.result?.bid_score ?? 0;

                return (
                  <Link
                    key={analysis._id}
                    to={`/analysis/${analysis._id}`}
                    className="flex items-center gap-4 px-6 py-4 transition-all duration-200 group hover:bg-slate-50/80 border-l-2 border-transparent hover:border-indigo-500"
                  >
                    <div className="shrink-0 transition-transform duration-300 group-hover:scale-105">
                      <BidScoreGauge
                        score={score}
                        size={52}
                        strokeWidth={4.5}
                        showLabel={false}
                        animate={false}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {analysis.job.title}
                      </p>
                      <p className="text-xs text-slate-400 mt-1 capitalize">
                        {analysis.job.platform}
                        {analysis.analysis_type !== 'job_match' && ` · $${analysis.result?.bid_min}–$${analysis.result?.bid_max}`}
                        {' · '}{new Date(analysis.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="shrink-0 flex items-center gap-2.5">
                      <span
                        className="text-[10px] font-black px-2.5 py-1 rounded-lg flex items-center gap-1.5 uppercase tracking-wider"
                        style={{ background: ws.bg, border: `1px solid ${ws.border}`, color: ws.text }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: ws.dot }} />
                        {label}
                      </span>
                      <svg
                        className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all duration-300"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
