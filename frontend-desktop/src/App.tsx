import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './routes/login';
import Dashboard from './routes/dashboard';
import ServerConsole from './routes/console';
import { ScheduledReports } from './routes/scheduled-reports';
import { Profile } from './routes/profile';
import { Admin } from './routes/admin';
import { Documentation } from './routes/documentation';
import { SSHTestRoute } from './routes/ssh-test';
import { isAuthenticated } from './lib/api';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/components/theme-provider';
import { TerminalProvider } from './contexts/TerminalContext';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  return isAuthenticated() ? <>{children}</> : <Navigate to="/login" />;
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TerminalProvider>
        <HashRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/server/:id/console"
              element={
                <PrivateRoute>
                  <ServerConsole />
                </PrivateRoute>
              }
            />
            <Route
              path="/scheduled-reports"
              element={
                <PrivateRoute>
                  <ScheduledReports />
                </PrivateRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <PrivateRoute>
                  <Profile />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <PrivateRoute>
                  <Admin />
                </PrivateRoute>
              }
            />
            <Route
              path="/documentation"
              element={
                <PrivateRoute>
                  <Documentation />
                </PrivateRoute>
              }
            />
            <Route
              path="/ssh-test"
              element={
                <PrivateRoute>
                  <SSHTestRoute />
                </PrivateRoute>
              }
            />
          </Routes>
          <Toaster position="top-right" />
        </HashRouter>
      </TerminalProvider>
    </ThemeProvider>
  );
}
