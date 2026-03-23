import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { z } from 'zod';
import { updateUser } from '../store/slices/authSlice';
import { addNotification } from '../store/slices/uiSlice';
import { userApi } from '../services/api';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(80),
  title: z.string().max(100, 'Title must be under 100 characters').optional().or(z.literal('')),
  hourly_rate_usd: z
    .number({ invalid_type_error: 'Enter a valid number' })
    .min(1, 'Rate must be at least $1')
    .max(500, 'Rate cannot exceed $500')
    .optional()
    .nullable(),
  experience_years: z
    .number({ invalid_type_error: 'Enter a valid number' })
    .min(0)
    .max(50)
    .optional()
    .nullable(),
  upwork_url: z.string().url('Enter a valid URL').optional().or(z.literal('')),
  fiverr_url: z.string().url('Enter a valid URL').optional().or(z.literal('')),
  bio: z.string().max(500, 'Bio must be under 500 characters').optional().or(z.literal('')),
});

// ─── Skills input ─────────────────────────────────────────────────────────────

function SkillsInput({ skills, onChange }) {
  const [input, setInput] = useState('');

  const addSkill = (raw) => {
    const skill = raw.trim();
    if (skill && !skills.includes(skill) && skills.length < 20) {
      onChange([...skills, skill]);
    }
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addSkill(input);
    } else if (e.key === 'Backspace' && !input && skills.length > 0) {
      onChange(skills.slice(0, -1));
    }
  };

  const removeSkill = (skill) => onChange(skills.filter((s) => s !== skill));

  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
        Skills
      </label>
      <div className="min-h-[46px] flex flex-wrap gap-1.5 items-center px-3 py-2 border border-slate-200 rounded-xl focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent bg-slate-50 focus-within:bg-white transition-all">
        {skills.map((skill) => (
          <span
            key={skill}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-500/10 text-blue-700 text-xs font-semibold rounded-lg"
          >
            {skill}
            <button
              type="button"
              onClick={() => removeSkill(skill)}
              className="text-blue-400 hover:text-blue-600 leading-none ml-0.5"
              aria-label={`Remove ${skill}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => input.trim() && addSkill(input)}
          placeholder={skills.length === 0 ? 'Type a skill and press Enter' : ''}
          className="flex-1 min-w-[140px] outline-none text-sm text-slate-800 bg-transparent placeholder-slate-400"
        />
      </div>
      <p className="text-xs text-slate-400 mt-1.5">Press Enter or comma to add · max 20 skills</p>
    </div>
  );
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({ label, error, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
    </div>
  );
}

const inputCls = (err) =>
  `w-full px-3.5 py-2.5 text-sm border rounded-xl bg-slate-50 focus:bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
    err ? 'border-red-400 bg-red-50' : 'border-slate-200'
  }`;

// ─── Section card ─────────────────────────────────────────────────────────────

function ProfileSection({ icon, title, gradient, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-5">
        <div
          className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm shrink-0`}
        >
          {icon}
        </div>
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      </div>
      {children}
    </div>
  );
}

// ─── Tier styles ──────────────────────────────────────────────────────────────

