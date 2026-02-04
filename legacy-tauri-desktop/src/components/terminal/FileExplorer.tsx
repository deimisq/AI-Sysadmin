import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Folder, File, ChevronUp, RefreshCw, X, Download } from 'lucide-react';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

export interface FileEntry {
    name: string;
    is_dir: boolean;
    size: number;
    modified: number;
    permissions: number;
}

interface FileExplorerProps {
    sessionId: string;
    initialPath?: string;
    onClose?: () => void;
    className?: string;
}

export function FileExplorer({ sessionId, initialPath = "/root", onClose, className }: FileExplorerProps) {
    const [path, setPath] = useState(initialPath);
    const [files, setFiles] = useState<FileEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadFiles = async (dirPath: string) => {
        setLoading(true);
        setError(null);
        try {
            // Simple normalization
            let p = dirPath;
            if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
            if (!p) p = "/";

            const entries = await invoke<FileEntry[]>('sftp_list_files', { sessionId, path: p });

            // Sort: Directories first, then alphabetical
            entries.sort((a, b) => {
                if (a.is_dir === b.is_dir) return a.name.localeCompare(b.name);
                return a.is_dir ? -1 : 1;
            });

            setFiles(entries);
            setPath(p);
        } catch (err: any) {
            console.error("SFTP Error:", err);
            setError(err.toString() || "Failed to list files");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadFiles(path);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionId]);

    const handleNavigate = (entry: FileEntry) => {
        if (entry.is_dir) {
            const newPath = path === '/' ? `/${entry.name}` : `${path}/${entry.name}`;
            loadFiles(newPath);
        } else {
            toast.info(`Selected: ${entry.name} (${formatSize(entry.size)})`);
            // Future: Download
        }
    };

    const handleUp = () => {
        if (path === '/') return;
        const parts = path.split('/');
        parts.pop();
        const newPath = parts.join('/') || '/';
        loadFiles(newPath);
    };

    return (
        <div className={cn("flex flex-col h-full bg-[#1e1e1e] border-l border-[#333] w-72 text-sm font-sans", className)}>
            {/* Header */}
            <div className="flex items-center justify-between p-2 border-b border-[#333] bg-[#252526]">
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-300 text-xs uppercase tracking-wide">Explorador</span>
                </div>
                <div className="flex gap-1">
                    <button onClick={() => loadFiles(path)} title="Refrescar" className="p-1 hover:bg-[#333] rounded text-gray-400 hover:text-white transition-colors">
                        <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
                    </button>
                    {onClose && (
                        <button onClick={onClose} title="Cerrar Panel" className="p-1 hover:bg-[#333] rounded text-gray-400 hover:text-white transition-colors">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Breadcrumbs / Path Input */}
            <div className="p-2 border-b border-[#333] flex items-center gap-1 bg-[#2d2d2d]">
                <button onClick={handleUp} disabled={path === '/'} className="p-1 hover:bg-[#444] rounded disabled:opacity-30 text-gray-400">
                    <ChevronUp className="w-4 h-4" />
                </button>
                <input
                    value={path}
                    onChange={(e) => setPath(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loadFiles(path)}
                    className="flex-1 bg-[#1e1e1e] border border-[#444] rounded px-2 py-0.5 text-xs text-gray-300 focus:border-blue-500 outline-none font-mono"
                />
            </div>

            {/* File List */}
            <div className="flex-1 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-gray-700">
                {error && (
                    <div className="p-2 text-red-300 text-xs bg-red-900/20 border border-red-900/30 rounded m-2 break-all">
                        {error}
                    </div>
                )}

                {files.map((file) => (
                    <div
                        key={file.name}
                        onDoubleClick={() => handleNavigate(file)}
                        className="flex items-center gap-2 px-2 py-1.5 hover:bg-[#2a2d2e] cursor-pointer select-none rounded-sm group transition-colors"
                        title={file.name}
                    >
                        {file.is_dir ? (
                            <Folder className="w-4 h-4 text-blue-400 fill-blue-400/10 flex-shrink-0" />
                        ) : (
                            <File className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        )}
                        <span className="truncate flex-1 text-gray-300 group-hover:text-white text-xs">{file.name}</span>
                        <span className="text-[10px] text-gray-600 font-mono">{file.is_dir ? '' : formatSize(file.size)}</span>
                    </div>
                ))}

                {!loading && files.length === 0 && !error && (
                    <div className="text-center p-8 text-gray-500 text-xs italic opacity-50">Directorio vacío</div>
                )}
            </div>

            {/* StatusBar */}
            <div className="bg-[#252526] border-t border-[#333] px-2 py-1 text-[10px] text-gray-500 flex justify-between">
                <span>{files.length} items</span>
                <span>{loading ? 'Cargando...' : 'Listo'}</span>
            </div>
        </div>
    );
}

function formatSize(bytes: number) {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0;
    while (bytes >= 1024 && i < units.length - 1) {
        bytes /= 1024;
        i++;
    }
    return `${bytes.toFixed(1)} ${units[i]}`;
}
