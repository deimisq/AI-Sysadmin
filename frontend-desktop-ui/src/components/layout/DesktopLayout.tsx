import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useEffect } from 'react';
import { ServerExplorer } from '../explorer/ServerExplorer';
import { WorkspaceArea } from './WorkspaceArea';
import { IdeMenu } from './IdeMenu';
import { IdeTools } from './IdeTools';
import { ActivityRail, WorkspaceStatusBar } from './WorkspaceChrome';
import { AIChatPanel } from '../ai/AIChatPanel';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { OverlayContainer } from './OverlayContainer';
import { CommandPalette } from '../CommandPalette';

export function DesktopLayout() {
    const { sidebarVisible, aiPanelVisible, toolsVisible } = useWorkspaceStore();

    useEffect(() => {
        const frame = requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
        return () => cancelAnimationFrame(frame);
    }, [sidebarVisible, aiPanelVisible, toolsVisible]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!e.ctrlKey || !e.altKey || e.shiftKey || e.repeat) return;
            if (e.key.toLowerCase() === 'b') { e.preventDefault(); useWorkspaceStore.getState().toggleSidebar(); }
            if (e.key.toLowerCase() === 'i') { e.preventDefault(); useWorkspaceStore.getState().toggleAIPanel(); }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <div className="fluent-workspace flex flex-col h-screen w-screen bg-[#1e1e1e] text-[#cccccc] overflow-hidden">
            {/* Top Bar Navigation */}
            <IdeMenu />

            {/* Main Content Split */}
            <div className="flex-1 flex overflow-hidden relative">
                <ActivityRail />
                <PanelGroup direction="horizontal" autoSaveId="workspace-ide-compact-v2">

                    {/* Sidebar Panel */}
                    {sidebarVisible && (
                        <>
                            <Panel id="connections" order={1} defaultSize={Math.min(20, 240 / window.innerWidth * 100)} minSize={10} maxSize={30} className="bg-[#20232b] flex flex-col min-w-[160px] border-r border-[#30333b]">
                                <ServerExplorer />
                            </Panel>
                            <PanelResizeHandle className="w-1 bg-[#1e1e1e] hover:bg-blue-600 transition-colors" />
                        </>
                    )}

                    {/* Workspace Panel */}
                    <Panel id="sessions" order={2} minSize={30}>
                        <PanelGroup direction="vertical" autoSaveId="workspace-ide-tools-compact-v2">
                            <Panel id="editor" order={1} minSize={40}><WorkspaceArea /></Panel>
                            {toolsVisible && <><PanelResizeHandle className="h-1 bg-[#333] hover:bg-blue-500" /><Panel id="tools" order={2} defaultSize={16} minSize={10} maxSize={45}><IdeTools /></Panel></>}
                        </PanelGroup>
                    </Panel>

                    {/* AI Chat Panel (Right Side) */}
                    {aiPanelVisible && (
                        <>
                            <PanelResizeHandle className="w-1 bg-[#1e1e1e] hover:bg-blue-600 transition-colors" />
                            <Panel id="assistant" order={3} defaultSize={Math.min(26, 320 / window.innerWidth * 100)} minSize={16} maxSize={40} className="bg-[#1e1e1e] border-l border-[#333]">
                                <AIChatPanel />
                            </Panel>
                        </>
                    )}
                </PanelGroup>
                <OverlayContainer />
            </div>

            <WorkspaceStatusBar />

            {/* Global Overlays */}
            <CommandPalette />
        </div>
    );
}
