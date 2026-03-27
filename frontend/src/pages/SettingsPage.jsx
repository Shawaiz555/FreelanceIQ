import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { updateUser, logout } from '../store/slices/authSlice';
import { addNotification } from '../store/slices/uiSlice';
import { userApi } from '../services/api';

// ─── Toggle switch ────────────────────────────────────────────────────────────

function Toggle({ checked, onChange, label, description, id }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <label htmlFor={id} className="text-sm font-semibold text-slate-800 cursor-pointer">
          {label}
        </label>
        {description && (
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{description}</p>
        )}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
          checked ? 'bg-gradient-to-r from-blue-500 to-indigo-600' : 'bg-slate-200'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────

function SettingSection({ icon, title, gradient, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-5">
        <div
          className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm`}
        >
          {icon}
        </div>
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      </div>
      {children}
    </div>
  );
}

// ─── Delete confirm modal ─────────────────────────────────────────────────────

function DeleteConfirmModal({ onConfirm, onCancel, loading }) {
  const [typed, setTyped] = useState('');
  const confirmed = typed === 'DELETE';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
            <svg
              className="h-5 w-5 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Delete account</h3>
            <p className="text-xs text-slate-500">This action cannot be undone</p>
          </div>
        </div>
        <p className="text-sm text-slate-600 mb-4 leading-relaxed">
          All your analyses, cover letters, and billing data will be permanently deleted. Type{' '}
          <strong className="font-mono text-red-600">DELETE</strong> to confirm.
        </p>
        <input
          type="text"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="Type DELETE to confirm"
          className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent mb-4 font-mono bg-slate-50"
          autoFocus
        />
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!confirmed || loading}
            className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {loading && (
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
            {loading ? 'Deleting…' : 'Delete my account'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);

  const [autoOpen, setAutoOpen] = useState(user?.settings?.extension_auto_open ?? true);
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [extensionInstalled, setExtensionInstalled] = useState(false);

  // Detect extension + ask it to report its current auto-open state
  useEffect(() => {
    let gotState = false;
    const handler = (event) => {
      if (event.data?.source === 'fiq-extension') {
        if (event.data?.type === 'FIQ_EXTENSION_INSTALLED') setExtensionInstalled(true);
        if (event.data?.type === 'FIQ_AUTO_OPEN_STATE' && typeof event.data.value === 'boolean') {
          gotState = true;
          setAutoOpen(event.data.value);
        }
      }
    };
    window.addEventListener('message', handler);
    window.postMessage({ type: 'FIQ_PING_REQUEST' }, '*');
    window.postMessage({ type: 'FIQ_GET_AUTO_OPEN' }, '*');
    // Retry once after a short delay in case the content script wasn't ready yet
    const retryTimer = setTimeout(() => {
      if (!gotState) window.postMessage({ type: 'FIQ_GET_AUTO_OPEN' }, '*');
    }, 300);
    return () => {
      window.removeEventListener('message', handler);
      clearTimeout(retryTimer);
    };
  }, []);

  const handleAutoOpenChange = (value) => {
    setAutoOpen(value);
    // Immediately update the extension (no save button needed for this)
    window.postMessage({ type: 'FIQ_SET_AUTO_OPEN', value }, '*');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await userApi.updateProfile({ settings: { extension_auto_open: autoOpen } });
      dispatch(updateUser(res.data));
      dispatch(addNotification({ type: 'success', message: 'Settings saved.' }));
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to save settings.' }));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      await new Promise((res) => setTimeout(res, 800));
      dispatch(logout());
      navigate('/login', { replace: true });
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to delete account. Please contact support.' }));
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Settings</h2>
        <p className="text-sm text-slate-400 mt-0.5">Manage your extension and account preferences.</p>
      </div>

      {/* Chrome extension */}
      <SettingSection
        title="Chrome Extension"
        gradient="from-emerald-500 to-teal-600"
        icon={
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
          </svg>
        }
      >
        <div className="space-y-5">
          <Toggle
            id="extension_auto_open"
            checked={autoOpen}
            onChange={handleAutoOpenChange}
            label="Auto-open sidebar"
            description="Automatically show the FreelanceIQ sidebar when you open a job listing on Upwork or LinkedIn."
          />
          <div className="border-t border-slate-100" />
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-800">Extension status</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {extensionInstalled
                  ? 'FreelanceIQ extension is active and ready.'
                  : 'Install the Chrome extension to analyse jobs in one click.'}
              </p>
            </div>
            {extensionInstalled ? (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Installed
              </span>
            ) : (
              <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full shrink-0">
                Not installed
              </span>
            )}
          </div>
        </div>
      </SettingSection>

      {/* Save button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white disabled:opacity-60 transition-all shadow-md shadow-blue-500/20"
        >
          {saving ? (
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </div>

      {/* Danger zone */}
      <div className="rounded-2xl border border-red-200 bg-red-50/50 p-6">
        <div className="flex items-center gap-2 mb-2">
          <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="text-sm font-bold text-red-700">Danger zone</h3>
        </div>
        <p className="text-xs text-red-600 mb-4 leading-relaxed">
          Permanently delete your account and all associated data. This cannot be undone.
        </p>
        <button
          type="button"
          onClick={() => setShowDeleteModal(true)}
          className="px-4 py-2 text-xs font-semibold rounded-xl border border-red-300 text-red-600 hover:bg-red-100 transition-colors"
        >
          Delete account
        </button>
      </div>

      {/* Delete modal */}
      {showDeleteModal && (
        <DeleteConfirmModal
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowDeleteModal(false)}
          loading={deleting}
        />
      )}
    </div>
  );
}
