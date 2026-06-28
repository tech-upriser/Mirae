import { BrowserRouter, Routes, Route, useLocation } from 'react-router';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Analytics } from './components/Analytics';
import { Contacts } from './components/Contacts';
import { CalendarView } from './components/CalendarView';
import { ExtensionPopup } from './components/ExtensionPopup';
import { Settings } from './components/Settings';
import { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { ManageResumesModal } from './components/ManageResumesModal';
import { SocialPortfolioModal } from './components/SocialPortfolioModal';
import { LogoutConfirmModal } from './components/LogoutConfirmModal';
import { LandingPage } from './components/LandingPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useNavigate } from 'react-router';
import { useTheme } from './hooks/useTheme';

function AppContent() {
  useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [showExtension, setShowExtension] = useState(false);
  const [showManageResumes, setShowManageResumes] = useState(false);
  const [showSocialPortfolio, setShowSocialPortfolio] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const hasBlockingOverlay = showManageResumes || showSocialPortfolio || showLogoutConfirm;
  const authenticated = typeof window !== 'undefined' && window.localStorage.getItem('isLoggedIn') === 'true';
  const showSidebar = authenticated && location.pathname !== '/';

  return (
    <div className="min-h-screen bg-background">
      <div
        aria-hidden={hasBlockingOverlay}
        className={hasBlockingOverlay ? 'pointer-events-none select-none' : undefined}
      >
        {showSidebar && (
          <Sidebar
            onManageResumesOpen={() => setShowManageResumes(true)}
            onSocialPortfolioOpen={() => setShowSocialPortfolio(true)}
            onLogoutOpen={() => setShowLogoutConfirm(true)}
          />
        )}
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route
            path="/dashboard"
            element={(
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/analytics"
            element={(
              <ProtectedRoute>
                <Analytics />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/calendar"
            element={(
              <ProtectedRoute>
                <CalendarView />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/settings"
            element={(
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/contacts"
            element={(
              <ProtectedRoute>
                <Contacts />
              </ProtectedRoute>
            )}
          />
        </Routes>

        {showExtension && <ExtensionPopup onClose={() => setShowExtension(false)} />}
      </div>

      <AnimatePresence>
        {showManageResumes && (
          <ManageResumesModal onClose={() => setShowManageResumes(false)} />
        )}
        {showSocialPortfolio && (
          <SocialPortfolioModal onClose={() => setShowSocialPortfolio(false)} />
        )}
        {showLogoutConfirm && (
          <LogoutConfirmModal
            onClose={() => setShowLogoutConfirm(false)}
            onConfirm={() => {
              setShowLogoutConfirm(false);
              localStorage.removeItem('token');
              localStorage.removeItem('userName');
              localStorage.removeItem('isLoggedIn');
              navigate('/', { replace: true });
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
