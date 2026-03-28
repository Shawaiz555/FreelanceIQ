import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { z } from 'zod';
import { setCredentials, setLoading, setError, clearError } from '../store/slices/authSlice';
import { authApi } from '../services/api';

const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(80),
    email: z.string().email('Please enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .refine((val) => /[A-Z]/.test(val), 'Must contain at least one uppercase letter')
      .refine((val) => /[0-9]/.test(val), 'Must contain at least one number'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

const inputCls = (err) =>
  `w-full px-4 py-3 text-sm border rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all ${
    err ? 'border-red-400 bg-red-50' : 'border-slate-200 hover:border-slate-300'
  }`;

export default function RegisterPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isAuthenticated, loading, error } = useSelector((state) => state.auth);
  const justRegistered = useRef(false);

  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Only redirect to dashboard if already authenticated on mount (returning user).
  // Skip redirect if we just registered — handleSubmit navigates to /onboarding instead.
  useEffect(() => {
    if (isAuthenticated && !justRegistered.current) navigate('/dashboard', { replace: true });
    return () => dispatch(clearError());
  }, [isAuthenticated, navigate, dispatch]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    dispatch(clearError());
    const result = registerSchema.safeParse(form);
    if (!result.success) {
      const errors = {};
      result.error.issues.forEach((err) => {
        errors[err.path[0]] = err.message;
      });
      setFieldErrors(errors);
      return;
    }
    dispatch(setLoading(true));
    try {
      const res = await authApi.register(form);
      justRegistered.current = true;
      dispatch(setCredentials({ user: res.data.user, token: res.data.token }));
      navigate('/onboarding', { replace: true });
    } catch (err) {
      dispatch(setError(err.message || 'Registration failed. Please try again.'));
      dispatch(setLoading(false));
    }
  };

  const getPasswordStrength = () => {
    const p = form.password;
    if (!p) return null;
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    const levels = [
      { label: 'Weak', color: 'bg-red-500' },
      { label: 'Fair', color: 'bg-amber-500' },
      { label: 'Good', color: 'bg-blue-500' },
      { label: 'Strong', color: 'bg-emerald-500' },
    ];
    return { score, ...levels[Math.min(score - 1, 3)] };
  };

  const strength = getPasswordStrength();

  const EyeBtn = ({ show, onToggle }) => (
    <button
      type="button"
      onClick={onToggle}
      tabIndex={-1}
      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
    >
      {show ? (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
          />
        </svg>
      ) : (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
      )}
    </button>
  );

  return (
    <div className="min-h-screen hero-gradient-bg flex items-start justify-center pt-6 overflow-y-auto">
      <div className="w-full max-w-[480px] animate-fade-in-up">
        {/* Branding above the card */}
        <div className="flex flex-col items-center mb-6">
          <div className="flex gap-3 items-center">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/40 transition-transform hover:scale-105">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <h2 className="text-3xl font-black text-white tracking-tight">
              Freelance<span className="text-blue-400">IQ</span>
            </h2>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 text-[10px] font-bold uppercase tracking-wider mt-3">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 group-hover:scale-110 transition-transform" />
            Free forever · No credit card
          </div>
          <Link
            to="/"
            className="mt-4 flex items-center gap-0.5 text-[11px] font-bold px-5 py-1 rounded-full bg-white text-blue hover:scale-95 transition-colors"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to home
          </Link>
        </div>

        {/* Auth Card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-black/40 p-7 border border-white/20">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-black text-slate-900 mb-2">Create your account</h1>
            <p className="text-sm text-slate-500 font-medium">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-blue-600 hover:text-blue-700 font-bold transition-all underline underline-offset-4 decoration-blue-200 hover:decoration-blue-500"
              >
                Sign in
              </Link>
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-2xl p-4 mb-6 animate-shake">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <svg
                  className="h-4 w-4 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <p className="text-sm text-red-800 font-medium flex-1 leading-tight">{error}</p>
              <button
                type="button"
                onClick={() => dispatch(clearError())}
                className="text-red-400 hover:text-red-600 transition-colors p-1"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 gap-5">
              {/* Name */}
              <div className="space-y-2">
                <label
                  htmlFor="name"
                  className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] ml-1"
                >
                  Full Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="John Doe"
                  required
                  autoComplete="name"
                  className={
                    inputCls(fieldErrors.name) +
                    ' !rounded-2xl !py-3.5 !bg-slate-50/50 hover:!bg-white focus:!bg-white'
                  }
                />
                {fieldErrors.name && (
                  <p className="text-[10px] font-bold text-red-500 mt-1.5 ml-1">
                    {fieldErrors.name}
                  </p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] ml-1"
                >
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="name@company.com"
                  required
                  autoComplete="email"
                  className={
                    inputCls(fieldErrors.email) +
                    ' !rounded-2xl !py-3.5 !bg-slate-50/50 hover:!bg-white focus:!bg-white'
                  }
                />
                {fieldErrors.email && (
                  <p className="text-[10px] font-bold text-red-500 mt-1.5 ml-1">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] ml-1"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Min 8 characters"
                    required
                    autoComplete="new-password"
                    className={
                      inputCls(fieldErrors.password) +
                      ' !rounded-2xl !py-3.5 !pr-12 !bg-slate-50/50 hover:!bg-white focus:!bg-white'
                    }
                  />
                  <EyeBtn show={showPassword} onToggle={() => setShowPassword((v) => !v)} />
                </div>
                {strength && (
                  <div className="flex items-center gap-3 mt-2 px-1">
                    <div className="flex gap-1.5 flex-1">
                      {[0, 1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${i < strength.score ? strength.color : 'bg-slate-100'}`}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight w-12 text-right">
                      {strength.label}
                    </span>
                  </div>
                )}
                {fieldErrors.password && (
                  <p className="text-[10px] font-bold text-red-500 mt-1.5 ml-1">
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              {/* Confirm password */}
              <div className="space-y-2">
                <label
                  htmlFor="confirmPassword"
                  className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] ml-1"
                >
                  Confirm password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    value={form.confirmPassword}
                    onChange={handleChange}
                    placeholder="Repeat your password"
                    required
                    autoComplete="new-password"
                    className={
                      inputCls(fieldErrors.confirmPassword) +
                      ' !rounded-2xl !py-3.5 !pr-12 !bg-slate-50/50 hover:!bg-white focus:!bg-white'
                    }
                  />
                  <EyeBtn show={showConfirm} onToggle={() => setShowConfirm((v) => !v)} />
                </div>
                {fieldErrors.confirmPassword && (
                  <p className="text-[10px] font-bold text-red-500 mt-1.5 ml-1">
                    {fieldErrors.confirmPassword}
                  </p>
                )}
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-4 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-60 text-white text-xs sm:text-sm font-black rounded-2xl transition-all shadow-xl shadow-blue-500/30 flex items-center justify-center gap-3 group active:scale-[0.98]"
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
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
                <>
                  <span>Create Account</span>
                  <svg
                    className="w-5 h-5 transition-transform group-hover:translate-x-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Legal */}
          <p className="text-[10px] font-bold text-slate-400 text-center mt-8 leading-relaxed uppercase tracking-tight">
            By signing up, you agree to our{' '}
            <a href="#" className="text-slate-600 hover:text-blue-600 transition-colors">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="text-slate-600 hover:text-blue-600 transition-colors">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
