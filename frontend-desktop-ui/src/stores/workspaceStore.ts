import { create } from 'zustand';
import { type Server } from '../lib/api';
import { hasNativePreferences, sendCommand } from '../lib/bridge';
import { type PreferencesSection } from '../lib/preferences';

export type TabType = 'terminal' | 'rdp';
export type OverlayType = 'dashboard' | 'catalog' | 'settings' | 'profile' | 'admin' | 'documentation' | 'reports' | 'help' | null;

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
    preferencesSection: PreferencesSection;
    openPreferences: (section?: PreferencesSection) => void;
    nativeSessions: Record<number, string>;
    toolsVisible: boolean;
    toggleTools: () => void;
    explorerAction: 'add-server' | 'add-folder' | 'search' | null;
    requestExplorerAction: (action: 'add-server' | 'add-folder' | 'search' | null) => void;
    registerNativeSession: (serverId: number, sessionId: string) => void;
    clearNativeSession: (serverId: number, expectedSessionId: string) => void;

    // Actions
    openTab: (tab: Omit<Tab, 'id'> & { id?: string }) => void;
    closeTab: (id: string) => void;
    setActiveTab: (id: string) => void;
    toggleSidebar: () => void;
    toggleAIPanel: () => void;
    setActiveOverlay: (overlay: OverlayType) => void; // New action
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
    tabs: [],
    activeTabId: null,
    sidebarVisible: true,
    aiPanelVisible: true,
    activeOverlay: null,
    preferencesSection: 'general',
    openPreferences: (section = 'general') => {
        set({ preferencesSection: section });
        if (hasNativePreferences()) {
            void sendCommand('preferences_open', { section, enterprise: window.sessionStorage.getItem('workspace-mode') === 'enterprise' })
                .catch(() => set({ activeOverlay: 'settings' }));
        } else set({ activeOverlay: 'settings' });
    },
    nativeSessions: {},
    toolsVisible: false,
    toggleTools: () => set(state => ({ toolsVisible: !state.toolsVisible })),
    explorerAction: null,
    requestExplorerAction: action => set(action ? { explorerAction: action, sidebarVisible: true, activeOverlay: null } : { explorerAction: null }),
    registerNativeSession: (serverId, sessionId) => set(state => ({ nativeSessions: { ...state.nativeSessions, [serverId]: sessionId } })),
    clearNativeSession: (serverId, expected) => set(state => {
        if (state.nativeSessions[serverId] !== expected) return {};
        const sessions = { ...state.nativeSessions }; delete sessions[serverId];
        return { nativeSessions: sessions };
    }),

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
            const closedIndex = state.tabs.findIndex(t => t.id === id);
            newActiveId = newTabs[Math.min(closedIndex, newTabs.length - 1)]?.id ?? null;
        }

        return {
            tabs: newTabs,
            activeTabId: newActiveId
        };
    }),

    setActiveTab: (id) => set({ activeTabId: id, activeOverlay: null }),
    toggleSidebar: () => set((state) => ({ sidebarVisible: !state.sidebarVisible })),
    toggleAIPanel: () => set((state) => ({ aiPanelVisible: !state.aiPanelVisible })),
    setActiveOverlay: (overlay) => {
        if (overlay === 'settings') {
            get().openPreferences();
            return;
        }
        set({ activeOverlay: overlay });
    },
}));
