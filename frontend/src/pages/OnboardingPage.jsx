import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { updateUser } from '../store/slices/authSlice';
import { userApi } from '../services/api';

// ── Reusable tag input ────────────────────────────────────────────────────────

function TagInput({ tags, setTags, placeholder, colorClass = 'bg-blue-100 text-blue-700 border-blue-200' }) {
  const [input, setInput] = useState('');
  const handleKeyDown = (e) => {
    if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
      e.preventDefault();
      const val = input.trim().replace(/,$/, '');
      if (val && !tags.includes(val)) setTags([...tags, val]);
      setInput('');
    }
  };
  return (
    <div>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full px-4 py-3 text-sm border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50/50 hover:bg-white focus:bg-white transition-all text-slate-900 placeholder-slate-400"
      />
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${colorClass}`}
            >
              {tag}
              <button
                type="button"
                onClick={() => setTags(tags.filter((t) => t !== tag))}
                className="hover:opacity-70 transition-opacity leading-none"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);

  const [step, setStep] = useState('upload'); // 'upload' | 'review'
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const cvInputRef = useRef(null);

  const [form, setForm] = useState({
    name: '',
    title: '',
    bio: '',
    experience_years: '',
    location: '',
    linkedin_url: '',
    github_url: '',
    website_url: '',
  });
  const [skills, setSkills] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [education, setEducation] = useState([]);
  const [certifications, setCertifications] = useState([]);

  const ensureHttps = (field) => (e) => {
    const trimmed = e.target.value.trim();
    if (trimmed && !/^https?:\/\//i.test(trimmed)) {
      setForm((p) => ({ ...p, [field]: 'https://' + trimmed }));
    }
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const res = await userApi.uploadCV(file);
      const ext = res.data?.extracted || {};
      setForm({
        name:             ext.name             || user?.name || '',
        title:            ext.title            || '',
        bio:              ext.bio              || '',
        experience_years: ext.experience_years != null && ext.experience_years > 0 ? String(ext.experience_years) : '',
        location:         ext.location         || '',
        linkedin_url:     ext.linkedin_url     || '',
        github_url:       ext.github_url       || '',
        website_url:      ext.website_url      || '',
      });
      if (ext.skills?.length)        setSkills(ext.skills);
      if (ext.languages?.length)     setLanguages(ext.languages);
      if (ext.education?.length)     setEducation(ext.education);
      if (ext.certifications?.length) setCertifications(ext.certifications);
      dispatch(updateUser({
        ...user,
        profile: {
          ...(user?.profile || {}),
          cv_filename:    res.data?.filename || file.name,
          cv_uploaded_at: new Date().toISOString(),
        },
      }));
      setStep('review');
    } catch (err) {
      setUploadError(err?.message || 'Upload failed. Please try a different file.');
    } finally {
      setUploading(false);
      if (cvInputRef.current) cvInputRef.current.value = '';
    }
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      const updates = {
        name: form.name.trim() || user?.name,
        profile: {
          title:            form.title,
          bio:              form.bio,
          skills,
          experience_years: form.experience_years !== '' ? Number(form.experience_years) : 0,
          location:         form.location,
          linkedin_url:     form.linkedin_url,
          github_url:       form.github_url,
          website_url:      form.website_url,
          languages,
          education,
          certifications,
        },
      };
      const res = await userApi.updateProfile(updates);
      dispatch(updateUser(res.data));
      navigate('/dashboard', { replace: true });
    } catch {
      navigate('/dashboard', { replace: true });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative min-h-screen hero-gradient-bg flex items-start justify-center pt-10 sm:pt-14 pb-12 px-4 overflow-y-auto overflow-x-hidden">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-64 sm:w-80 h-64 sm:h-80 bg-blue-600/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 -right-32 w-64 sm:w-80 h-64 sm:h-80 bg-indigo-600/20 rounded-full blur-3xl animate-float-slow" />
      </div>

      <div className={`relative w-full ${step === 'review' ? 'max-w-2xl' : 'max-w-lg'} animate-fade-in-up`}>
        {/* Logo + heading */}
        <div className="flex flex-col items-center mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/40">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Freelance<span className="text-blue-400">IQ</span>
            </h2>
          </div>
          <p className="text-slate-400 text-xs sm:text-sm font-medium text-center px-2">
            {step === 'upload'
              ? 'Upload your CV to set up your profile automatically'
              : 'Review your extracted profile — edit anything before saving'}
          </p>
        </div>

        {/* ── Upload step ── */}
        {step === 'upload' && (
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl sm:rounded-[2.5rem] shadow-2xl shadow-black/40 p-6 sm:p-8 border border-white/20">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-1">Upload your CV</h2>
            <p className="text-slate-500 text-xs sm:text-sm mb-6">
              We'll extract your skills, experience, and contact info automatically. PDF or DOCX, up to 5 MB.
            </p>

            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setIsDragOver(false); handleFileUpload(e.dataTransfer.files[0]); }}
              onClick={() => !uploading && cvInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center cursor-pointer transition-all ${
                isDragOver
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50/80 bg-slate-50/40'
              }`}
            >
              <input
                ref={cvInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files?.[0])}
              />

              {uploading ? (
                <div className="flex flex-col items-center gap-3">
                  <svg className="animate-spin h-10 w-10 text-blue-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <p className="text-sm font-semibold text-blue-600">Parsing your CV with AI…</p>
                  <p className="text-xs text-slate-400">This takes about 5–10 seconds</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                    <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-700">Drop your CV here or click to browse</p>
                    <p className="text-xs text-slate-400 mt-1">PDF or DOCX · max 5 MB</p>
                  </div>
                </div>
              )}
            </div>

            {uploadError && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-700">
                {uploadError}
              </div>
            )}

            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={() => navigate('/dashboard', { replace: true })}
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors underline underline-offset-2"
              >
                Skip — I'll set up my profile later
              </button>
            </div>
          </div>
        )}

        {/* ── Review step ── */}
        {step === 'review' && (
          <div className="space-y-4">
            {/* Success banner */}
            <div className="bg-emerald-500/20 border border-emerald-500/40 rounded-2xl px-4 py-3 flex items-center gap-3">
              <svg className="w-5 h-5 text-emerald-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
              </svg>
              <p className="text-sm font-medium text-emerald-300">
                CV parsed successfully. Review the extracted fields below and edit anything that looks off.
              </p>
            </div>

            {/* Card */}
            <div className="bg-white/95 backdrop-blur-xl rounded-2xl sm:rounded-[2.5rem] shadow-2xl shadow-black/40 p-6 sm:p-8 border border-white/20 space-y-7">

              {/* Section 1: About */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">About you</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] ml-1 mb-1.5">Full name</label>
                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                        placeholder="Your name"
                        className="w-full px-4 py-3 text-sm border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50 hover:bg-white focus:bg-white transition-all text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] ml-1 mb-1.5">Professional title</label>
                      <input
                        type="text"
                        value={form.title}
                        onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                        placeholder="e.g. Senior Full Stack Developer"
                        className="w-full px-4 py-3 text-sm border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50 hover:bg-white focus:bg-white transition-all text-slate-900"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] ml-1 mb-1.5">
                      Professional summary
                      <span className="normal-case tracking-normal text-slate-300 font-normal ml-2">{form.bio.length}/2000</span>
                    </label>
                    <textarea
                      value={form.bio}
                      onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
                      rows={3}
                      maxLength={2000}
                      placeholder="2–4 sentences about your background and what you do"
                      className="w-full px-4 py-3 text-sm border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50 hover:bg-white focus:bg-white transition-all text-slate-900 resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Skills & Experience */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Skills &amp; experience</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] ml-1 mb-1.5">
                      Skills <span className="text-slate-300 normal-case tracking-normal font-normal">(Enter or comma to add)</span>
                    </label>
                    <TagInput tags={skills} setTags={setSkills} placeholder="e.g. React, Node.js, Python…" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] ml-1 mb-1.5">Years of experience</label>
                      <input
                        type="number"
                        min={0}
                        max={50}
                        value={form.experience_years}
                        onChange={(e) => setForm((p) => ({ ...p, experience_years: e.target.value }))}
                        placeholder="e.g. 5"
                        className="w-full px-4 py-3 text-sm border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50 hover:bg-white focus:bg-white transition-all text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] ml-1 mb-1.5">Location</label>
                      <input
                        type="text"
                        value={form.location}
                        onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                        placeholder="e.g. Cairo, Egypt"
                        className="w-full px-4 py-3 text-sm border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50 hover:bg-white focus:bg-white transition-all text-slate-900"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Online presence */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Online presence</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] ml-1 mb-1.5">LinkedIn URL</label>
                    <input
                      type="url"
                      value={form.linkedin_url}
                      onChange={(e) => setForm((p) => ({ ...p, linkedin_url: e.target.value }))}
                      onBlur={ensureHttps('linkedin_url')}
                      placeholder="https://linkedin.com/in/yourname"
                      className="w-full px-4 py-3 text-sm border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50 hover:bg-white focus:bg-white transition-all text-slate-900"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] ml-1 mb-1.5">GitHub URL</label>
                      <input
                        type="url"
                        value={form.github_url}
                        onChange={(e) => setForm((p) => ({ ...p, github_url: e.target.value }))}
                        onBlur={ensureHttps('github_url')}
                        placeholder="https://github.com/yourname"
                        className="w-full px-4 py-3 text-sm border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50 hover:bg-white focus:bg-white transition-all text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] ml-1 mb-1.5">Website / Portfolio</label>
                      <input
                        type="url"
                        value={form.website_url}
                        onChange={(e) => setForm((p) => ({ ...p, website_url: e.target.value }))}
                        onBlur={ensureHttps('website_url')}
                        placeholder="https://yoursite.com"
                        className="w-full px-4 py-3 text-sm border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50 hover:bg-white focus:bg-white transition-all text-slate-900"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 4: Background */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Background</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] ml-1 mb-1.5">
                      Languages <span className="text-slate-300 normal-case tracking-normal font-normal">(spoken / written)</span>
                    </label>
                    <TagInput
                      tags={languages}
                      setTags={setLanguages}
                      placeholder="e.g. English, Arabic…"
                      colorClass="bg-emerald-100 text-emerald-700 border-emerald-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] ml-1 mb-1.5">
                      Education <span className="text-slate-300 normal-case tracking-normal font-normal">(e.g. "BSc CS, MIT, 2019")</span>
                    </label>
                    <TagInput
                      tags={education}
                      setTags={setEducation}
                      placeholder="Degree, Institution, Year…"
                      colorClass="bg-violet-100 text-violet-700 border-violet-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] ml-1 mb-1.5">Certifications</label>
                    <TagInput
                      tags={certifications}
                      setTags={setCertifications}
                      placeholder="e.g. AWS Solutions Architect…"
                      colorClass="bg-amber-100 text-amber-700 border-amber-200"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('upload')}
                  className="w-full sm:w-auto px-5 py-3.5 text-sm font-bold text-slate-600 border-2 border-slate-200 rounded-2xl hover:border-slate-300 hover:bg-slate-50 transition-all"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={handleFinish}
                  disabled={saving}
                  className="flex-1 py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-60 text-white text-sm font-black rounded-2xl transition-all shadow-xl shadow-blue-500/30 flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  {saving ? (
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <>
                      Save &amp; go to dashboard
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-slate-500 mt-5 font-medium">
          You can update all of this later in{' '}
          <span className="text-slate-400">Profile Settings</span>.
        </p>
      </div>
    </div>
  );
}
