import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { updateUser } from '../store/slices/authSlice';
import { userApi } from '../services/api';

// Only Upwork and LinkedIn are supported
const FREELANCE_PLATFORMS = ['Upwork', 'LinkedIn'];

const ROLE_SKILLS = {
  'Web Developer': [
    'HTML',
    'CSS',
    'JavaScript',
    'TypeScript',
    'React',
    'Vue.js',
    'Angular',
    'Node.js',
    'PHP',
    'WordPress',
    'Laravel',
    'MySQL',
    'MongoDB',
    'REST APIs',
    'Git',
  ],
  'React Developer': [
    'React',
    'TypeScript',
    'JavaScript',
    'Next.js',
    'Redux',
    'React Query',
    'Tailwind CSS',
    'Node.js',
    'GraphQL',
    'REST APIs',
    'Git',
    'Vite',
    'Jest',
    'Storybook',
  ],
  'Full Stack Developer': [
    'React',
    'Node.js',
    'TypeScript',
    'Next.js',
    'PostgreSQL',
    'MongoDB',
    'REST APIs',
    'GraphQL',
    'Docker',
    'AWS',
    'Redis',
    'Git',
    'CI/CD',
    'Prisma',
  ],
  'UI/UX Designer': [
    'Figma',
    'Adobe XD',
    'Sketch',
    'Prototyping',
    'Wireframing',
    'User Research',
    'Usability Testing',
    'Design Systems',
    'Framer',
    'Illustrator',
    'Photoshop',
    'CSS',
  ],
  'Mobile Developer': [
    'React Native',
    'Flutter',
    'Swift',
    'Kotlin',
    'iOS',
    'Android',
    'Expo',
    'Firebase',
    'REST APIs',
    'TypeScript',
    'App Store Deployment',
    'Git',
  ],
  'Data Scientist': [
    'Python',
    'Machine Learning',
    'TensorFlow',
    'PyTorch',
    'Pandas',
    'NumPy',
    'SQL',
    'Data Visualization',
    'Scikit-learn',
    'Jupyter',
    'Statistics',
    'NLP',
    'LLMs',
  ],
  'DevOps Engineer': [
    'Docker',
    'Kubernetes',
    'AWS',
    'GCP',
    'Azure',
    'Terraform',
    'CI/CD',
    'Linux',
    'Bash',
    'Jenkins',
    'GitHub Actions',
    'Ansible',
    'Monitoring',
    'Nginx',
  ],
  'Content Writer': [
    'SEO Writing',
    'Copywriting',
    'Blog Writing',
    'Technical Writing',
    'Ghostwriting',
    'Email Marketing',
    'Social Media',
    'Research',
    'Editing',
    'WordPress',
    'Grammarly',
  ],
  'Video Editor': [
    'Premiere Pro',
    'After Effects',
    'Final Cut Pro',
    'DaVinci Resolve',
    'Motion Graphics',
    'Color Grading',
    'Sound Design',
    'YouTube Editing',
    'Short-form Video',
    'Capcut',
    'Subtitles',
  ],
  Other: [
    'Communication',
    'Project Management',
    'Trello',
    'Notion',
    'Slack',
    'Google Workspace',
    'Excel',
    'Data Entry',
    'Customer Support',
    'Research',
  ],
};

const MARKET_RATES = {
  'Web Developer': { min: 15, max: 75, median: 35 },
  'React Developer': { min: 25, max: 100, median: 55 },
  'Full Stack Developer': { min: 20, max: 90, median: 45 },
  'UI/UX Designer': { min: 15, max: 80, median: 40 },
  'Mobile Developer': { min: 25, max: 100, median: 55 },
  'Data Scientist': { min: 30, max: 120, median: 65 },
  'DevOps Engineer': { min: 35, max: 120, median: 70 },
  'Content Writer': { min: 10, max: 50, median: 25 },
  'Video Editor': { min: 15, max: 60, median: 30 },
  Other: { min: 10, max: 100, median: 30 },
};

