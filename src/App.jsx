import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import { useEffect, useState } from 'react';
import PageNotFound from './lib/PageNotFound';
import CrewLogin from './pages/CrewLogin';
import AppLayout from './components/AppLayout';
import Dashboard from './pages/Dashboard';
import Flights from './pages/Flights';
import FlightDetail from './pages/FlightDetail';
import LOA from './pages/LOA';
import Profile from './pages/Profile';
import StaffDatabase from './pages/StaffDatabase';
import SeniorManagement from './pages/SeniorManagement';
import ManageNotices from './pages/admin/ManageNotices';
import ManageCrew from './pages/admin/ManageCrew';
import ManageLOA from './pages/admin/ManageLOA';
import ManageSeniorManagement from './pages/admin/ManageSeniorManagement';
import {
  clearSession,
  getSessionCrewMember,
  getStoredThemePreference,
  isBoardAdmin,
  migrateLegacyLocalData,
  refreshSession,
  setStoredThemePreference,
  subscribeToStore,
} from '@/lib/dataStore';
import { hasRole } from '@/lib/roleUtils';

const LOGOUT_DELAY_MS = 750;

function applyTheme(themePreference) {
  if (typeof document === 'undefined') return;

  const resolvedTheme = themePreference === 'light'
    ? 'light'
    : themePreference === 'dark'
      ? 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

  document.documentElement.classList.toggle('dark', resolvedTheme === 'dark');
  document.documentElement.dataset.theme = resolvedTheme;
}

function ProtectedRoute({ crewMember, canAccess, children }) {
  if (!canAccess(crewMember)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

const AuthenticatedApp = () => {
  const [crewMember, setCrewMember] = useState(() => getSessionCrewMember());
  const [checkingSession, setCheckingSession] = useState(true);
  const [themePreference, setThemePreference] = useState(() => {
    const session = getSessionCrewMember();
    return session?.preferred_theme || getStoredThemePreference(session?.id) || 'dark';
  });

  useEffect(() => {
    const loadSession = async () => {
      await migrateLegacyLocalData();
      const nextMember = await refreshSession() || getSessionCrewMember();
      setCrewMember(nextMember);
      setThemePreference(nextMember?.preferred_theme || getStoredThemePreference(nextMember?.id) || 'dark');
      setCheckingSession(false);
    };

    loadSession();

    return subscribeToStore(() => {
      loadSession();
    });
  }, []);

  useEffect(() => {
    applyTheme(themePreference);
  }, [themePreference]);

  if (checkingSession) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (!crewMember) {
    return <CrewLogin onLogin={setCrewMember} />;
  }

  const handleLogout = async () => {
    await new Promise(resolve => setTimeout(resolve, LOGOUT_DELAY_MS));
    clearSession();
    setCrewMember(null);
  };

  const handleThemeChange = (nextTheme) => {
    setThemePreference(nextTheme);
    if (crewMember?.id) {
      setStoredThemePreference(crewMember.id, nextTheme);
    }
  };

  return (
    <Routes>
      <Route element={<AppLayout crewMember={crewMember} onLogout={handleLogout} themePreference={themePreference} onThemeChange={handleThemeChange} />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/flights" element={<Flights />} />
        <Route path="/flights/:id" element={<FlightDetail />} />
        <Route path="/loa" element={<LOA />} />
        <Route path="/staff-database" element={<StaffDatabase />} />
        <Route path="/senior-management" element={<SeniorManagement />} />
        <Route path="/profile" element={<Profile />} />
        <Route
          path="/admin/notices"
          element={
            <ProtectedRoute crewMember={crewMember} canAccess={isBoardAdmin}>
              <ManageNotices />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/crew"
          element={
            <ProtectedRoute crewMember={crewMember} canAccess={(member) => hasRole(member, 'Executive Board')}>
              <ManageCrew />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/loa"
          element={
            <ProtectedRoute crewMember={crewMember} canAccess={isBoardAdmin}>
              <ManageLOA />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/senior-management"
          element={
            <ProtectedRoute crewMember={crewMember} canAccess={isBoardAdmin}>
              <ManageSeniorManagement />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<PageNotFound />} />
      </Route>
    </Routes>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <Router>
        <AuthenticatedApp />
      </Router>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
