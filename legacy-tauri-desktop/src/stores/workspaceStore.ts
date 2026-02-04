import { create } from 'zustand';
import { type Server } from '../lib/api';

export type TabType = 'terminal' | 'rdp';
export type OverlayType = 'dashboard' | 'settings' | 'profile' | 'admin' | 'documentation' | 'reports' | 'help' | null;

export interface Tab {
    id: string;
    type: TabType;
    title: string;
    serverId?: string;
    server?: Server;
    data?: any;
}

interface WorkspaceState {
    tabs: Tab[];
    activeTabId: string | null;
    sidebarVisible: boolean;
    aiPanelVisible: boolean;
    activeOverlay: OverlayType; // New: Global overlay state

    // Actions
    openTab: (tab: Omit<Tab, 'id'> & { id?: string }) => void;
    closeTab: (id: string) => void;
    setActiveTab: (id: string) => void;
    toggleSidebar: () => void;
    toggleAIPanel: () => void;
    setActiveOverlay: (overlay: OverlayType) => void; // New action
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
    tabs: [],
    activeTabId: null,
    sidebarVisible: true,
    aiPanelVisible: true,
    activeOverlay: null,

    openTab: (tabData) => set((state) => {
        if (tabData.serverId) {
            const existing = state.tabs.find(t => t.serverId === tabData.serverId && t.type === tabData.type);
            if (existing) {
                return { activeTabId: existing.id, activeOverlay: null }; // Close overlay when opening tab
            }
        }

        const id = tabData.id || crypto.randomUUID();
        const newTab = { ...tabData, id };

        return {
            tabs: [...state.tabs, newTab],
            activeTabId: id,
            activeOverlay: null // Close overlay when opening tab
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

    setActiveTab: (id) => set({ activeTabId: id, activeOverlay: null }),
    toggleSidebar: () => set((state) => ({ sidebarVisible: !state.sidebarVisible })),
    toggleAIPanel: () => set((state) => ({ aiPanelVisible: !state.aiPanelVisible })),
    setActiveOverlay: (overlay) => set({ activeOverlay: overlay }),
}));
