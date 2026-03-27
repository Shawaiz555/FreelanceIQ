import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useExtensionAuth from './hooks/useExtensionAuth';

// Layout
import PageWrapper from './components/layout/PageWrapper';

// Public pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import OnboardingPage from './pages/OnboardingPage';
import NotFoundPage from './pages/NotFoundPage';

// Global UI
import ToastContainer from './components/ui/Toast';
import UpgradeModal from './components/ui/UpgradeModal';

// Authenticated pages
import DashboardPage from './pages/DashboardPage';
import AnalysisDetailPage from './pages/AnalysisDetailPage';
import AnalysisHistoryPage from './pages/AnalysisHistoryPage';
import BillingPage from './pages/BillingPage';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';
import ManualAnalysisPage from './pages/ManualAnalysisPage';

function AppInner() {
  useExtensionAuth();
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />

        {/* Authenticated routes — wrapped in PageWrapper (sidebar + navbar + auth guard) */}
        <Route element={<PageWrapper />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/analysis/history" element={<AnalysisHistoryPage />} />
          <Route path="/analysis/:id" element={<AnalysisDetailPage />} />
          <Route path="/billing" element={<BillingPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/analyze" element={<ManualAnalysisPage />} />
        </Route>

        {/* 404 */}
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>

      {/* Global modals & notifications */}
      <UpgradeModal />
      <ToastContainer />
    </BrowserRouter>
  );
}
