import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import ErrorBoundary from '../ErrorBoundary';
import { setMobileMenu } from '../../store/slices/uiSlice';
import { updateUser } from '../../store/slices/authSlice';
import { userApi } from '../../services/api';

export default function PageWrapper({ title = '' }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isAuthenticated, extensionAuthReady } = useSelector((state) => state.auth);
  const mobileMenuOpen = useSelector((state) => state.ui.mobileMenuOpen);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (mobileMenuOpen) {
      // small tick so CSS transition fires after mount
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [mobileMenuOpen]);

  // Wait for extension auth check before deciding to redirect
  useEffect(() => {
    if (!extensionAuthReady) return; // still checking extension — hold off
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, extensionAuthReady, navigate]);

  // Refresh user data (usage counts, subscription) from server on mount
  useEffect(() => {
    if (!isAuthenticated) return;
    userApi.getProfile().then((res) => {
      if (res?.data) dispatch(updateUser(res.data));
    }).catch(() => {});
  }, [isAuthenticated, dispatch]);

  // Show nothing while waiting for extension auth check
  if (!extensionAuthReady) return null;
  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <>
          <div
            className={`fixed inset-0 z-40 lg:hidden transition-opacity duration-300 ${visible ? 'bg-black/50 opacity-100' : 'opacity-0'}`}
            onClick={() => dispatch(setMobileMenu(false))}
            aria-hidden="true"
          />
          <div
            className={`fixed inset-y-0 left-0 w-72 z-50 lg:hidden transition-transform duration-300 ease-out ${visible ? 'translate-x-0' : '-translate-x-full'}`}
          >
            <Sidebar mobile onClose={() => dispatch(setMobileMenu(false))} />
          </div>
        </>
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Navbar title={title} />
        <main className="flex-1 overflow-y-auto bg-slate-50">
          <div className="p-4 lg:p-6 max-w-7xl mx-auto">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}
