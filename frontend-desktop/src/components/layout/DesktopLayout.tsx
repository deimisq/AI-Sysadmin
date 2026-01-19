import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { ServerExplorer } from '../explorer/ServerExplorer';
import { WorkspaceArea } from './WorkspaceArea';
import { TopBar } from './TopBar';
import { AIChatPanel } from '../ai/AIChatPanel';
import { useWorkspaceStore } from '../../stores/workspaceStore';

export function DesktopLayout() {
    const { sidebarVisible, aiPanelVisible } = useWorkspaceStore();

    return (
        <div className="flex flex-col h-screen w-screen bg-[#1e1e1e] text-[#cccccc] overflow-hidden font-sans">
            {/* Top Bar Navigation */}
            <TopBar />

            {/* Main Content Split */}
            <div className="flex-1 flex overflow-hidden relative">
                <PanelGroup direction="horizontal">

                    {/* Sidebar Panel */}
                    {sidebarVisible && (
                        <>
                            <Panel defaultSize={18} minSize={15} maxSize={30} className="bg-[#252526] flex flex-col min-w-[200px] border-r border-[#1e1e1e]">
                                <ServerExplorer />
                            </Panel>
                            <PanelResizeHandle className="w-1 bg-[#1e1e1e] hover:bg-blue-600 transition-colors" />
                        </>
                    )}

                    {/* Workspace Panel */}
                    <Panel minSize={30}>
                        <WorkspaceArea />
                    </Panel>

                    {/* AI Chat Panel (Right Side) */}
                    {aiPanelVisible && (
                        <>
                            <PanelResizeHandle className="w-1 bg-[#1e1e1e] hover:bg-blue-600 transition-colors" />
                            <Panel defaultSize={25} minSize={20} maxSize={40} className="bg-[#1e1e1e] border-l border-[#333]">
                                <AIChatPanel />
                            </Panel>
                        </>
                    )}
                </PanelGroup>
            </div>
        </div>
    );
}
