import { Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { toggleMobileMenu, openModal } from '../../store/slices/uiSlice';

export default function Navbar({ title = '' }) {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const analysesUsed = user?.usage?.analyses_this_month ?? 0;
  const tier = user?.subscription?.tier || 'free';
  const isFree = tier === 'free';
  const PLAN_LIMITS = { free: 5, pro: 100, agency: 500 };
  const analysesLimit = PLAN_LIMITS[tier] ?? 5;
  const pct = Math.min((analysesUsed / analysesLimit) * 100, 100);
  const isFull = analysesUsed >= analysesLimit;
  const isNear = pct >= 70 && !isFull;

  const TIER_STYLES = {
    pro: { bg: 'bg-blue-50 border border-blue-100', text: 'text-blue-600', dot: 'bg-blue-500' },
    agency: {
      bg: 'bg-violet-50 border border-violet-100',
      text: 'text-violet-600',
      dot: 'bg-violet-500',
    },
  };
  const tierStyle = TIER_STYLES[tier];

  return (
    <header className="h-[72px] lg:h-20 bg-white/80 backdrop-blur-xl border-b border-slate-200/80 flex items-center justify-between px-4 lg:px-8 shrink-0 relative z-10 transition-all duration-300">
      {/* Left: hamburger + page title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => dispatch(toggleMobileMenu())}
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label="Open menu"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        {title && (
          <h1 className="text-base sm:text-lg font-bold text-slate-900 hidden sm:block tracking-tight">
            {title}
          </h1>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-2.5">
        {/* Usage indicator — all tiers */}
        {isFree ? (
          <button
            type="button"
            onClick={() => dispatch(openModal('upgradeModal'))}
            className="hidden sm:flex items-center gap-3 px-3.5 py-2 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:border-blue-200 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group"
            title="Upgrade for more analyses"
          >
            <div className="flex flex-col items-end gap-1">
              <span
                className={`text-xs font-semibold whitespace-nowrap ${isFull ? 'text-red-500' : isNear ? 'text-amber-500' : 'text-slate-500'}`}
              >
                {analysesUsed}/{analysesLimit} analysis
              </span>
              <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                <div
                  className={`h-full rounded-full transition-all duration-500 shadow-sm ${
                    isFull
                      ? 'bg-red-500'
                      : isNear
                        ? 'bg-amber-400'
                        : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
            {isFull && (
              <span className="text-xs font-bold text-red-500 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded-md">
                Full
              </span>
            )}
          </button>
        ) : (
          <div className="hidden sm:flex items-center gap-3 px-3.5 py-2 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
            <div className="flex flex-col items-end gap-1">
              <span
                className={`text-xs font-semibold whitespace-nowrap ${isFull ? 'text-red-500' : isNear ? 'text-amber-500' : 'text-slate-500'}`}
              >
                {analysesUsed}/{analysesLimit} analyses
              </span>
              <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                <div
                  className={`h-full rounded-full transition-all duration-500 shadow-sm ${
                    isFull
                      ? 'bg-red-500'
                      : isNear
                        ? 'bg-amber-400'
                        : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Upgrade button when free limit reached */}
        {isFree && isFull && (
          <button
            type="button"
            onClick={() => dispatch(openModal('upgradeModal'))}
            className="hidden sm:flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 transition-all shadow-md shadow-blue-500/20"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
                clipRule="evenodd"
              />
            </svg>
            Upgrade
          </button>
        )}

        {/* Paid tier badge */}
        {!isFree && tierStyle && (
          <span
            className={`hidden sm:flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg capitalize ${tierStyle.bg} ${tierStyle.text}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${tierStyle.dot}`} />
            {tier}
          </span>
        )}

        {/* Divider */}
        <div className="hidden sm:block w-px h-6 bg-slate-200" />

        {/* Avatar / profile link */}
        <Link
          to="/profile"
          className="flex items-center gap-3 pl-1.5 pr-4 py-1.5 rounded-full bg-slate-50 border border-slate-200/60 hover:bg-white hover:border-blue-200 hover:shadow-sm transition-all duration-300 group"
          title="My profile"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-300">
            <span className="text-white font-black text-xs leading-none">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          </div>
          <span className="text-sm font-bold text-slate-700 group-hover:text-blue-600 hidden sm:block transition-colors max-w-[100px] truncate">
            {user?.name?.split(' ')[0] || 'Profile'}
          </span>
        </Link>
      </div>
    </header>
  );
}
