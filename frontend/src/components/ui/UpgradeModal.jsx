import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { closeModal, addNotification } from '../../store/slices/uiSlice';
import { billingApi } from '../../services/api';

const PRO_BENEFITS = [
  { icon: '∞', text: 'Unlimited bid analyses every month' },
  { icon: '✉', text: 'Unlimited AI cover letters with tone control' },
  { icon: '🎯', text: 'Win probability score with full reasoning' },
  { icon: '🚩', text: 'Red & green flag breakdown on every job' },
  { icon: '📋', text: '10+ niche proposal templates' },
  { icon: '📊', text: 'Monthly earnings performance report' },
];

export default function UpgradeModal() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isOpen = useSelector((state) => state.ui.modals.upgradeModal);
  const [loading, setLoading] = useState(false);
  const overlayRef = useRef(null);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') dispatch(closeModal('upgradeModal')); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, dispatch]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClose = () => dispatch(closeModal('upgradeModal'));

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) handleClose();
  };

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const res = await billingApi.createCheckout({ planId: 'pro' });
      window.location.href = res.data.url;
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Could not start checkout. Please try again.' }));
      setLoading(false);
    }
  };

  const handleViewPlans = () => {
    handleClose();
    navigate('/billing');
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-modal-title"
    >
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Gradient header */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 px-6 pt-8 pb-6 text-white">
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <p className="text-blue-200 text-xs font-medium uppercase tracking-wide">FreelanceIQ Pro</p>
              <p className="font-bold text-xl leading-tight" id="upgrade-modal-title">Upgrade to Pro</p>
            </div>
          </div>
          <p className="text-blue-100 text-sm leading-relaxed">
            You've reached your free analysis limit. Upgrade to Pro for <strong className="text-white">unlimited analyses</strong> and win more projects.
          </p>
        </div>

        {/* Benefits list */}
        <div className="px-6 py-5">
          <ul className="space-y-3">
            {PRO_BENEFITS.map(({ icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-gray-700">
                <span className="w-6 text-center text-base shrink-0" aria-hidden="true">{icon}</span>
                {text}
              </li>
            ))}
          </ul>

          {/* Price callout */}
          <div className="mt-5 rounded-xl bg-blue-50 border border-blue-100 p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">Pro plan</p>
              <p className="text-xs text-gray-500 mt-0.5">Cancel anytime · Secure checkout</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">$9</p>
              <p className="text-xs text-gray-400">/month</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            )}
            {loading ? 'Opening checkout…' : 'Upgrade to Pro — $9/mo'}
          </button>
          <button
            type="button"
            onClick={handleViewPlans}
            className="w-full py-2.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            View all plans
          </button>
        </div>
      </div>
    </div>
  );
}