export default function OnboardingPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (!user) navigate('/login', { replace: true });
  }, [user, navigate]);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    platform: '',
    skills: [],
    skillInput: '',
    hourly_rate_usd: 25,
  });

  const marketRate = MARKET_RATES[form.title] || MARKET_RATES['Other'];
  const suggestedSkills = ROLE_SKILLS[form.title] || ROLE_SKILLS['Other'];

  const handleSkillAdd = (skill) => {
    if (!form.skills.includes(skill)) {
      setForm((prev) => ({ ...prev, skills: [...prev.skills, skill] }));
    }
  };

  const handleSkillRemove = (skill) => {
    setForm((prev) => ({ ...prev, skills: prev.skills.filter((s) => s !== skill) }));
  };

  const handleSkillInputKeyDown = (e) => {
    if ((e.key === 'Enter' || e.key === ',') && form.skillInput.trim()) {
      e.preventDefault();
      handleSkillAdd(form.skillInput.trim());
      setForm((prev) => ({ ...prev, skillInput: '' }));
    }
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      const updates = {
        profile: {
          ...user?.profile,
          title: form.title,
          skills: form.skills,
          hourly_rate_usd: form.hourly_rate_usd,
        },
      };
      const res = await userApi.updateProfile(updates);
      dispatch(updateUser(res.data));
      navigate('/dashboard', { replace: true });
    } catch {
      navigate('/dashboard', { replace: true });
    }
  };

  const steps = [
    { number: 1, label: 'Your role' },
    { number: 2, label: 'Your skills' },
    { number: 3, label: 'Your rate' },
  ];

  return (
    <div className="relative min-h-screen hero-gradient-bg flex items-start justify-center pt-10 sm:pt-16 pb-10 px-4 overflow-y-auto overflow-x-hidden">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-64 sm:w-80 h-64 sm:h-80 bg-blue-600/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 -right-32 w-64 sm:w-80 h-64 sm:h-80 bg-indigo-600/20 rounded-full blur-3xl animate-float-slow" />
      </div>

      <div className="relative w-full max-w-lg animate-fade-in-up">
        {/* Logo + heading */}
        <div className="flex flex-col items-center mb-5 sm:mb-7">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/40">
              <svg
                className="w-5 h-5 sm:w-6 sm:h-6 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Freelance<span className="text-blue-400">IQ</span>
            </h2>
          </div>
          <p className="text-slate-400 text-xs sm:text-sm font-medium text-center px-2">
            Quick setup — personalise your experience in 60 seconds
          </p>
        </div>

        {/* Progress steps */}
        <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-5 sm:mb-7">
          {steps.map((s, i) => (
            <React.Fragment key={s.number}>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold transition-all duration-300 ${
                    step > s.number
                      ? 'bg-emerald-500 text-white'
                      : step === s.number
                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/40'
                        : 'bg-white/10 text-slate-400 border border-white/10'
                  }`}
                >
                  {step > s.number ? (
                    <svg
                      className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    s.number
                  )}
                </div>
                <span
                  className={`text-xs sm:text-sm font-medium ${
                    step !== s.number ? 'hidden sm:inline' : ''
                  } ${step === s.number ? 'text-white' : 'text-slate-500'}`}
                >
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`h-px w-5 sm:w-8 transition-colors duration-300 ${step > s.number ? 'bg-emerald-500/50' : 'bg-white/10'}`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl sm:rounded-[2.5rem] shadow-2xl shadow-black/40 p-5 sm:p-7 border border-white/20">
          {/* ── Step 1: Role + Platform ── */}
          {step === 1 && (
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-1">
                What do you do?
              </h2>
              <p className="text-slate-500 text-xs sm:text-sm mb-5 sm:mb-6">
                We'll use this to calibrate market rates for your niche on Upwork.
              </p>

              <div className="space-y-5">
                {/* Job title */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] ml-1 mb-1.5">
                    Job title / role <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={form.title}
                    onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                    className="w-full px-4 py-3.5 text-sm border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50/50 hover:bg-white focus:bg-white transition-all text-slate-900"
                  >
                    <option value="">Select your role</option>
                    {Object.keys(MARKET_RATES).map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Platform */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] ml-1 mb-1.5">
                    Primary platform
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {FREELANCE_PLATFORMS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, platform: p }))}
                        className={`px-4 py-3 text-sm font-semibold rounded-2xl border-2 transition-all ${
                          form.platform === p
                            ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                            : 'border-slate-200 text-slate-600 hover:border-slate-300 bg-slate-50/50 hover:bg-white'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={!form.title}
                className="w-full mt-5 sm:mt-6 py-3.5 sm:py-4 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-black rounded-2xl transition-all shadow-xl shadow-blue-500/30 flex items-center justify-center gap-2 group active:scale-[0.98]"
              >
                Continue
                <svg
                  className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          )}

          {/* ── Step 2: Skills ── */}
          {step === 2 && (
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-1">Your skills</h2>
              <p className="text-slate-500 text-xs sm:text-sm mb-5 sm:mb-6">
                Add skills that match what you offer — we'll use these to personalise your
                proposals.
              </p>

              <div className="space-y-5">
                {/* Tag input */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] ml-1 mb-1.5">
                    Add a skill <span className="text-slate-300">(Enter or comma to add)</span>
                  </label>
                  <input
                    type="text"
                    value={form.skillInput}
                    onChange={(e) => setForm((prev) => ({ ...prev, skillInput: e.target.value }))}
                    onKeyDown={handleSkillInputKeyDown}
                    placeholder="e.g. React, Node.js..."
                    className="w-full px-4 py-3.5 text-sm border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50/50 hover:bg-white focus:bg-white transition-all text-slate-900 placeholder-slate-400"
                  />
                </div>

                {/* Selected skill badges */}
                {form.skills.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {form.skills.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center gap-1.5 bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-blue-200"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => handleSkillRemove(skill)}
                          className="hover:text-blue-900 text-blue-500 transition-colors leading-none"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Role-specific skill suggestions */}
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-2">
                    Suggested for {form.title} — click to add
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestedSkills
                      .filter((s) => !form.skills.includes(s))
                      .map((skill) => (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => handleSkillAdd(skill)}
                          className="px-3 py-1 text-xs border border-slate-200 text-slate-600 rounded-full hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all bg-slate-50"
                        >
                          + {skill}
                        </button>
                      ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col lg:flex-row gap-2.5 sm:gap-3 mt-5 sm:mt-6">
                <button
                  onClick={() => setStep(1)}
                  className="w-full px-4 sm:px-5 py-3.5 sm:py-4 text-sm font-bold text-slate-600 border-2 border-slate-200 rounded-2xl hover:border-slate-300 hover:bg-slate-50 transition-all"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={form.skills.length === 0}
                  className="w-full py-3.5 sm:py-4 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-black rounded-2xl transition-all shadow-xl shadow-blue-500/30 flex items-center justify-center gap-2 group active:scale-[0.98]"
                >
                  Continue
                  <svg
                    className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Hourly rate ── */}
          {step === 3 && (
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-1">
                Your hourly rate
              </h2>
              <p className="text-slate-500 text-xs sm:text-sm mb-5 sm:mb-6">
                Set the rate you want to charge. We'll benchmark this against Upwork market data.
              </p>

              {/* Market range info */}
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3 sm:p-4 mb-5 sm:mb-6">
                <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest mb-2">
                  Market range for {form.title}
                </p>
                <div className="flex items-center justify-between text-sm">
                  <div className="text-center">
                    <p className="text-slate-400 text-[10px] mb-0.5">Min</p>
                    <p className="font-bold text-slate-700">${marketRate.min}/hr</p>
                  </div>
                  <div className="text-center">
                    <p className="text-blue-500 text-[10px] mb-0.5">Median</p>
                    <p className="font-black text-blue-700 text-base">${marketRate.median}/hr</p>
                  </div>
                  <div className="text-center">
                    <p className="text-slate-400 text-[10px] mb-0.5">Max</p>
                    <p className="font-bold text-slate-700">${marketRate.max}/hr</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em]">
                      Your target rate
                    </label>
                    <span className="text-2xl font-black text-slate-900">
                      ${form.hourly_rate_usd}
                      <span className="text-sm font-semibold text-slate-400">/hr</span>
                    </span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={150}
                    step={5}
                    value={form.hourly_rate_usd}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, hourly_rate_usd: Number(e.target.value) }))
                    }
                    className="w-full accent-blue-600 h-2"
                  />
                  <div className="flex justify-between text-xs text-slate-400 mt-1.5 font-medium">
                    <span>$5/hr</span>
                    <span>$150/hr</span>
                  </div>
                </div>

                {form.hourly_rate_usd < marketRate.median && (
                  <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
                    <svg
                      className="h-4 w-4 text-amber-500 shrink-0 mt-0.5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <p className="text-xs text-amber-700 leading-relaxed">
                      You're below the market median of <strong>${marketRate.median}/hr</strong>.
                      FreelanceIQ will help you know when and how to negotiate upwards.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex flex-col lg:flex-row gap-2.5 sm:gap-3 mt-5 sm:mt-6">
                <button
                  onClick={() => setStep(2)}
                  className="w-full px-4 sm:px-5 py-3.5 sm:py-4 text-sm font-bold text-slate-600 border-2 border-slate-200 rounded-2xl hover:border-slate-300 hover:bg-slate-50 transition-all"
                >
                  Back
                </button>
                <button
                  onClick={handleFinish}
                  disabled={loading}
                  className="w-full py-3.5 sm:py-4 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-60 text-white text-sm font-black rounded-2xl transition-all shadow-xl shadow-blue-500/30 flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  {loading ? (
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
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
                    <>Go to dashboard</>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-500 mt-5 font-medium">
          You can update all of this later in{' '}
          <span className="text-slate-400">Profile Settings</span>.
        </p>
      </div>
    </div>
  );
}
