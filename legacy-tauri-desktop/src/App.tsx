import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './routes/login';
import AcceptInvitation from './routes/accept-invitation';
import { DesktopLayout } from './components/layout/DesktopLayout';
import { isAuthenticated } from './lib/api';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/components/theme-provider';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  return isAuthenticated() ? <>{children}</> : <Navigate to="/login" />;
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <HashRouter>
        <Routes>
          {/* Public routes - must be before catch-all */}
          <Route path="/login" element={<Login />} />
          <Route path="/accept-invitation" element={<AcceptInvitation />} />

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
