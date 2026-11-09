// Local presentation metadata only. Never store connection credentials here.
export interface ConnectionFolder {
    id: string;
    name: string;
    parentId: string | null;
}
export interface FolderLayout {
    folders: ConnectionFolder[];
    assignments: Record<string, string>;
}
export const emptyFolderLayout = (): FolderLayout => ({ folders: [], assignments: {} });

export function folderPath(folders: ConnectionFolder[], id: string): string {
    const byId = new Map(folders.map(folder => [folder.id, folder]));
    const seen = new Set<string>();
    const names: string[] = [];
    let current = byId.get(id);
    while (current && !seen.has(current.id)) {
        seen.add(current.id); names.unshift(current.name);
        current = current.parentId ? byId.get(current.parentId) : undefined;
    }
    return names.join(' / ');
}

export function readFolderLayout(raw: string | null): FolderLayout {
    try {
        const data = JSON.parse(raw || 'null');
        if (!data || !Array.isArray(data.folders) || !data.assignments || typeof data.assignments !== 'object') return emptyFolderLayout();
        const folders: ConnectionFolder[] = [];
        const ids = new Set<string>();
        // Parents precede children in saved layouts. Reject malformed/cyclic input.
        for (const item of data.folders) {
            if (typeof item.id !== 'string' || ids.has(item.id) || typeof item.name !== 'string' || !item.name.trim()) continue;
            if (item.parentId !== null && !ids.has(item.parentId)) continue;
            ids.add(item.id);
            folders.push({ id: item.id, name: item.name.trim().slice(0, 100), parentId: item.parentId });
        }
        const assignments: Record<string, string> = {};
        for (const [serverId, folderId] of Object.entries(data.assignments)) {
            if (/^\d+$/.test(serverId) && typeof folderId === 'string' && ids.has(folderId)) assignments[serverId] = folderId;
        }
        return { folders, assignments };
    } catch { return emptyFolderLayout(); }
}

export function removeFolder(layout: FolderLayout, id: string): FolderLayout {
    const removed = new Set([id]);
    for (const folder of layout.folders) if (folder.parentId && removed.has(folder.parentId)) removed.add(folder.id);
    return {
        folders: layout.folders.filter(folder => !removed.has(folder.id)),
        assignments: Object.fromEntries(Object.entries(layout.assignments).filter(([, folderId]) => !removed.has(folderId))),
    };
}
