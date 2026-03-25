import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { z } from 'zod';
import { updateUser } from '../store/slices/authSlice';
import { addNotification } from '../store/slices/uiSlice';
import { userApi } from '../services/api';

const profileSchema = z.object({
  name:             z.string().min(2, 'Name must be at least 2 characters').max(80),
  title:            z.string().max(100, 'Title must be under 100 characters').optional().or(z.literal('')),
  bio:              z.string().max(2000, 'Bio must be under 2000 characters').optional().or(z.literal('')),
  experience_years: z.number().min(0).max(50).optional().nullable(),
  upwork_url:       z.string().url('Enter a valid URL').optional().or(z.literal('')),
  location:         z.string().max(100).optional().or(z.literal('')),
  linkedin_url:     z.string().url('Enter a valid URL').optional().or(z.literal('')),
  github_url:       z.string().url('Enter a valid URL').optional().or(z.literal('')),
  website_url:      z.string().url('Enter a valid URL').optional().or(z.literal('')),
});

// ─── Tag input ────────────────────────────────────────────────────────────────

function TagInput({ tags, onChange, placeholder, colorClass = 'bg-blue-500/10 text-blue-700', maxItems = 20 }) {
  const [input, setInput] = useState('');

  const add = (raw) => {
    const val = raw.trim().replace(/,$/, '');
    if (val && !tags.includes(val) && tags.length < maxItems) {
      onChange([...tags, val]);
    }
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add(input);
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  return (
    <div>
      <div className="min-h-[46px] flex flex-wrap gap-1.5 items-center px-3 py-2 border border-slate-200 rounded-xl focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent bg-slate-50 focus-within:bg-white transition-all">
        {tags.map((tag) => (
          <span key={tag} className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg ${colorClass}`}>
            {tag}
            <button type="button" onClick={() => onChange(tags.filter((t) => t !== tag))} className="hover:opacity-60 leading-none ml-0.5" aria-label={`Remove ${tag}`}>×</button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => input.trim() && add(input)}
          placeholder={tags.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[140px] outline-none text-sm text-slate-800 bg-transparent placeholder-slate-400"
        />
      </div>
      <p className="text-xs text-slate-400 mt-1.5">Press Enter or comma to add</p>
    </div>
  );
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({ label, error, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">{label}</label>
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
        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm shrink-0`}>
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
  free:   'from-slate-500 to-slate-600',
  pro:    'from-blue-500 to-indigo-600',
  agency: 'from-violet-500 to-purple-600',
};
const TIER_BADGE = {
  free:   'bg-slate-100 text-slate-600',
  pro:    'bg-blue-500/10 text-blue-600',
  agency: 'bg-violet-500/10 text-violet-600',
};

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);

  const [form, setForm] = useState({
    name:             '',
    title:            '',
    bio:              '',
    experience_years: '',
    upwork_url:       '',
    location:         '',
    linkedin_url:     '',
    github_url:       '',
    website_url:      '',
  });
  const [skills, setSkills]               = useState([]);
  const [languages, setLanguages]         = useState([]);
  const [education, setEducation]         = useState([]);
  const [certifications, setCertifications] = useState([]);

  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);
  const [cvUploading, setCvUploading] = useState(false);
  const [cvRemoving, setCvRemoving]   = useState(false);
  const [cvExtractBanner, setCvExtractBanner] = useState(false);
  const cvExtractTimerRef = useRef(null);
  const cvInputRef = useRef(null);

  useEffect(() => {
    if (user) {
      setForm({
        name:             user.name || '',
        title:            user.profile?.title || '',
        bio:              user.profile?.bio || '',
        experience_years: user.profile?.experience_years ?? '',
        upwork_url:       user.profile?.upwork_url || '',
        location:         user.profile?.location || '',
        linkedin_url:     user.profile?.linkedin_url || '',
        github_url:       user.profile?.github_url || '',
        website_url:      user.profile?.website_url || '',
      });
      setSkills(user.profile?.skills || []);
      setLanguages(user.profile?.languages || []);
      setEducation(user.profile?.education || []);
      setCertifications(user.profile?.certifications || []);
    }
  }, [user]);

  // Cleanup banner timer on unmount
  useEffect(() => () => clearTimeout(cvExtractTimerRef.current), []);

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
      experience_years: form.experience_years !== '' ? Number(form.experience_years) : null,
    };

    const result = profileSchema.safeParse(parsed);
    if (!result.success) {
      const errors = {};
      result.error.issues.forEach((issue) => { errors[issue.path[0]] = issue.message; });
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      const updates = {
        name: parsed.name,
        profile: {
          title:            parsed.title,
          bio:              parsed.bio,
          skills,
          experience_years: parsed.experience_years,
          upwork_url:       parsed.upwork_url,
          location:         parsed.location,
          linkedin_url:     parsed.linkedin_url,
          github_url:       parsed.github_url,
          website_url:      parsed.website_url,
          languages,
          education,
          certifications,
        },
      };
      const res = await userApi.updateProfile(updates);
      dispatch(updateUser(res.data));
      dispatch(addNotification({ type: 'success', message: 'Profile updated successfully.' }));
      setFieldErrors({});
    } catch (err) {
      setError(err?.message || 'Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCvUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCvUploading(true);
    try {
      const res = await userApi.uploadCV(file);
      const ext = res.data?.extracted || {};

      // Auto-fill form fields from extracted data (non-empty values only)
      setForm((prev) => ({
        ...prev,
        name:             ext.name             || prev.name,
        title:            ext.title            || prev.title,
        bio:              ext.bio              || prev.bio,
        experience_years: ext.experience_years != null && ext.experience_years > 0 ? String(ext.experience_years) : prev.experience_years,
        location:         ext.location         || prev.location,
        linkedin_url:     ext.linkedin_url     || prev.linkedin_url,
        github_url:       ext.github_url       || prev.github_url,
        website_url:      ext.website_url      || prev.website_url,
      }));
      if (ext.skills?.length)         setSkills(ext.skills);
      if (ext.languages?.length)      setLanguages(ext.languages);
      if (ext.education?.length)      setEducation(ext.education);
      if (ext.certifications?.length) setCertifications(ext.certifications);

      // Include extracted fields in the Redux store so the useEffect re-population
      // reflects the new CV data instead of overwriting the form with old values.
      dispatch(updateUser({
        ...user,
        name: ext.name || user.name,
        profile: {
          ...user.profile,
          cv_filename:    res.data?.filename || file.name,
          cv_uploaded_at: new Date().toISOString(),
          ...(ext.title            && { title:            ext.title }),
          ...(ext.bio              && { bio:              ext.bio }),
          ...(ext.skills?.length   && { skills:           ext.skills }),
          ...(ext.experience_years && { experience_years: ext.experience_years }),
          ...(ext.location         && { location:         ext.location }),
          ...(ext.linkedin_url     && { linkedin_url:     ext.linkedin_url }),
          ...(ext.github_url       && { github_url:       ext.github_url }),
          ...(ext.website_url      && { website_url:      ext.website_url }),
          ...(ext.languages?.length     && { languages:     ext.languages }),
          ...(ext.education?.length     && { education:     ext.education }),
          ...(ext.certifications?.length && { certifications: ext.certifications }),
        },
      }));

      // Show extract banner for 7 seconds
      setCvExtractBanner(true);
      clearTimeout(cvExtractTimerRef.current);
      cvExtractTimerRef.current = setTimeout(() => setCvExtractBanner(false), 7000);
    } catch (err) {
      dispatch(addNotification({ type: 'error', message: err?.message || 'CV upload failed.' }));
    } finally {
      setCvUploading(false);
      if (cvInputRef.current) cvInputRef.current.value = '';
    }
  };

  const handleCvRemove = async () => {
    setCvRemoving(true);
    try {
      await userApi.removeCV();
      dispatch(updateUser({
        ...user,
        profile: { ...user.profile, cv_filename: '', cv_uploaded_at: null },
      }));
      dispatch(addNotification({ type: 'success', message: 'CV removed.' }));
    } catch (err) {
      dispatch(addNotification({ type: 'error', message: err?.message || 'Failed to remove CV.' }));
    } finally {
      setCvRemoving(false);
    }
  };

  const tier = user?.subscription?.tier || 'free';

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
        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${TIER_GRADIENT[tier]} flex items-center justify-center shrink-0 shadow-md`}>
          <span className="text-white font-black text-2xl">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900 text-lg truncate leading-tight">{user?.name || 'User'}</p>
          <p className="text-slate-500 text-sm truncate">{user?.profile?.title || user?.email || ''}</p>
          {user?.profile?.location && (
            <p className="text-slate-400 text-xs mt-0.5">{user.profile.location}</p>
          )}
        </div>
        <span className={`shrink-0 text-xs font-bold px-3 py-1 rounded-full capitalize ${TIER_BADGE[tier]}`}>
          {tier} plan
        </span>
      </div>

      {/* CV extract banner */}
      {cvExtractBanner && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3">
          <svg className="w-4 h-4 text-emerald-500 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-emerald-700 flex-1">
            Profile fields updated from your CV. Review the form below and click <strong>Save changes</strong> when ready.
          </p>
          <button type="button" onClick={() => setCvExtractBanner(false)} className="text-emerald-400 hover:text-emerald-600">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      {/* Save error */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
          <svg className="h-4 w-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-red-700 flex-1">{error}</p>
          <button type="button" onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ── CV / Resume (top — drives everything) ── */}
        <ProfileSection
          title="CV / Resume"
          gradient="from-sky-500 to-blue-600"
          icon={
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        >
          <p className="text-xs text-slate-500 mb-4">
            Upload your CV to auto-fill your profile and match LinkedIn jobs to your background.
            Only extracted text is stored — your file is never saved on our servers.
            Supports PDF and DOCX up to 5 MB.
          </p>

          {user?.profile?.cv_filename ? (
            <div className="flex items-center gap-3 p-3 bg-sky-50 border border-sky-200 rounded-xl">
              <svg className="w-5 h-5 text-sky-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-sky-800 truncate">{user.profile.cv_filename}</p>
                {user.profile.cv_uploaded_at && (
                  <p className="text-xs text-sky-500">Uploaded {new Date(user.profile.cv_uploaded_at).toLocaleDateString()}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => cvInputRef.current?.click()} disabled={cvUploading} className="text-xs font-semibold text-sky-600 hover:text-sky-800 px-2 py-1 rounded-lg hover:bg-sky-100 transition-colors">
                  {cvUploading ? 'Uploading…' : 'Replace'}
                </button>
                <button type="button" onClick={handleCvRemove} disabled={cvRemoving} className="text-xs font-semibold text-red-500 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">
                  {cvRemoving ? 'Removing…' : 'Remove'}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => cvInputRef.current?.click()}
              disabled={cvUploading}
              className="w-full flex flex-col items-center gap-2 p-5 border-2 border-dashed border-slate-200 rounded-xl hover:border-sky-400 hover:bg-sky-50/50 transition-all text-slate-400 hover:text-sky-600"
            >
              {cvUploading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-sky-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span className="text-xs font-medium text-sky-600">Parsing CV with AI…</span>
                </>
              ) : (
                <>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <span className="text-xs font-medium">Click to upload PDF or DOCX</span>
                </>
              )}
            </button>
          )}

          <input
            ref={cvInputRef}
            type="file"
            accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
            onChange={handleCvUpload}
            className="hidden"
          />
        </ProfileSection>

        {/* ── Basic information ── */}
        <ProfileSection
          title="Basic information"
          gradient="from-blue-500 to-indigo-600"
          icon={
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Full name" error={fieldErrors.name}>
                <input id="name" name="name" type="text" value={form.name} onChange={handleChange} placeholder="Your full name" required className={inputCls(fieldErrors.name)} />
              </Field>
              <Field label="Professional title" error={fieldErrors.title}>
                <input id="title" name="title" type="text" value={form.title} onChange={handleChange} placeholder="e.g. Senior Full Stack Developer" className={inputCls(fieldErrors.title)} />
              </Field>
            </div>
            <Field label="Location" error={fieldErrors.location}>
              <input id="location" name="location" type="text" value={form.location} onChange={handleChange} placeholder="e.g. Cairo, Egypt" className={inputCls(fieldErrors.location)} />
            </Field>
            <Field label={`Professional summary (${form.bio.length}/2000)`} error={fieldErrors.bio}>
              <textarea
                id="bio" name="bio" rows={4} value={form.bio} onChange={handleChange}
                placeholder="Briefly describe your expertise and what makes you stand out..."
                className={`w-full px-3.5 py-2.5 text-sm border rounded-xl bg-slate-50 focus:bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none ${fieldErrors.bio ? 'border-red-400' : 'border-slate-200'}`}
                maxLength={2000}
              />
            </Field>
          </div>
        </ProfileSection>

        {/* ── Skills & experience ── */}
        <ProfileSection
          title="Skills & Experience"
          gradient="from-emerald-500 to-teal-600"
          icon={
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Skills</label>
              <TagInput tags={skills} onChange={setSkills} placeholder="Type a skill and press Enter" colorClass="bg-blue-500/10 text-blue-700" maxItems={20} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Years of experience" error={fieldErrors.experience_years}>
                <input id="experience_years" name="experience_years" type="number" min="0" max="50" value={form.experience_years} onChange={handleChange} placeholder="e.g. 5" className={inputCls(fieldErrors.experience_years)} />
              </Field>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Languages</label>
                <TagInput tags={languages} onChange={setLanguages} placeholder="e.g. English, Arabic…" colorClass="bg-emerald-500/10 text-emerald-700" />
              </div>
            </div>
          </div>
        </ProfileSection>

        {/* ── Online presence ── */}
        <ProfileSection
          title="Online Presence"
          gradient="from-violet-500 to-purple-600"
          icon={
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          }
        >
          <div className="space-y-4">
            <Field label="LinkedIn URL" error={fieldErrors.linkedin_url}>
              <input id="linkedin_url" name="linkedin_url" type="url" value={form.linkedin_url} onChange={handleChange} placeholder="https://linkedin.com/in/yourname" className={inputCls(fieldErrors.linkedin_url)} />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="GitHub URL" error={fieldErrors.github_url}>
                <input id="github_url" name="github_url" type="url" value={form.github_url} onChange={handleChange} placeholder="https://github.com/yourname" className={inputCls(fieldErrors.github_url)} />
              </Field>
              <Field label="Website / Portfolio" error={fieldErrors.website_url}>
                <input id="website_url" name="website_url" type="url" value={form.website_url} onChange={handleChange} placeholder="https://yoursite.com" className={inputCls(fieldErrors.website_url)} />
              </Field>
            </div>
            <Field label="Upwork profile URL" error={fieldErrors.upwork_url}>
              <input id="upwork_url" name="upwork_url" type="url" value={form.upwork_url} onChange={handleChange} placeholder="https://www.upwork.com/freelancers/yourname" className={inputCls(fieldErrors.upwork_url)} />
            </Field>
          </div>
        </ProfileSection>

        {/* ── Education & Certifications ── */}
        <ProfileSection
          title="Education & Certifications"
          gradient="from-amber-500 to-orange-500"
          icon={
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
            </svg>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
                Education <span className="normal-case text-slate-400 font-normal tracking-normal">(e.g. "BSc CS, MIT, 2019")</span>
              </label>
              <TagInput tags={education} onChange={setEducation} placeholder="Degree, Institution, Year…" colorClass="bg-violet-500/10 text-violet-700" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Certifications</label>
              <TagInput tags={certifications} onChange={setCertifications} placeholder="e.g. AWS Solutions Architect…" colorClass="bg-amber-500/10 text-amber-700" />
            </div>
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
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {loading ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
