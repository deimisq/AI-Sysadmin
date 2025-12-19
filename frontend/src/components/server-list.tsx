"use client";

import { useEffect, useState, useMemo } from "react";
import { fetchServers, deleteServer, fetchGroups } from "@/lib/api";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Terminal,
    Server as ServerIcon,
    Trash2,
    FolderOpen,
    Activity,
    LayoutGrid,
    Grid3x3,
    List,
    Table,
    ChevronDown,
    ChevronRight,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Search,
    Filter
} from "lucide-react";
import { useI18n } from "@/lib/i18n-context";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Table as UITable,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface Server {
    id: number;
    hostname: string;
    ip_address: string;
    description: string;
    os_info: string;
    group_id?: number;
}

interface ServerGroup {
    id: number;
    name: string;
    description?: string;
    color?: string;
}

type ViewMode = 'cards' | 'compact' | 'list' | 'details';
type SortField = 'hostname' | 'ip_address' | 'group' | 'os_info';
type SortOrder = 'asc' | 'desc';

interface ServerListProps {
    onDiagnose: (server: Server) => void;
    onEdit: (server: Server) => void;
    refreshKey?: number;
}

export function ServerList({ onDiagnose, onEdit, refreshKey }: ServerListProps) {
    const { t } = useI18n();
    const [servers, setServers] = useState<Server[]>([]);
    const [groups, setGroups] = useState<ServerGroup[]>([]);
    const [loading, setLoading] = useState(true);
    
    // View and sort state
    const [viewMode, setViewMode] = useState<ViewMode>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('serverViewMode') as ViewMode) || 'cards';
        }
        return 'cards';
    });
    const [sortField, setSortField] = useState<SortField>('hostname');
    const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterGroup, setFilterGroup] = useState<number | null>(null);
    const [collapsedGroups, setCollapsedGroups] = useState<Set<number>>(new Set());

    useEffect(() => {
        loadData();
    }, [refreshKey]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('serverViewMode', viewMode);
        }
    }, [viewMode]);

    const loadData = async () => {
        try {
            const [serversData, groupsData] = await Promise.all([
                fetchServers(),
                fetchGroups()
            ]);
            setServers(serversData);
            setGroups(groupsData);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (serverId: number) => {
        if (!confirm(t.serverList?.deleteConfirm || "Are you sure you want to delete this server?")) {
            return;
        }
        try {
            await deleteServer(serverId);
            await loadData();
        } catch (error) {
            console.error(error);
            alert(t.serverList?.deleteError || "Failed to delete server");
        }
    };

    const toggleGroupCollapse = (groupId: number) => {
        setCollapsedGroups(prev => {
            const newSet = new Set(prev);
            if (newSet.has(groupId)) {
                newSet.delete(groupId);
            } else {
                newSet.add(groupId);
            }
            return newSet;
        });
    };

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    const getGroupName = (groupId?: number) => {
        if (!groupId) return '';
        return groups.find(g => g.id === groupId)?.name || '';
    };

    // Filter and sort servers
    const filteredAndSortedServers = useMemo(() => {
        let result = [...servers];
        
        // Filter by search
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(s => 
                s.hostname.toLowerCase().includes(query) ||
                s.ip_address.toLowerCase().includes(query) ||
                s.description?.toLowerCase().includes(query) ||
                s.os_info?.toLowerCase().includes(query)
            );
        }
        
        // Filter by group
        if (filterGroup !== null) {
            result = result.filter(s => s.group_id === filterGroup);
        }
        
        // Sort
        result.sort((a, b) => {
            let aVal: string, bVal: string;
            switch (sortField) {
                case 'hostname':
                    aVal = a.hostname.toLowerCase();
                    bVal = b.hostname.toLowerCase();
                    break;
                case 'ip_address':
                    aVal = a.ip_address;
                    bVal = b.ip_address;
                    break;
                case 'group':
                    aVal = getGroupName(a.group_id).toLowerCase();
                    bVal = getGroupName(b.group_id).toLowerCase();
                    break;
                case 'os_info':
                    aVal = (a.os_info || '').toLowerCase();
                    bVal = (b.os_info || '').toLowerCase();
                    break;
                default:
                    aVal = a.hostname.toLowerCase();
                    bVal = b.hostname.toLowerCase();
            }
            const cmp = aVal.localeCompare(bVal);
            return sortOrder === 'asc' ? cmp : -cmp;
        });
        
        return result;
    }, [servers, searchQuery, filterGroup, sortField, sortOrder, groups]);

    if (loading) return <div className="flex items-center justify-center p-8">{t.common?.loading || "Loading..."}</div>;

    // View mode icons
    const viewModeIcons = {
        cards: LayoutGrid,
        compact: Grid3x3,
        list: List,
        details: Table
    };

    const viewModeLabels = {
        cards: t.serverList?.viewCards || "Cards",
        compact: t.serverList?.viewCompact || "Compact",
        list: t.serverList?.viewList || "List",
        details: t.serverList?.viewDetails || "Details"
    };

    const sortLabels = {
        hostname: t.serverList?.sortName || "Name",
        ip_address: t.serverList?.sortIP || "IP Address",
        group: t.serverList?.sortGroup || "Group",
        os_info: t.serverList?.sortOS || "OS"
    };

    // Toolbar
    const Toolbar = () => (
        <div className="flex flex-col sm:flex-row gap-3 mb-6 p-3 bg-muted/30 rounded-lg border">
            {/* Search */}
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder={t.serverList?.searchPlaceholder || "Search servers..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                />
            </div>
            
            {/* Group Filter */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="min-w-[140px] justify-between">
                        <Filter className="mr-2 h-4 w-4" />
                        {filterGroup === null 
                            ? (t.serverList?.allGroups || "All Groups")
                            : getGroupName(filterGroup) || "Unknown"
                        }
                        <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setFilterGroup(null)}>
                        {t.serverList?.allGroups || "All Groups"}
                    </DropdownMenuItem>
                    {groups.map(group => (
                        <DropdownMenuItem key={group.id} onClick={() => setFilterGroup(group.id)}>
                            <FolderOpen className="mr-2 h-4 w-4" style={{ color: group.color }} />
                            {group.name}
                        </DropdownMenuItem>
                    ))}
                    <DropdownMenuItem onClick={() => setFilterGroup(0)}>
                        <ServerIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                        {t.serverList?.ungrouped || "Ungrouped"}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Sort */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="min-w-[130px] justify-between">
                        {sortOrder === 'asc' ? <ArrowUp className="mr-2 h-4 w-4" /> : <ArrowDown className="mr-2 h-4 w-4" />}
                        {sortLabels[sortField]}
                        <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    {(Object.keys(sortLabels) as SortField[]).map(field => (
                        <DropdownMenuItem key={field} onClick={() => handleSort(field)}>
                            {sortField === field && (sortOrder === 'asc' ? <ArrowUp className="mr-2 h-4 w-4" /> : <ArrowDown className="mr-2 h-4 w-4" />)}
                            {sortLabels[field]}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
            
            {/* View Mode Switcher */}
            <div className="flex border rounded-md">
                {(Object.keys(viewModeIcons) as ViewMode[]).map(mode => {
                    const Icon = viewModeIcons[mode];
                    return (
                        <Button
                            key={mode}
                            variant={viewMode === mode ? "default" : "ghost"}
                            size="icon"
                            onClick={() => setViewMode(mode)}
                            title={viewModeLabels[mode]}
                            className="rounded-none first:rounded-l-md last:rounded-r-md"
                        >
                            <Icon className="h-4 w-4" />
                        </Button>
                    );
                })}
            </div>
        </div>
    );

    // Action Buttons (shared across views)
    const ActionButtons = ({ server, compact = false }: { server: Server; compact?: boolean }) => (
        <div className={`flex gap-1 ${compact ? '' : 'gap-2 flex-wrap'}`}>
            <Button
                variant="default"
                size={compact ? "sm" : "default"}
                className={compact ? "" : "flex-1 min-w-[100px]"}
                onClick={() => window.location.href = `/dashboard/server/${server.id}/console`}
            >
                <Terminal className={`${compact ? '' : 'mr-2'} h-4 w-4`} />
                {!compact && "Console"}
            </Button>
            <Button
                variant="outline"
                size={compact ? "sm" : "default"}
                className={compact ? "" : "flex-1 min-w-[100px]"}
                onClick={() => onDiagnose(server)}
            >
                <Activity className={`${compact ? '' : 'mr-2'} h-4 w-4`} />
                {!compact && (t.serverList?.diagnose || "Diagnose")}
            </Button>
            <Button variant="outline" size="icon" onClick={() => onEdit(server)} className={compact ? "h-8 w-8" : ""}>
                <span className="sr-only">Edit</span>✏️
            </Button>
            <Button variant="destructive" size="icon" onClick={() => handleDelete(server.id)} className={compact ? "h-8 w-8" : ""}>
                <Trash2 className="h-4 w-4" />
            </Button>
        </div>
    );

    // Cards View (Original)
    const renderCardsView = (serverList: Server[]) => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {serverList.map(server => (
                <Card key={server.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{server.hostname}</CardTitle>
                        <ServerIcon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{server.ip_address}</div>
                        <p className="text-xs text-muted-foreground">{server.os_info} - {server.description}</p>
                    </CardContent>
                    <CardFooter>
                        <ActionButtons server={server} />
                    </CardFooter>
                </Card>
            ))}
        </div>
    );

    // Compact View
    const renderCompactView = (serverList: Server[]) => (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {serverList.map(server => (
                <Card key={server.id} className="hover:shadow-md transition-shadow p-3">
                    <div className="flex flex-col items-center text-center gap-2">
                        <ServerIcon className="h-8 w-8 text-primary" />
                        <div>
                            <p className="font-medium text-sm truncate w-full" title={server.hostname}>{server.hostname}</p>
                            <p className="text-xs text-muted-foreground">{server.ip_address}</p>
                        </div>
                        <div className="flex gap-1 mt-2">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => window.location.href = `/dashboard/server/${server.id}/console`}>
                                <Terminal className="h-3 w-3" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onDiagnose(server)}>
                                <Activity className="h-3 w-3" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(server)}>
                                ✏️
                            </Button>
                        </div>
                    </div>
                </Card>
            ))}
        </div>
    );

    // List View
    const renderListView = (serverList: Server[]) => (
        <div className="space-y-2">
            {serverList.map(server => (
                <div key={server.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                        <ServerIcon className="h-5 w-5 text-primary" />
                        <div>
                            <p className="font-medium">{server.hostname}</p>
                            <p className="text-sm text-muted-foreground">{server.ip_address} • {server.os_info}</p>
                        </div>
                    </div>
                    <ActionButtons server={server} compact />
                </div>
            ))}
        </div>
    );

    // Details View (Table)
    const renderDetailsView = (serverList: Server[]) => (
        <div className="border rounded-lg overflow-hidden">
            <UITable>
                <TableHeader>
                    <TableRow>
                        <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('hostname')}>
                            <div className="flex items-center gap-1">
                                Hostname
                                {sortField === 'hostname' && (sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                            </div>
                        </TableHead>
                        <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('ip_address')}>
                            <div className="flex items-center gap-1">
                                IP Address
                                {sortField === 'ip_address' && (sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                            </div>
                        </TableHead>
                        <TableHead className="cursor-pointer hover:bg-muted/50 hidden md:table-cell" onClick={() => handleSort('os_info')}>
                            <div className="flex items-center gap-1">
                                OS
                                {sortField === 'os_info' && (sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                            </div>
                        </TableHead>
                        <TableHead className="cursor-pointer hover:bg-muted/50 hidden lg:table-cell" onClick={() => handleSort('group')}>
                            <div className="flex items-center gap-1">
                                Group
                                {sortField === 'group' && (sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                            </div>
                        </TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {serverList.map(server => (
                        <TableRow key={server.id}>
                            <TableCell className="font-medium">{server.hostname}</TableCell>
                            <TableCell>{server.ip_address}</TableCell>
                            <TableCell className="hidden md:table-cell">{server.os_info || '-'}</TableCell>
                            <TableCell className="hidden lg:table-cell">{getGroupName(server.group_id) || '-'}</TableCell>
                            <TableCell className="text-right">
                                <ActionButtons server={server} compact />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </UITable>
        </div>
    );

    const renderServers = (serverList: Server[]) => {
        switch (viewMode) {
            case 'compact': return renderCompactView(serverList);
            case 'list': return renderListView(serverList);
            case 'details': return renderDetailsView(serverList);
            default: return renderCardsView(serverList);
        }
    };

    // Group servers for grouped display (only in cards and compact modes when not filtering)
    const shouldShowGrouped = ['cards', 'compact'].includes(viewMode) && filterGroup === null && !searchQuery;
    
    const ungroupedServers = filteredAndSortedServers.filter(s => !s.group_id);
    const groupedServers = groups.map(group => ({
        group,
        servers: filteredAndSortedServers.filter(s => s.group_id === group.id)
    })).filter(g => g.servers.length > 0);

    return (
        <div className="space-y-6">
            <Toolbar />
            
            {/* Server count */}
            <div className="text-sm text-muted-foreground">
                {filteredAndSortedServers.length} {filteredAndSortedServers.length === 1 ? 'server' : 'servers'}
                {searchQuery && ` matching "${searchQuery}"`}
            </div>

            {shouldShowGrouped ? (
                <div className="space-y-6">
                    {/* Grouped Servers */}
                    {groupedServers.map(({ group, servers: groupServers }) => (
                        <div key={group.id} className="space-y-3">
                            <button
                                onClick={() => toggleGroupCollapse(group.id)}
                                className="flex items-center gap-2 w-full text-left border-b pb-2 hover:bg-muted/30 rounded px-2 -mx-2 transition-colors"
                            >
                                {collapsedGroups.has(group.id) ? (
                                    <ChevronRight className="h-5 w-5" />
                                ) : (
                                    <ChevronDown className="h-5 w-5" />
                                )}
                                <FolderOpen className="h-5 w-5" style={{ color: group.color || '#888' }} />
                                <h2 className="text-lg font-semibold">{group.name}</h2>
                                {group.description && (
                                    <span className="text-sm text-muted-foreground hidden sm:inline">- {group.description}</span>
                                )}
                                <span className="ml-auto text-sm text-muted-foreground">
                                    {groupServers.length} server{groupServers.length !== 1 ? 's' : ''}
                                </span>
                            </button>
                            {!collapsedGroups.has(group.id) && renderServers(groupServers)}
                        </div>
                    ))}

                    {/* Ungrouped Servers */}
                    {ungroupedServers.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 border-b pb-2">
                                <ServerIcon className="h-5 w-5 text-muted-foreground" />
                                <h2 className="text-lg font-semibold text-muted-foreground">
                                    {t.serverList?.ungrouped || "Ungrouped"}
                                </h2>
                                <span className="ml-auto text-sm text-muted-foreground">
                                    {ungroupedServers.length} server{ungroupedServers.length !== 1 ? 's' : ''}
                                </span>
                            </div>
                            {renderServers(ungroupedServers)}
                        </div>
                    )}
                </div>
            ) : (
                // Flat list (for list/details view or when filtering)
                renderServers(filteredAndSortedServers)
            )}

            {filteredAndSortedServers.length === 0 && (
                <div className="text-center p-10 text-muted-foreground border rounded-lg">
                    {searchQuery || filterGroup !== null 
                        ? (t.serverList?.noResults || "No servers match your filters")
                        : (t.serverList?.noServers || "No servers added yet")
                    }
                </div>
            )}
        </div>
    );
}
