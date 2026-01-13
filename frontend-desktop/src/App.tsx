import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './routes/login';
import Dashboard from './routes/dashboard';
import ServerConsole from './routes/console';
import { ScheduledReports } from './routes/scheduled-reports';
import { Profile } from './routes/profile';
import { Admin } from './routes/admin';
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
        </Routes>
        <Toaster position="top-right" />
      </HashRouter>
    </ThemeProvider>
  );
}
