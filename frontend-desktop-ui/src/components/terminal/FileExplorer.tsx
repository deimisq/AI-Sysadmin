import { uiText, uiFormat } from '../../lib/ui-language';
import { useState, useEffect, useRef } from 'react';
import { isWebView2, sendCommand } from '../../lib/bridge';
import { Folder, File, ChevronUp, RefreshCw, X, Upload, Download } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Transfer {
    id: string;
    sessionId: string;
    direction: 'upload' | 'download';
    status: 'preparing' | 'transferring' | 'cancelling' | 'completed' | 'cancelled' | 'failed';
    bytes: number;
    total: number;
    error: string | null;
    fileName: string | null;
}

const activeTransfer = (transfer: Transfer | null) => !!transfer && ['preparing', 'transferring', 'cancelling'].includes(transfer.status);

export interface FileEntry {
    name: string;
    is_dir: boolean;
    size: number;
    modified: number;
}

interface FileExplorerProps {
    sessionId: string;
    initialPath?: string;
    onClose?: () => void;
    className?: string;
}

export function FileExplorer({ sessionId, initialPath = ".", onClose, className }: FileExplorerProps) {
    const [path, setPath] = useState(initialPath);
    const [files, setFiles] = useState<FileEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState('');
    const [directoryLoaded, setDirectoryLoaded] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [transfer, setTransfer] = useState<Transfer | null>(null);
    const [starting, setStarting] = useState(false);
    const refreshedTransfer = useRef<string | null>(null);
    const transferGeneration = useRef(0);
    const transferring = starting || activeTransfer(transfer);

    useEffect(() => {
        const version = ++transferGeneration.current;
        let stopped = false;
        let timer: ReturnType<typeof setTimeout>;
        setTransfer(null);
        setStarting(false);
        if (!isWebView2()) return;
        const poll = async () => {
            try {
                const state = await sendCommand<Transfer | null>('sftp_transfer_status', { sessionId });
                if (!stopped) setTransfer(state);
            } catch (reason) {
                if (!stopped) setError(String(reason));
            }
            if (!stopped) timer = setTimeout(poll, 750);
        };
        void poll();
        return () => { stopped = true; clearTimeout(timer); if (transferGeneration.current === version) transferGeneration.current++; };
    }, [sessionId]);

    const startTransfer = async (direction: 'upload' | 'download', name?: string) => {
        if (!directoryLoaded || loading || draftPath !== path) {
            setError('Abre primero la ruta escrita para confirmar la carpeta de transferencia.');
            return;
        }
        const version = transferGeneration.current;
        setStarting(true);
        setError(null);
        try {
            const state = await sendCommand<Transfer>('sftp_transfer_start', { sessionId, direction, path, name });
            if (version === transferGeneration.current) setTransfer(state);
        } catch (reason) {
            if (version === transferGeneration.current) setError(String(reason));
        } finally {
            if (version === transferGeneration.current) setStarting(false);
        }
    };

    const cancelTransfer = async () => {
        if (!transfer) return;
        const version = transferGeneration.current;
        try {
            const state = await sendCommand<Transfer>('sftp_transfer_cancel', { sessionId, id: transfer.id });
            if (version === transferGeneration.current) setTransfer(state);
        } catch (reason) {
            if (version === transferGeneration.current) setError(String(reason));
        }
    };

    const generation = useRef(0);
    const [draftPath, setDraftPath] = useState(initialPath);

    const loadFiles = async (dirPath: string) => {
        const request = ++generation.current;
        setLoading(true);
        setDirectoryLoaded(false);
        setFiles([]);
        setError(null);
        try {
            // Simple normalization
            let p = dirPath;
            if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
            if (!p) p = "/";

            const result = await sendCommand<{ path: string; entries: FileEntry[] } | FileEntry[]>('sftp_list_files', { sessionId, path: p });
            if (request !== generation.current) return;
            const entries = Array.isArray(result) ? result : result.entries;

            // Sort: Directories first, then alphabetical
            entries.sort((a, b) => {
                if (a.is_dir === b.is_dir) return a.name.localeCompare(b.name);
                return a.is_dir ? -1 : 1;
            });

            setFiles(entries);
            setDirectoryLoaded(true);
            const resolved = Array.isArray(result) ? p : result.path;
            setPath(resolved);
            setDraftPath(resolved);
        } catch (err: any) {
            console.error("SFTP Error:", err);
            if (request !== generation.current) return;
            setError(err.toString() || "Failed to list files");
        } finally {
            if (request === generation.current) setLoading(false);
        }
    };

    useEffect(() => {
        loadFiles(initialPath);
        return () => { generation.current++; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionId]);

    useEffect(() => {
        if (transfer?.sessionId === sessionId && transfer.status === 'completed' && refreshedTransfer.current !== transfer.id) {
            refreshedTransfer.current = transfer.id;
            void loadFiles(path);
        }
        // Refresh once when a transfer commits, including one recovered after reopening the panel.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [transfer?.id, transfer?.status]);

    const handleNavigate = (entry: FileEntry) => {
        if (loading || transferring) return;
        if (entry.is_dir) {
            const newPath = path === '/' ? `/${entry.name}` : `${path}/${entry.name}`;
            loadFiles(newPath);
        } else {
            if (isWebView2()) void startTransfer('download', entry.name);
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
                    <span className="font-semibold text-gray-200 text-xs">{uiText("Archivos remotos · SFTP")}</span>
                </div>
                <div className="flex gap-1">
                    {isWebView2() && <button disabled={loading || transferring || !directoryLoaded || draftPath !== path} onClick={() => void startTransfer('upload')}
                        title="Subir archivo a esta carpeta" aria-label="Subir archivo" className="p-1 disabled:opacity-30 hover:bg-[#333] rounded text-gray-300">
                        <Upload className="w-3.5 h-3.5 inline mr-1" /><span className="text-xs">{uiText("Subir")}</span>
                    </button>}
                    <button disabled={loading} onClick={() => loadFiles(path)} title="Refrescar" className="p-1 hover:bg-[#333] rounded text-gray-400 hover:text-white transition-colors">
                        <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
                    </button>
                    {onClose && (
                        <button onClick={onClose} title={uiText("Cerrar Panel")} className="p-1 hover:bg-[#333] rounded text-gray-400 hover:text-white transition-colors">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Breadcrumbs / Path Input */}
            <div className="p-2 border-b border-[#333] flex items-center gap-1 bg-[#2d2d2d]">
                <button onClick={handleUp} disabled={loading || transferring || path === '/'} title="Subir una carpeta" className="p-1 hover:bg-[#444] rounded disabled:opacity-30 text-gray-400">
                    <ChevronUp className="w-4 h-4" />
                </button>
                <input
                    aria-label="Ruta remota"
                    disabled={loading || transferring}
                    value={draftPath}
                    onChange={(e) => setDraftPath(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loadFiles(draftPath)}
                    className="flex-1 min-w-0 bg-[#1e1e1e] border border-[#444] rounded px-2 py-1 text-xs text-gray-300 focus:border-blue-500 outline-none font-mono"
                />
            </div>

            <div className="p-2 border-b border-[#333]">
                <input aria-label="Filtrar archivos de esta carpeta" placeholder="Filtrar por nombre…" value={filter} onChange={event => setFilter(event.target.value)} className="w-full rounded border border-[#444] bg-[#202020] px-2 py-1 text-xs text-gray-200" />
            </div>

            {/* File List */}
            <div className="flex-1 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-gray-700">
                {error && (
                    <div className="p-2 text-red-300 text-xs bg-red-900/20 border border-red-900/30 rounded m-2 break-all">
                        {error}
                    </div>
                )}

                <div className="px-2 py-1 text-[11px] uppercase tracking-wide text-gray-400 border-b border-[#333] flex justify-between"><span>{uiText("Nombre / Modificado")}</span><span>{uiText("Tamaño")}</span></div>
                {files.filter(file => file.name.toLocaleLowerCase().includes(filter.toLocaleLowerCase())).map((file) => (
                    <div key={file.name} className="flex items-center">
                    <button type="button" disabled={transferring}
                        onDoubleClick={() => handleNavigate(file)}
                        onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); handleNavigate(file); } }}
                        className="min-w-0 flex-1 text-left flex items-center gap-2 px-2 py-1.5 hover:bg-[#2a2d2e] cursor-pointer select-none rounded-sm group transition-colors disabled:opacity-50"
                        title={file.name}
                    >
                        {file.is_dir ? (
                            <Folder className="w-4 h-4 text-blue-400 fill-blue-400/10 flex-shrink-0" />
                        ) : (
                            <File className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        )}
                        <span className="min-w-0 flex-1"><span className="block truncate text-gray-200 group-hover:text-white text-xs">{file.name}</span><span className="block text-[11px] text-gray-400">{formatModified(file.modified)}</span></span>
                        <span className="text-[11px] text-gray-400 font-mono whitespace-nowrap">{file.is_dir ? uiText('Carpeta') : formatSize(file.size)}</span>
                    </button>
                    {!file.is_dir && isWebView2() && <button disabled={transferring || loading || draftPath !== path}
                        onClick={() => void startTransfer('download', file.name)} aria-label={uiFormat("Descargar {0}", file.name)} title={uiText("Descargar archivo")}
                        className="p-1.5 text-gray-400 hover:text-white disabled:opacity-30"><Download className="w-3.5 h-3.5" /></button>}
                    </div>
                ))}

                {!loading && files.length > 0 && !files.some(file => file.name.toLocaleLowerCase().includes(filter.toLocaleLowerCase())) && <p className="p-4 text-xs text-gray-400">{uiText("No hay coincidencias en esta carpeta.")}</p>}

                {!loading && files.length === 0 && !error && (
                    <div className="text-center p-8 text-gray-500 text-xs italic opacity-50">{uiText("Directorio vacío")}</div>
                )}
            </div>

            {transfer && <div className="p-2 border-t border-[#333] text-xs text-gray-300 space-y-2" role="status">
                <div>{transfer.direction === 'upload' ? 'Subida' : 'Descarga'} · {({ preparing: 'Elige el archivo o destino en Windows', transferring: 'Transfiriendo', cancelling: 'Cancelando…', completed: 'Completada', cancelled: 'Cancelada', failed: uiText('Error') })[transfer.status]}</div>
                {transfer.fileName && <div className="truncate" title={transfer.fileName}>{transfer.fileName}</div>}
                {activeTransfer(transfer) && <>
                    <progress className="w-full h-1.5" aria-label="Progreso de transferencia" max={Math.max(1, transfer.total)} value={transfer.bytes} />
                    <div>{formatSize(transfer.bytes)} / {formatSize(transfer.total)}</div>
                    <button onClick={() => void cancelTransfer()} disabled={transfer.status === 'cancelling'} className="px-2 py-1 rounded border border-gray-600 disabled:opacity-40">{uiText("Cancelar transferencia")}</button>
                </>}
                {transfer.error && <div className="text-red-300 break-words">{transfer.error}</div>}
            </div>}

            {/* StatusBar */}
            <div className="bg-[#252526] border-t border-[#333] px-2 py-1 text-[11px] text-gray-500 flex justify-between">
                <span>{files.length}{" "}{uiText("elementos")}</span>
                <span role="status">{loading ? uiText('Cargando...') : error ? uiText('Error de lectura') : 'Listo'}</span>
            </div>
        </div>
    );
}

function formatModified(seconds: number) {
    if (!Number.isFinite(seconds) || seconds <= 0) return 'Fecha no disponible';
    const date = new Date(seconds * 1000);
    return Number.isNaN(date.getTime()) ? 'Fecha no disponible' : date.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
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
