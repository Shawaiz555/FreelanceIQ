import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { analysisApi } from '../services/api';

const PLATFORMS = [
  {
    value: 'upwork',
    label: 'Upwork',
    desc: 'Bid score + AI cover letter',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.561 13.158c-1.102 0-2.135-.467-3.074-1.227l.228-1.076.008-.042c.207-1.143.849-3.06 2.839-3.06 1.492 0 2.703 1.212 2.703 2.703-.001 1.489-1.212 2.702-2.704 2.702zm0-8.14c-2.539 0-4.51 1.649-5.31 4.366-1.22-1.834-2.148-4.036-2.687-5.892H7.828v7.112c-.002 1.406-1.141 2.546-2.547 2.546-1.405 0-2.543-1.14-2.543-2.546V3.492H0v7.112c0 2.914 2.37 5.303 5.281 5.303 2.913 0 5.283-2.389 5.283-5.303v-1.19c.529 1.107 1.182 2.229 1.974 3.221l-1.673 7.873h2.797l1.213-5.71c1.063.679 2.285 1.109 3.686 1.109 3 0 5.439-2.452 5.439-5.45 0-3-2.439-5.439-5.439-5.439z" />
      </svg>
    ),
    color: '#14a800',
    bg: '#f0fdf4',
    border: '#86efac',
    ring: '#22c55e',
  },
  {
    value: 'linkedin',
    label: 'LinkedIn',
    desc: 'CV match + job fit analysis',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
    color: '#0077b5',
    bg: '#eff6ff',
    border: '#93c5fd',
    ring: '#3b82f6',
  },
];

export default function ManualAnalysisPage() {
  const navigate = useNavigate();

  const [platform, setPlatform] = useState('upwork');
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [description, setDescription] = useState('');
  const [skills, setSkills] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const activePlatform = PLATFORMS.find((p) => p.value === platform);
  const descLen = description.trim().length;
  const isValid = descLen >= 50;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const desc = description.trim();
    if (desc.length < 50) {
      setError('Job description must be at least 50 characters.');
      return;
    }

    const jobData = {
      platform,
      title: title.trim() || 'Manual Entry',
      description: desc,
      url: '',
      budget_min: 0,
      budget_max: 0,
      skills_required: skills
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
      ...(platform === 'linkedin' && company.trim() ? { company: company.trim() } : {}),
    };

    setLoading(true);
    try {
      const res = await analysisApi.create(jobData);
      if (res?.success && res?.data?._id) {
        navigate(`/analysis/${res.data._id}`);
      } else {
        setError(res?.error || 'Analysis failed. Please try again.');
      }
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Analyze a Job</h1>
        <p className="mt-1 text-sm text-slate-500">
          Paste any job description for an instant AI score — no extension needed.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* ── Platform selector ── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-3">
            Platform
          </p>
          <div className="grid grid-cols-2 gap-3">
            {PLATFORMS.map((p) => {
              const isActive = platform === p.value;
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPlatform(p.value)}
                  className="relative flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all duration-200"
                  style={{
                    borderColor: isActive ? p.ring : '#e2e8f0',
                    background: isActive ? p.bg : '#fff',
                    boxShadow: isActive ? `0 0 0 3px ${p.ring}20` : 'none',
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                    style={{
                      background: isActive ? p.bg : '#f8fafc',
                      color: isActive ? p.color : '#94a3b8',
                      border: `1px solid ${isActive ? p.border : '#e2e8f0'}`,
                    }}
                  >
                    {p.icon}
                  </div>
                  <div>
                    <p
                      className="text-sm font-bold"
                      style={{ color: isActive ? p.color : '#1e293b' }}
                    >
                      {p.label}
                    </p>
                    <p
                      className="text-[11px] mt-0.5"
                      style={{ color: isActive ? p.color + 'aa' : '#94a3b8' }}
                    >
                      {p.desc}
                    </p>
                  </div>
                  {isActive && (
                    <div
                      className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: p.ring }}
                    >
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Job details ── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
            Job Details
          </p>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              Job Title <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              placeholder="e.g. Senior React Developer"
              className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent bg-slate-50 hover:bg-white focus:bg-white transition-all text-slate-900 placeholder-slate-400"
              style={{ '--tw-ring-color': activePlatform.ring }}
            />
          </div>

          {/* Company — LinkedIn only */}
          {platform === 'linkedin' && (
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                Company <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                maxLength={120}
                placeholder="e.g. Acme Corp"
                className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent bg-slate-50 hover:bg-white focus:bg-white transition-all text-slate-900 placeholder-slate-400"
              />
            </div>
          )}

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-600">
                Job Description <span className="text-red-500">*</span>
              </label>
              <span
                className={`text-xs font-semibold transition-colors ${!isValid ? 'text-slate-400' : 'text-emerald-600'}`}
              >
                {description.length} / 15000
              </span>
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={15000}
              rows={10}
              placeholder="Paste the full job description here… (minimum 50 characters)"
              className="w-full px-4 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:border-transparent bg-slate-50 hover:bg-white focus:bg-white transition-all text-slate-900 placeholder-slate-400 resize-y leading-relaxed"
              style={{
                borderColor: description.length > 0 && !isValid ? '#fca5a5' : '#e2e8f0',
              }}
            />
            {description.length > 0 && !isValid && (
              <p className="text-xs text-red-500 mt-1 font-medium">
                {50 - descLen} more characters needed
              </p>
            )}
            {isValid && (
              <p className="text-xs text-emerald-600 mt-1 font-medium flex items-center gap-1">
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Ready to analyze
              </p>
            )}
          </div>

          {/* Skills */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              Skills{' '}
              <span className="text-slate-400 font-normal">(optional · comma-separated)</span>
            </label>
            <input
              type="text"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="e.g. React, TypeScript, Node.js"
              className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent bg-slate-50 hover:bg-white focus:bg-white transition-all text-slate-900 placeholder-slate-400"
            />
            {skills.trim() && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {skills
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .map((s) => (
                    <span
                      key={s}
                      className="text-[11px] font-medium px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 border border-slate-200"
                    >
                      {s}
                    </span>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <svg
              className="w-4 h-4 text-red-500 shrink-0 mt-0.5"
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
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        )}

        {/* ── Submit ── */}
        <div className="flex justify-center items-center">
          <button
            type="submit"
            disabled={loading || !isValid}
            className="w-fit py-4 px-10 rounded-2xl text-white font-black text-sm tracking-tight transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5"
            style={{
              background:
                loading || !isValid
                  ? '#94a3b8'
                  : `linear-gradient(135deg, ${activePlatform.ring}, ${activePlatform.color})`,
              boxShadow: isValid && !loading ? `0 8px 24px -6px ${activePlatform.ring}80` : 'none',
            }}
          >
            {loading ? (
              <>
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
                {platform === 'linkedin' ? 'Matching CV to job…' : 'Scoring this job…'}
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
                    clipRule="evenodd"
                  />
                </svg>
                Analyze Now
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
