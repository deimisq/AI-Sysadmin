import React, { createContext, useContext, useState, type ReactNode, useCallback } from 'react';
import { type Server } from '../lib/api';

export interface TerminalTab {
    id: string; // Unique ID (UUID) used for PTY session ID
    title: string;
    server: Server;
}

interface TerminalContextType {
    tabs: TerminalTab[];
    activeTabId: string | null;
    openSession: (server: Server) => void;
    closeSession: (id: string) => void;
    setActiveTab: (id: string) => void;
    updateTabTitle: (id: string, title: string) => void;
}

const TerminalContext = createContext<TerminalContextType | undefined>(undefined);

export function TerminalProvider({ children }: { children: ReactNode }) {
    const [tabs, setTabs] = useState<TerminalTab[]>([]);
    const [activeTabId, setActiveTabId] = useState<string | null>(null);

    const openSession = useCallback((server: Server) => {
        setTabs(currentTabs => {
            // Check if a session for this server already exists
            const existing = currentTabs.find(t => t.server.id === server.id);
            if (existing) {
                // Already exists, just focus it
                setTimeout(() => setActiveTabId(existing.id), 0);
                return currentTabs;
            }

            const newTab: TerminalTab = {
                id: crypto.randomUUID(),
                title: server.hostname,
                server: server
            };

            setTimeout(() => setActiveTabId(newTab.id), 0);
            return [...currentTabs, newTab];
        });
    }, []);

    const closeSession = useCallback((id: string) => {
        setTabs(prev => prev.filter(t => t.id !== id));
        // Active tab logic handled by effect
    }, []);

    // Effect to ensure activeTabId is valid
    React.useEffect(() => {
        if (tabs.length === 0) {
            setActiveTabId(null);
        } else if (activeTabId && !tabs.find(t => t.id === activeTabId)) {
            // Active tab was closed/gone, select last one
            setActiveTabId(tabs[tabs.length - 1].id);
        } else if (!activeTabId && tabs.length > 0) {
            // select last one
            setActiveTabId(tabs[tabs.length - 1].id);
        }
    }, [tabs, activeTabId]);

    const updateTabTitle = useCallback((id: string, title: string) => {
        setTabs(prev => prev.map(t => t.id === id ? { ...t, title } : t));
    }, []);

    return (
        <TerminalContext.Provider value={{
            tabs,
            activeTabId,
            openSession,
            closeSession,
            setActiveTab: setActiveTabId,
            updateTabTitle
        }}>
            {children}
        </TerminalContext.Provider>
    );
}

export const useTerminal = () => {
    const context = useContext(TerminalContext);
    if (!context) throw new Error("useTerminal must be used within TerminalProvider");
    return context;
};