const TIER_GRADIENT = {
  free: 'from-slate-500 to-slate-600',
  pro: 'from-blue-500 to-indigo-600',
  agency: 'from-violet-500 to-purple-600',
};
const TIER_BADGE = {
  free: 'bg-slate-100 text-slate-600',
  pro: 'bg-blue-500/10 text-blue-600',
  agency: 'bg-violet-500/10 text-violet-600',
};

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);

  const [form, setForm] = useState({
    name: '',
    title: '',
    hourly_rate_usd: '',
    experience_years: '',
    upwork_url: '',
    fiverr_url: '',
    bio: '',
  });
  const [skills, setSkills] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        title: user.profile?.title || '',
        hourly_rate_usd: user.profile?.hourly_rate_usd ?? '',
        experience_years: user.profile?.experience_years ?? '',
        upwork_url: user.profile?.upwork_url || '',
        fiverr_url: user.profile?.fiverr_url || '',
        bio: user.profile?.bio || '',
      });
      setSkills(user.profile?.skills || []);
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const parsed = {
      ...form,
      hourly_rate_usd: form.hourly_rate_usd !== '' ? Number(form.hourly_rate_usd) : null,
      experience_years: form.experience_years !== '' ? Number(form.experience_years) : null,
    };

    const result = profileSchema.safeParse(parsed);
    if (!result.success) {
      const errors = {};
      result.error.issues.forEach((err) => {
        errors[err.path[0]] = err.message;
      });
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      const updates = {
        name: parsed.name,
        profile: {
          ...user?.profile,
          title: parsed.title,
          skills,
          hourly_rate_usd: parsed.hourly_rate_usd,
          experience_years: parsed.experience_years,
          upwork_url: parsed.upwork_url,
          fiverr_url: parsed.fiverr_url,
          bio: parsed.bio,
        },
      };
      const res = await userApi.updateProfile(updates);
      dispatch(updateUser(res.data));
      dispatch(addNotification({ type: 'success', message: 'Profile updated successfully.' }));
      setFieldErrors({});
    } catch (err) {
      const msg = err?.response?.data?.error || 'Failed to save profile. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const tier = user?.subscription?.tier || 'free';
  const bioLength = form.bio.length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">My Profile</h2>
        <p className="text-sm text-slate-400 mt-0.5">
          Keep your profile up to date so FreelanceIQ can tailor analyses to your experience.
        </p>
      </div>

      {/* Avatar / tier card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center gap-4">
        <div
          className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${TIER_GRADIENT[tier]} flex items-center justify-center shrink-0 shadow-md`}
        >
          <span className="text-white font-black text-2xl">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900 text-lg truncate leading-tight">
            {user?.name || 'User'}
          </p>
          <p className="text-slate-500 text-sm truncate">{user?.email || ''}</p>
        </div>
        <span
          className={`shrink-0 text-xs font-bold px-3 py-1 rounded-full capitalize ${TIER_BADGE[tier]}`}
        >
          {tier} plan
        </span>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
          <svg
            className="h-4 w-4 text-red-500 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-sm text-red-700 flex-1">{error}</p>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-600"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic info */}
        <ProfileSection
          title="Basic information"
          gradient="from-blue-500 to-indigo-600"
          icon={
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
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          }
        >
          <div className="space-y-4">
            <Field label="Full name" error={fieldErrors.name}>
              <input
                id="name"
                name="name"
                type="text"
                value={form.name}
                onChange={handleChange}
                placeholder="Ahmed Hassan"
                required
                className={inputCls(fieldErrors.name)}
              />
            </Field>
            <Field label="Professional title" error={fieldErrors.title}>
              <input
                id="title"
                name="title"
                type="text"
                value={form.title}
                onChange={handleChange}
                placeholder="e.g. Full Stack MERN Developer"
                className={inputCls(fieldErrors.title)}
              />
            </Field>
            <Field label={`Bio (${bioLength}/500)`} error={fieldErrors.bio}>
              <textarea
                id="bio"
                name="bio"
                rows={3}
                value={form.bio}
                onChange={handleChange}
                placeholder="Briefly describe your expertise and what makes you stand out..."
                className={`w-full px-3.5 py-2.5 text-sm border rounded-xl bg-slate-50 focus:bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none ${
                  fieldErrors.bio ? 'border-red-400' : 'border-slate-200'
                }`}
                maxLength={500}
              />
            </Field>
          </div>
        </ProfileSection>

        {/* Skills & rates */}
        <ProfileSection
          title="Skills & Rates"
          gradient="from-emerald-500 to-teal-600"
          icon={
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
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          }
        >
          <div className="space-y-4">
            <SkillsInput skills={skills} onChange={setSkills} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Hourly rate (USD)" error={fieldErrors.hourly_rate_usd}>
                <div className="flex items-center gap-0">
                  <span className="px-3 py-2.5 text-sm text-slate-500 font-medium border border-r-0 border-slate-200 rounded-l-xl bg-slate-100">
                    $
                  </span>
                  <input
                    id="hourly_rate_usd"
                    name="hourly_rate_usd"
                    type="number"
                    min="1"
                    max="500"
                    value={form.hourly_rate_usd}
                    onChange={handleChange}
                    placeholder="25"
                    className={`flex-1 px-3.5 py-2.5 text-sm border rounded-r-xl bg-slate-50 focus:bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                      fieldErrors.hourly_rate_usd ? 'border-red-400' : 'border-slate-200'
                    }`}
                  />
                </div>
              </Field>
              <Field label="Years of experience" error={fieldErrors.experience_years}>
                <input
                  id="experience_years"
                  name="experience_years"
                  type="number"
                  min="0"
                  max="50"
                  value={form.experience_years}
                  onChange={handleChange}
                  placeholder="4"
                  className={inputCls(fieldErrors.experience_years)}
                />
              </Field>
            </div>
          </div>
        </ProfileSection>

        {/* Platform links */}
        <ProfileSection
          title="Platform Profiles"
          gradient="from-violet-500 to-purple-600"
          icon={
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
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
          }
        >
          <div className="space-y-4">
            <Field label="Upwork profile URL" error={fieldErrors.upwork_url}>
              <input
                id="upwork_url"
                name="upwork_url"
                type="url"
                value={form.upwork_url}
                onChange={handleChange}
                placeholder="https://www.upwork.com/freelancers/yourname"
                className={inputCls(fieldErrors.upwork_url)}
              />
            </Field>
            <Field label="Fiverr profile URL" error={fieldErrors.fiverr_url}>
              <input
                id="fiverr_url"
                name="fiverr_url"
                type="url"
                value={form.fiverr_url}
                onChange={handleChange}
                placeholder="https://www.fiverr.com/yourname"
                className={inputCls(fieldErrors.fiverr_url)}
              />
            </Field>
          </div>
        </ProfileSection>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white disabled:opacity-60 transition-all shadow-md shadow-blue-500/20"
          >
            {loading ? (
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
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
            {loading ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
