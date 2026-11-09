import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './routes/login';
import AcceptInvitation from './routes/accept-invitation';
import RdpDev from './routes/rdp-dev';
import { DesktopLayout } from './components/layout/DesktopLayout';
import { isAuthenticated } from './lib/api';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/components/theme-provider';
import { useEffect } from 'react';
import { notifyDesktopReady, isPreferencesWindow } from './lib/bridge';
import { DesktopPreferences } from './components/views/DesktopPreferences';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  return isAuthenticated() ? <>{children}</> : <Navigate to="/login" />;
}

export default function App() {
  useEffect(() => { notifyDesktopReady(); }, []);
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <HashRouter>
        <Routes>
          {/* Public routes - must be before catch-all */}
          <Route path="/login" element={<Login />} />
          <Route path="/accept-invitation" element={<AcceptInvitation />} />
          <Route path="/rdp-dev" element={<RdpDev />} />
          <Route path="/preferences" element={isPreferencesWindow() ? <DesktopPreferences /> : <Navigate to="/" replace />} />

          {/* Default route - redirect to dashboard if authenticated, login otherwise */}
          <Route path="/" element={
            <PrivateRoute>
              <DesktopLayout />
            </PrivateRoute>
          } />

          {/* Catch-all route for authenticated app */}
          <Route
            path="*"
            element={
              <PrivateRoute>
                <DesktopLayout />
              </PrivateRoute>
            }
          />
        </Routes>
        <Toaster position="top-right" />
      </HashRouter>
    </ThemeProvider>
  );
}
