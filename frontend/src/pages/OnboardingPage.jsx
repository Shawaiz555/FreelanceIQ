import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { z } from 'zod';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { updateUser } from '../store/slices/authSlice';
import { userApi } from '../services/api';

const FREELANCE_PLATFORMS = ['Upwork', 'Fiverr', 'Freelancer.com', 'Toptal', 'PeoplePerHour', 'Other'];

const POPULAR_SKILLS = [
  'React', 'Node.js', 'Python', 'WordPress', 'PHP', 'Laravel', 'Vue.js',
  'Angular', 'TypeScript', 'MongoDB', 'PostgreSQL', 'AWS', 'Figma',
  'Flutter', 'React Native', 'Django', 'FastAPI', 'GraphQL', 'Docker', 'DevOps',
];

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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">FQ</span>
          </div>
          <span className="font-bold text-gray-900 text-lg">FreelanceIQ</span>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((s, i) => (
            <React.Fragment key={s.number}>
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                    step >= s.number
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {step > s.number ? (
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    s.number
                  )}
                </div>
                <span className={`text-sm ${step === s.number ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && <div className="flex-1 h-px bg-gray-200 max-w-8" />}
            </React.Fragment>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          {/* Step 1: Role + Platform */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">What do you do?</h2>
              <p className="text-gray-500 text-sm mb-6">
                This helps us calibrate market rates for your niche.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                    Job title / role <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.title}
                    onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Select your role</option>
                    {Object.keys(MARKET_RATES).map((role) => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                    Primary freelancing platform
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {FREELANCE_PLATFORMS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, platform: p }))}
                        className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                          form.platform === p
                            ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <Button
                fullWidth
                size="lg"
                className="mt-6"
                onClick={() => setStep(2)}
                disabled={!form.title}
              >
                Continue
              </Button>
            </div>
          )}

          {/* Step 2: Skills */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Your skills</h2>
              <p className="text-gray-500 text-sm mb-6">
                Add skills that match what you offer. These personalise your cover letters.
              </p>
              <div className="space-y-4">
                {/* Tag input */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                    Add a skill (press Enter or comma to add)
                  </label>
                  <input
                    type="text"
                    value={form.skillInput}
                    onChange={(e) => setForm((prev) => ({ ...prev, skillInput: e.target.value }))}
                    onKeyDown={handleSkillInputKeyDown}
                    placeholder="e.g. React, Node.js..."
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Selected skills */}
                {form.skills.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {form.skills.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center gap-1.5 bg-blue-100 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full"
                      >
                        {skill}
                        <button type="button" onClick={() => handleSkillRemove(skill)} className="hover:text-blue-900">
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Popular skills */}
                <div>
                  <p className="text-xs text-gray-400 mb-2">Popular skills — click to add:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {POPULAR_SKILLS.filter((s) => !form.skills.includes(s)).map((skill) => (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => handleSkillAdd(skill)}
                        className="px-2.5 py-1 text-xs border border-gray-200 text-gray-600 rounded-full hover:border-blue-300 hover:text-blue-600 transition-colors"
                      >
                        + {skill}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button variant="secondary" size="lg" onClick={() => setStep(1)}>Back</Button>
                <Button fullWidth size="lg" onClick={() => setStep(3)} disabled={form.skills.length === 0}>
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Hourly rate */}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Your hourly rate</h2>
              <p className="text-gray-500 text-sm mb-6">
                Set the rate you want to earn. We'll use this to score your bids.
              </p>

              <div className="bg-blue-50 rounded-xl p-4 mb-6">
                <p className="text-xs text-blue-600 font-semibold mb-1">Market range for {form.title}</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">${marketRate.min}/hr</span>
                  <span className="text-blue-700 font-bold">Median: ${marketRate.median}/hr</span>
                  <span className="text-gray-600">${marketRate.max}/hr</span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">Your target rate</label>
                    <span className="text-2xl font-bold text-gray-900">${form.hourly_rate_usd}/hr</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={150}
                    step={5}
                    value={form.hourly_rate_usd}
                    onChange={(e) => setForm((prev) => ({ ...prev, hourly_rate_usd: Number(e.target.value) }))}
                    className="w-full accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>$5/hr</span>
                    <span>$150/hr</span>
                  </div>
                </div>

                {form.hourly_rate_usd < marketRate.median && (
                  <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <svg className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                    <p className="text-xs text-yellow-700">
                      You're below the market median of ${marketRate.median}/hr. FreelanceIQ will help you negotiate upwards.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <Button variant="secondary" size="lg" onClick={() => setStep(2)}>Back</Button>
                <Button fullWidth size="lg" loading={loading} onClick={handleFinish}>
                  Go to dashboard
                </Button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          You can update all of this later in your profile settings.
        </p>
      </div>
    </div>
  );
}
