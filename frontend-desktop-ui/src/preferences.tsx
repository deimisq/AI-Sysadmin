import { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';
import { DesktopPreferences } from './components/views/DesktopPreferences';
import { DesktopErrorBoundary } from './components/layout/DesktopErrorBoundary';
import { notifyDesktopReady } from './lib/bridge';
import './index.css';

function PreferencesApp() {
    useEffect(() => { notifyDesktopReady(); }, []);
    return <><DesktopPreferences /><Toaster theme="dark" /></>;
}

createRoot(document.getElementById('root')!).render(<DesktopErrorBoundary><PreferencesApp /></DesktopErrorBoundary>);
