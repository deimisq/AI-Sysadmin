import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './routes/login';
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
          <Route path="/login" element={<Login />} />
          {/* Catch-all route to render the IDE layout for everything else */}
          <Route
            path="/*"
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
