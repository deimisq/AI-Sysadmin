import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { ServerExplorer } from '../explorer/ServerExplorer';
import { WorkspaceArea } from './WorkspaceArea';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { Settings, Folder, Search, Database } from 'lucide-react';

export function DesktopLayout() {
    const { sidebarVisible, toggleSidebar } = useWorkspaceStore();

    return (
        <div className="flex h-screen w-screen bg-[#1e1e1e] text-[#cccccc] overflow-hidden font-sans">
            {/* Activity Bar (Leftmost) */}
            <div className="w-12 bg-[#333333] flex flex-col items-center py-4 gap-6 border-r border-[#252526] z-10 shrink-0">
                <ActivityIcon icon={Folder} active />
                <ActivityIcon icon={Search} />
                <ActivityIcon icon={Database} />
                <div className="flex-1" />
                <ActivityIcon icon={Settings} />
            </div>

            {/* Main Content Split */}
            <div className="flex-1 flex overflow-hidden">
                <PanelGroup direction="horizontal">

                    {/* Sidebar Panel */}
                    {sidebarVisible && (
                        <>
                            <Panel defaultSize={20} minSize={15} maxSize={40} className="bg-[#252526] flex flex-col min-w-[200px]">
                                <ServerExplorer />
                            </Panel>
                            <PanelResizeHandle className="w-1 bg-[#1e1e1e] hover:bg-blue-600 transition-colors" />
                        </>
                    )}

                    {/* Workspace Panel */}
                    <Panel minSize={30}>
                        <WorkspaceArea />
                    </Panel>
                </PanelGroup>
            </div>

            {/* Status Bar (Bottom) */}
            {/* <div className="h-6 bg-[#007acc] text-white flex items-center px-4 text-xs select-none relative z-20 shrink-0">
                <span>Ready</span>
                <span className="ml-auto">Ln 1, Col 1</span>
            </div> */}
        </div>
    );
}

function ActivityIcon({ icon: Icon, active }: { icon: any, active?: boolean }) {
    return (
        <div className={`
            p-2 rounded cursor-pointer transition-all
            ${active ? 'text-white border-l-2 border-white bg-[#ffffff10]' : 'text-gray-400 hover:text-white'}
        `}>
            <Icon className="w-6 h-6" />
        </div>
    );
}
