import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../store/slices/authSlice';

const navItems = [
  {
    label: 'Dashboard',
    to: '/dashboard',
    icon: (
      <svg
        className="h-[18px] w-[18px]"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    ),
  },
  {
    label: 'Analyze a Job',
    to: '/analyze',
    icon: (
      <svg
        className="h-[18px] w-[18px]"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
        />
      </svg>
    ),
  },
  {
    label: 'Analysis History',
    to: '/analysis/history',
    icon: (
      <svg
        className="h-[18px] w-[18px]"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
        />
      </svg>
    ),
  },
  {
    label: 'Billing',
    to: '/billing',
    icon: (
      <svg
        className="h-[18px] w-[18px]"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
        />
      </svg>
    ),
  },
  {
    label: 'Settings',
    to: '/settings',
    icon: (
      <svg
        className="h-[18px] w-[18px]"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    label: 'My Profile',
    to: '/profile',
    icon: (
      <svg
        className="h-[18px] w-[18px]"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
      </svg>
    ),
  },
];

const TIER_STYLES = {
  free: { bg: 'bg-slate-100', text: 'text-slate-500', label: 'Free' },
  pro: { bg: 'bg-blue-50', text: 'text-blue-600', label: 'Pro' },
  agency: { bg: 'bg-violet-50', text: 'text-violet-600', label: 'Agency' },
};

export default function Sidebar({ mobile = false, onClose }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = () => {
    setLoggingOut(true);
    // Notify extension to clear its stored auth before dispatching logout
    window.postMessage({ type: 'FIQ_LOGOUT' }, '*');
    dispatch(logout());
    navigate('/login');
  };

  const tier = user?.subscription?.tier || 'free';
  const tierStyle = TIER_STYLES[tier] || TIER_STYLES.free;

  return (
    <div className="flex flex-col w-80 h-full bg-white/95 backdrop-blur-xl border-r border-slate-200 shadow-[20px_0_40px_-15px_rgba(0,0,0,0.05)]">
      {/* ── Logo area ─────────────────────────────────────── */}
      <div className="flex items-center justify-between h-20 px-10 shrink-0 pt-10">
        <div className="flex items-center gap-3">
          <div className="relative group">
            <div className="absolute -inset-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl blur opacity-30 group-hover:opacity-50 transition duration-500" />
            <div className="relative w-9 h-9 bg-white border border-slate-200 rounded-xl flex items-center justify-center shadow-md">
              <svg
                className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform duration-300"
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
          </div>
          <div className="flex flex-col">
            <span className="font-black text-slate-900 text-lg tracking-tight leading-none">
              Freelance<span className="text-blue-600">IQ</span>
            </span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
              Bidding OS
            </span>
          </div>
        </div>
        {mobile && (
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all"
            aria-label="Close menu"
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
        )}
      </div>

      {/* ── Navigation ────────────────────────────────────── */}
      <nav className="flex-1 px-4 py-8 space-y-1.5 overflow-y-auto">
        <p className="px-3 mb-4 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">
          Dashboard Control
        </p>

        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={mobile ? onClose : undefined}
            className={({ isActive }) =>
              [
                'group relative flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-300 overflow-hidden',
                isActive
                  ? 'text-blue-700 bg-blue-50/50 ring-1 ring-blue-100 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                {/* Active Glow Accent */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-r-full shadow-[0_0_8px_rgba(59,130,246,0.3)]" />
                )}

                <span
                  className={`shrink-0 transition-all duration-300 ${isActive ? 'text-blue-600 scale-110' : 'text-slate-400 group-hover:text-blue-600 group-hover:scale-110'}`}
                >
                  {item.icon}
                </span>

                <span className="flex-1 tracking-tight">{item.label}</span>

                {isActive ? (
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(59,130,246,0.5)] animate-pulse" />
                ) : (
                  <svg
                    className="w-4 h-4 text-slate-400 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── User footer ───────────────────────────────────── */}
      <div className="shrink-0 p-4 pb-8 space-y-3 bg-gradient-to-t from-white to-transparent">
        {/* User Card - Module Style */}
        <div className="relative group p-4 py-1 rounded-2xl bg-slate-50 border border-slate-200 hover:border-blue-200 transition-all duration-300">
          <div className="flex items-center gap-3 ">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500 rounded-full blur-sm opacity-10 group-hover:opacity-20 transition-opacity" />
              <div className="relative w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                <span className="text-slate-700 font-black text-sm">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-slate-900 truncate tracking-tight">
                {user?.name || 'Explorer'}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-widest ${tierStyle.bg} ${tierStyle.text} ring-1 ring-current/20`}
                >
                  {tierStyle.label}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-white/5 flex items-center justify-between">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest max-w-[120px]">
              {user?.email || 'authenticated'}
            </p>
          </div>
        </div>

        {/* Improved Logout */}
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full h-11 flex items-center justify-center gap-2.5 px-4 text-xs font-black text-slate-500 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 rounded-xl transition-all duration-300 disabled:opacity-50 uppercase tracking-widest group"
        >
          {loggingOut ? (
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
            <>
              <svg
                className="h-4 w-4 shrink-0 group-hover:scale-110 transition-transform"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              <span>Logout</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
