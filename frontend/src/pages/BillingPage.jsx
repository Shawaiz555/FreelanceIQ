import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { SkeletonCard } from '../components/ui/Skeleton';
import { addNotification, openModal } from '../store/slices/uiSlice';
import { billingApi } from '../services/api';

const CHECK_ICON = (
  <svg className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
    <path
      fillRule="evenodd"
      d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
      clipRule="evenodd"
    />
  </svg>
);

// ─── Usage bar ────────────────────────────────────────────────────────────────

function UsageBar({ used, limit }) {
  if (!limit) return null;
  const pct = Math.min((used / limit) * 100, 100);
  const isNear = pct >= 80;
  const isFull = pct >= 100;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-600">
          <span
            className={`font-bold ${isFull ? 'text-red-500' : isNear ? 'text-amber-500' : 'text-slate-900'}`}
          >
            {used}
          </span>
          {' / '}
          {limit} analyses this month
        </span>
        <span
          className={`text-xs font-semibold ${isFull ? 'text-red-500' : isNear ? 'text-amber-500' : 'text-slate-400'}`}
        >
          {limit - used > 0 ? `${limit - used} remaining` : 'Limit reached'}
        </span>
      </div>
      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${isFull ? 'bg-red-500' : isNear ? 'bg-amber-400' : 'bg-gradient-to-r from-blue-500 to-indigo-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {isFull && (
        <p className="text-xs text-red-500 font-medium">
          You've reached your monthly limit. Upgrade to continue.
        </p>
      )}
      {isNear && !isFull && (
        <p className="text-xs text-amber-600">Almost at your limit — consider upgrading.</p>
      )}
    </div>
  );
}

// ─── Plan card ────────────────────────────────────────────────────────────────

