import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setCredentials, setExtensionAuthReady } from '../store/slices/authSlice';

export default function useExtensionAuth() {
  const dispatch = useDispatch();
  const { isAuthenticated, token, user } = useSelector((state) => state.auth);
  const syncedToExtension = useRef(false);

  // ── Extension → App ──────────────────────────────────────────────────────────
  // When unauthenticated, poll the extension for a stored token.
  // Sets extensionAuthReady when done so PageWrapper knows it's safe to redirect.
  useEffect(() => {
    if (isAuthenticated) return;

    let done = false;

    function finish() {
      if (done) return;
      done = true;
      cleanup();
      dispatch(setExtensionAuthReady());
    }

    function requestAuth() {
      if (done) return;
      window.postMessage({ type: 'FIQ_GET_AUTH' }, '*');
    }

    function onMessage(event) {
      if (!event.data || event.data.source !== 'fiq-extension') return;
      if (event.data.type === 'FIQ_EXTENSION_INSTALLED') {
        requestAuth();
        return;
      }
      if (event.data.type !== 'FIQ_AUTH_RESPONSE') return;

      const auth = event.data.payload;
      if (auth?.token && auth?.user) {
        dispatch(setCredentials({ token: auth.token, user: auth.user }));
        done = true;
        cleanup();
      } else {
        finish();
      }
    }

    window.addEventListener('message', onMessage);
    const delays = [100, 200, 400, 600, 800, 1000, 1300, 1600, 2000];
    const timers = delays.map((ms) => setTimeout(requestAuth, ms));
    const giveUp = setTimeout(finish, 2500);

    function cleanup() {
      timers.forEach(clearTimeout);
      clearTimeout(giveUp);
      window.removeEventListener('message', onMessage);
    }

    return () => { done = true; cleanup(); };
  }, [isAuthenticated, dispatch]);

  // ── App → Extension ──────────────────────────────────────────────────────────
  // Push auth to the extension whenever we are authenticated.
  // Also listens for FIQ_EXTENSION_INSTALLED so we retry if the content script
  // loads after React mounts (common on first page load).
  useEffect(() => {
    if (!isAuthenticated || !token || !user) {
      syncedToExtension.current = false;
      return;
    }

    function pushToExtension() {
      window.postMessage({ type: 'FIQ_SET_AUTH', payload: { token, user } }, '*');
    }

    // Push immediately
    pushToExtension();
    syncedToExtension.current = true;

    // Also push when content script (re-)announces itself — handles the case
    // where content script injects after React has already mounted & isAuthenticated=true
    function onMessage(event) {
      if (!event.data || event.data.source !== 'fiq-extension') return;
      if (event.data.type === 'FIQ_EXTENSION_INSTALLED') {
        pushToExtension();
      }
    }

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [isAuthenticated, token, user]);

  // ── App Logout → Extension ───────────────────────────────────────────────────
  // When the app logs out, clear the extension's stored auth too.
  useEffect(() => {
    if (isAuthenticated) return;
    if (!syncedToExtension.current) return;
    // Was previously synced — now logged out, tell the extension
    window.postMessage({ type: 'FIQ_LOGOUT' }, '*');
    syncedToExtension.current = false;
  }, [isAuthenticated]);
}
