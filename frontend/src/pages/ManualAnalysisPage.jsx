import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { analysisApi } from '../services/api';

const PLATFORMS = [
  { value: 'upwork', label: 'Upwork', desc: 'Bid score + cover letter' },
  { value: 'linkedin', label: 'LinkedIn', desc: 'CV match analysis' },
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
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Analyze a Job</h1>
          <p className="mt-1 text-sm text-slate-500">
            Paste any job description to get an instant AI analysis — no browser extension needed.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Platform selector */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3">
              Platform
            </label>
            <div className="flex gap-3">
              {PLATFORMS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPlatform(p.value)}
                  className={[
                    'flex-1 py-3 px-4 rounded-xl border text-sm font-bold transition-all text-left',
                    platform === p.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-300 shadow-sm'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700',
                  ].join(' ')}
                >
                  <div>{p.label}</div>
                  <div className="text-[11px] font-medium mt-0.5 opacity-75">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Job details */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest">
              Job Details
            </label>

            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Job Title <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                placeholder="e.g. Senior React Developer"
                className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50 hover:bg-white focus:bg-white transition-all text-slate-900 placeholder-slate-400"
              />
            </div>

            {/* Company — LinkedIn only */}
            {platform === 'linkedin' && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Company <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  maxLength={120}
                  placeholder="e.g. Acme Corp"
                  className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50 hover:bg-white focus:bg-white transition-all text-slate-900 placeholder-slate-400"
                />
              </div>
            )}

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Job Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={15000}
                rows={10}
                placeholder="Paste the full job description here… (minimum 50 characters)"
                className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50 hover:bg-white focus:bg-white transition-all text-slate-900 placeholder-slate-400 resize-y leading-relaxed"
              />
              <div className="flex justify-between items-center mt-1.5">
                <div className="text-xs text-slate-400">Minimum 50 characters</div>
                <div
                  className={`text-xs font-medium ${description.length < 50 ? 'text-slate-400' : 'text-green-600'}`}
                >
                  {description.length} / 15000
                </div>
              </div>
            </div>

            {/* Skills */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Skills{' '}
                <span className="text-slate-400 font-normal">(optional, comma-separated)</span>
              </label>
              <input
                type="text"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="e.g. React, TypeScript, Node.js"
                className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50 hover:bg-white focus:bg-white transition-all text-slate-900 placeholder-slate-400"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 font-medium">
              {error}
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-center">
            <button
              type="submit"
              disabled={loading || description.trim().length < 50}
              className="w-fit py-4 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-sm tracking-tight shadow-lg hover:shadow-xl hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2.5"
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
    </div>
  );
}