function PlanCard({ plan, currentTier, checkoutLoading, onUpgrade, onManage }) {
  const isCurrent = currentTier === plan.id;
  const isDowngrade = plan.price_monthly === 0 && currentTier !== 'free';

  const gradients = {
    free: 'from-slate-500 to-slate-600',
    pro: 'from-blue-500 to-indigo-600',
    agency: 'from-violet-500 to-purple-600',
  };

  return (
    <div
      className={`relative flex flex-col rounded-2xl border-2 p-6 transition-all duration-200 ${
        plan.popular
          ? 'border-blue-500 shadow-xl shadow-blue-500/10 scale-[1.02]'
          : isCurrent
            ? 'border-slate-300 bg-slate-50/50'
            : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
      }`}
    >
      {plan.popular && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <span className="px-3 py-1 text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full shadow-md shadow-blue-500/30">
            Most popular
          </span>
        </div>
      )}

      {isCurrent && (
        <div className="absolute top-4 right-4">
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-900 text-white">
            Current
          </span>
        </div>
      )}

      <div className="mb-5">
        <div
          className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradients[plan.id] || 'from-slate-500 to-slate-600'} flex items-center justify-center mb-3 shadow-sm`}
        >
          <svg
            className="w-5 h-5 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            {plan.id === 'free' ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            ) : plan.id === 'pro' ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 3l14 9-14 9V3z" />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            )}
          </svg>
        </div>
        <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
        <div className="flex items-end gap-1 mt-2">
          {plan.price_monthly === 0 ? (
            <span className="text-3xl font-black text-slate-900">Free</span>
          ) : (
            <>
              <span className="text-3xl font-black text-slate-900">${plan.price_monthly}</span>
              <span className="text-slate-400 text-sm pb-1">/mo</span>
            </>
          )}
        </div>
        {plan.price_monthly > 0 && (
          <p className="text-xs text-slate-400 mt-0.5">
            ${Math.round(plan.price_monthly * 12 * 0.8)}/yr billed annually · save 20%
          </p>
        )}
      </div>

      <ul className="space-y-2.5 mb-6 flex-1">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm text-slate-600">
            {CHECK_ICON}
            {f}
          </li>
        ))}
      </ul>

      {isCurrent ? (
        currentTier !== 'free' ? (
          <button
            type="button"
            onClick={onManage}
            className="w-full py-2.5 px-4 text-sm font-semibold rounded-xl border border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all"
          >
            Manage subscription
          </button>
        ) : (
          <button
            type="button"
            disabled
            className="w-full py-2.5 px-4 text-sm font-semibold rounded-xl border border-slate-200 text-slate-400 cursor-not-allowed"
          >
            Current plan
          </button>
        )
      ) : isDowngrade ? (
        <button
          type="button"
          onClick={() => onUpgrade(plan.id)}
          className="w-full py-2.5 px-4 text-sm font-semibold rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all"
        >
          Downgrade to Free
        </button>
      ) : (
        <button
          type="button"
          onClick={() => onUpgrade(plan.id)}
          disabled={checkoutLoading === plan.id}
          className={`w-full py-2.5 px-4 text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70 ${
            plan.popular
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/25'
              : 'bg-slate-900 hover:bg-slate-800 text-white shadow-sm'
          }`}
        >
          {checkoutLoading === plan.id && (
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
          )}
          {checkoutLoading === plan.id ? 'Redirecting…' : `Upgrade to ${plan.name}`}
        </button>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

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

export default function BillingPage() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState('');

  const currentTier = user?.subscription?.tier || 'free';
  const analysesUsed = user?.usage?.analyses_this_month ?? 0;
  const PLAN_LIMITS = { free: 5, pro: 100, agency: 500 };
  const analysesLimit = PLAN_LIMITS[currentTier] ?? 5;
  const resetDate = user?.usage?.reset_date
    ? new Date(user.usage.reset_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
    : null;

  useEffect(() => {
    billingApi
      .getPlans()
      .then((res) => {
        setPlans(res.data || []);
      })
      .catch(() => {})
      .finally(() => setPlansLoading(false));
  }, []);

  const handleUpgrade = async (planId) => {
    setCheckoutLoading(planId);
    try {
      const res = await billingApi.createCheckout({ planId });
      window.location.href = res.data.url;
    } catch {
      dispatch(
        addNotification({ type: 'error', message: 'Could not start checkout. Please try again.' }),
      );
      setCheckoutLoading('');
    }
  };

  const handleManage = async () => {
    try {
      const res = await billingApi.createPortal();
      window.location.href = res.data.url;
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Could not open billing portal.' }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Billing & Plan</h2>
        <p className="text-sm text-slate-400 mt-0.5">Manage your subscription and usage.</p>
      </div>

      {/* Current plan summary */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${TIER_GRADIENT[currentTier] || TIER_GRADIENT.free} flex items-center justify-center shadow-md shrink-0`}
            >
              <svg
                className="h-6 w-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                Current plan
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xl font-black text-slate-900 capitalize">{currentTier}</span>
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${TIER_BADGE[currentTier] || TIER_BADGE.free}`}
                >
                  {currentTier}
                </span>
              </div>
            </div>
          </div>
          {resetDate && (
            <div className="text-right">
              <p className="text-xs text-slate-400">Resets</p>
              <p className="text-sm font-semibold text-slate-700">{resetDate}</p>
            </div>
          )}
        </div>

        <UsageBar used={analysesUsed} limit={analysesLimit} />

        {currentTier === 'free' && (
          <div className="mt-5 pt-5 border-t border-slate-100">
            <button
              type="button"
              onClick={() => dispatch(openModal('upgradeModal'))}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white transition-all shadow-md shadow-blue-500/25"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
                  clipRule="evenodd"
                />
              </svg>
              Upgrade for unlimited analyses
            </button>
          </div>
        )}
      </div>

      {/* Plan comparison */}
      <div>
        <h3 className="text-base font-bold text-slate-900 mb-4">Choose your plan</h3>
        {plansLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                currentTier={currentTier}
                checkoutLoading={checkoutLoading}
                onUpgrade={handleUpgrade}
                onManage={handleManage}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footnote */}
      <div className="flex items-start gap-3 bg-slate-50 rounded-2xl p-5 border border-slate-200">
        <svg
          className="h-4 w-4 text-slate-400 shrink-0 mt-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="text-xs text-slate-500 leading-relaxed">
          Payments are processed securely by{' '}
          <span className="font-semibold text-slate-700">Stripe</span>. Cancel or change your plan
          anytime. For invoices or disputes, use the{' '}
          <span className="font-semibold text-slate-700">Manage subscription</span> button on your
          current plan.
        </p>
      </div>
    </div>
  );
}
