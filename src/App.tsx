import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TransactionProvider } from './context/TransactionContext';
import { InvestigationProvider } from './context/InvestigationContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { LandingPage } from './components/pages/LandingPage';
import { LoginPage } from './components/pages/LoginPage';
import { DashboardPage } from './components/pages/DashboardPage';
import { UploadPage } from './components/pages/UploadPage';
import { MonitoringPage } from './components/pages/MonitoringPage';
import { InvestigationPage } from './components/pages/InvestigationPage';
import { ReportsPage } from './components/pages/ReportsPage';
import { SettingsPage } from './components/pages/SettingsPage';
import { FraudGraphModule } from './components/graph/FraudGraphModule';
import { Transaction } from './types';

// URL Routing Map
const PAGE_TO_PATH: Record<string, string> = {
  landing: '/',
  login: '/login',
  dashboard: '/dashboard',
  monitoring: '/live-monitoring',
  upload: '/upload',
  investigation: '/investigations',
  intelligence: '/intelligence',
  reports: '/reports',
  settings: '/rules',
};

const PATH_TO_PAGE: Record<string, string> = {
  '/': 'landing',
  '/login': 'login',
  '/dashboard': 'dashboard',
  '/monitoring': 'monitoring',
  '/live-monitoring': 'monitoring',
  '/upload': 'upload',
  '/investigation': 'investigation',
  '/investigations': 'investigation',
  '/intelligence': 'intelligence',
  '/graph': 'intelligence',
  '/relationship-graph': 'intelligence',
  '/reports': 'reports',
  '/settings': 'settings',
  '/rules': 'settings',
};

function getInitialPage(): string {
  if (typeof window === 'undefined') return 'landing';
  const path = window.location.pathname.toLowerCase();
  return PATH_TO_PAGE[path] || 'landing';
}

function MainApp() {
  const { isAuthenticated, isStudioEnvironment, isLoading, loginWithGoogle } = useAuth();
  const [activePage, setActivePage] = useState<string>(() => getInitialPage());
  const [selectedTransactionForInvestigation, setSelectedTransactionForInvestigation] = useState<Transaction | null>(null);

  // Sync state with browser URL
  const updateUrlForPage = useCallback((page: string) => {
    if (typeof window === 'undefined') return;
    const targetPath = PAGE_TO_PATH[page] || '/';
    if (window.location.pathname !== targetPath) {
      window.history.pushState({ page }, '', targetPath);
    }
  }, []);

  // Handle page navigation
  const handleNavigate = useCallback((page: string) => {
    const isPublicPage = page === 'landing' || page === 'login';

    // If navigating to a protected page while not authenticated:
    if (!isPublicPage && !isAuthenticated) {
      if (isStudioEnvironment) {
        // Inside AI Studio: auto-authenticate and proceed
        loginWithGoogle().then(() => {
          setActivePage(page);
          updateUrlForPage(page);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        return;
      } else {
        // Outside AI Studio: redirect to login
        setActivePage('login');
        updateUrlForPage('login');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }

    // If navigating to login page while already authenticated:
    if (page === 'login' && isAuthenticated) {
      setActivePage('dashboard');
      updateUrlForPage('dashboard');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setActivePage(page);
    updateUrlForPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [isAuthenticated, isStudioEnvironment, loginWithGoogle, updateUrlForPage]);

  // Route protection and automatic redirect effect
  useEffect(() => {
    if (isLoading) return;

    const currentPath = typeof window !== 'undefined' ? window.location.pathname.toLowerCase() : '/';
    const currentRoutePage = PATH_TO_PAGE[currentPath] || activePage;

    if (isAuthenticated) {
      // If authenticated and currently on login page (or route /login), redirect to dashboard immediately
      if (activePage === 'login' || currentRoutePage === 'login') {
        setActivePage('dashboard');
        updateUrlForPage('dashboard');
      }
    } else {
      // If unauthenticated and trying to access a protected page, redirect to login
      const isPublic = currentRoutePage === 'landing' || currentRoutePage === 'login' || activePage === 'landing' || activePage === 'login';
      if (!isPublic) {
        if (isStudioEnvironment) {
          loginWithGoogle().then(() => {
            setActivePage(currentRoutePage);
            updateUrlForPage(currentRoutePage);
          });
        } else {
          setActivePage('login');
          updateUrlForPage('login');
        }
      }
    }
  }, [isAuthenticated, isLoading, activePage, isStudioEnvironment, loginWithGoogle, updateUrlForPage]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const page = getInitialPage();
      handleNavigate(page);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [handleNavigate]);

  const handleNavigateToInvestigation = (transaction: Transaction) => {
    setSelectedTransactionForInvestigation(transaction);
    handleNavigate('investigation');
  };

  // Launch Enterprise Console logic from Landing Page
  const handleLaunchConsole = () => {
    if (isAuthenticated || isStudioEnvironment) {
      handleNavigate('dashboard');
    } else {
      handleNavigate('login');
    }
  };

  const handleLaunchUpload = () => {
    if (isAuthenticated || isStudioEnvironment) {
      handleNavigate('upload');
    } else {
      handleNavigate('login');
    }
  };

  return (
    <div className="min-h-screen bg-enterprise-canvas text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Floating Header */}
      <Header
        activePage={activePage}
        onNavigate={handleNavigate}
      />

      {/* Main Body */}
      {activePage === 'landing' ? (
        <main className="flex-1 w-full">
          <LandingPage
            onEnterApp={handleLaunchConsole}
            onNavigateToUpload={handleLaunchUpload}
          />
        </main>
      ) : activePage === 'login' ? (
        <main className="flex-1 w-full">
          <LoginPage
            onSuccess={() => {
              setActivePage('dashboard');
              updateUrlForPage('dashboard');
            }}
            onNavigateHome={() => handleNavigate('landing')}
          />
        </main>
      ) : (
        <div className="flex-1 flex max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 gap-6 pb-12">
          {/* Floating Sidebar */}
          <div className="hidden lg:block">
            <Sidebar
              activePage={activePage}
              onNavigate={handleNavigate}
            />
          </div>

          {/* Page Content Container */}
          <main className="flex-1 min-w-0 py-2 sm:py-3">
            {activePage === 'dashboard' && (
              <DashboardPage
                onNavigateToInvestigation={handleNavigateToInvestigation}
                onNavigateToUpload={() => handleNavigate('upload')}
                onNavigateToReports={() => handleNavigate('reports')}
              />
            )}

            {activePage === 'monitoring' && (
              <MonitoringPage
                onNavigateToInvestigation={handleNavigateToInvestigation}
              />
            )}

            {activePage === 'upload' && (
              <UploadPage
                onNavigateToDashboard={() => handleNavigate('dashboard')}
                onNavigateToInvestigation={handleNavigateToInvestigation}
              />
            )}

            {activePage === 'investigation' && (
              <InvestigationPage
                initialTransaction={selectedTransactionForInvestigation}
                onNavigateToDashboard={() => handleNavigate('dashboard')}
              />
            )}

            {activePage === 'intelligence' && (
              <FraudGraphModule
                initialTransaction={selectedTransactionForInvestigation || undefined}
              />
            )}

            {activePage === 'reports' && (
              <ReportsPage />
            )}

            {activePage === 'settings' && (
              <SettingsPage />
            )}
          </main>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <TransactionProvider>
        <InvestigationProvider>
          <MainApp />
        </InvestigationProvider>
      </TransactionProvider>
    </AuthProvider>
  );
}
