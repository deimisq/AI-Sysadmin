import { create } from 'zustand';
import { type Server } from '../lib/api';

export type TabType = 'terminal' | 'dashboard' | 'settings' | 'rdp';

export interface Tab {
    id: string;
    type: TabType;
    title: string;
    serverId?: string; // If tied to a server
    server?: Server;   // Full server object for connection
    data?: any;       // Extra data (e.g. initial command)
}

interface WorkspaceState {
    tabs: Tab[];
    activeTabId: string | null;
    sidebarVisible: boolean;

    // Actions
    openTab: (tab: Omit<Tab, 'id'> & { id?: string }) => void;
    closeTab: (id: string) => void;
    setActiveTab: (id: string) => void;
    toggleSidebar: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
    tabs: [],
    activeTabId: null,
    sidebarVisible: true,

    openTab: (tabData) => set((state) => {
        // Dedup logic: if tab with same serverId/type exists, focus it
        if (tabData.serverId) {
            const existing = state.tabs.find(t => t.serverId === tabData.serverId && t.type === tabData.type);
            if (existing) {
                return { activeTabId: existing.id };
            }
        }

        const id = tabData.id || crypto.randomUUID();
        const newTab = { ...tabData, id };

        return {
            tabs: [...state.tabs, newTab],
            activeTabId: id
        };
    }),

    closeTab: (id) => set((state) => {
        const newTabs = state.tabs.filter(t => t.id !== id);
        let newActiveId = state.activeTabId;

        if (state.activeTabId === id) {
            newActiveId = newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null;
        }

        return {
            tabs: newTabs,
            activeTabId: newActiveId
        };
    }),

    setActiveTab: (id) => set({ activeTabId: id }),
    toggleSidebar: () => set((state) => ({ sidebarVisible: !state.sidebarVisible })),
}));
