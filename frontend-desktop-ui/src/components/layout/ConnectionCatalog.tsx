import { useEffect, useState } from 'react';
import { Plus, FolderPlus, Search, RefreshCw, Terminal, Monitor, ArrowUpRight } from 'lucide-react';
import { fetchServers, type Server } from '../../lib/api';
import { connectionPresentation } from '../../lib/connection-presentation';
import { useWorkspaceStore } from '../../stores/workspaceStore';

export function ConnectionCatalog() {
    const [servers, setServers] = useState<Server[]>([]);
    const [query, setQuery] = useState('');
    const [protocol, setProtocol] = useState('all');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [revision, setRevision] = useState(0);
    const { requestExplorerAction, openTab } = useWorkspaceStore();
    useEffect(() => {
        let active = true;
        setLoading(true); setError('');
        fetchServers().then(data => { if (active) setServers(data); }).catch(() => { if (active) setError('No se pudo leer el inventario.'); }).finally(() => { if (active) setLoading(false); });
        const refresh = () => setRevision(value => value + 1);
        window.addEventListener('local-inventory-restored', refresh);
        window.addEventListener('connection-inventory-changed', refresh);
        return () => { active = false; window.removeEventListener('local-inventory-restored', refresh); window.removeEventListener('connection-inventory-changed', refresh); };
    }, [revision]);
    const filtered = servers.filter(server => (protocol === 'all' || connectionPresentation(server).protocol === protocol) && `${server.hostname} ${server.ip_address} ${server.description || ''}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
    return <section className="connection-catalog h-full flex flex-col overflow-hidden" aria-label="Catálogo de conexiones">
        <header className="catalog-header">
            <div><p className="text-[11px] uppercase tracking-widest text-blue-300 mb-1">Inventario</p><h1 className="text-xl font-semibold text-gray-100">Conexiones</h1><p className="text-xs text-gray-400 mt-1">Selecciona un servidor para abrir una sesión.</p></div>
            <button className="catalog-primary" onClick={() => requestExplorerAction('add-server')}><Plus size={15} />Nueva conexión</button>
        </header>
        <div className="catalog-controls">
            <label className="catalog-search"><Search size={14} /><input aria-label="Buscar en el catálogo" value={query} onChange={event => setQuery(event.target.value)} placeholder="Nombre, dirección o descripción" /></label>
            <button title="Actualizar inventario" aria-label="Actualizar inventario" onClick={() => setRevision(value => value + 1)} className="workspace-tool"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /></button>
        </div>
        <div className="flex items-center gap-2 px-5 pb-3">
            {['all', 'SSH', 'RDP'].map(value => <button key={value} aria-pressed={protocol === value} onClick={() => setProtocol(value)} className="catalog-filter">{value === 'all' ? 'Todas' : value}<span>{servers.filter(server => value === 'all' || connectionPresentation(server).protocol === value).length}</span></button>)}
            <button className="ml-auto text-xs text-gray-400 hover:text-gray-100 flex items-center gap-1" onClick={() => requestExplorerAction('add-folder')}><FolderPlus size={14} />Carpeta</button>
        </div>
        <div className="flex-1 overflow-auto px-5">
            {error ? <p role="alert" className="p-4 text-sm text-red-300">{error}</p> : <table className="catalog-table"><caption className="sr-only">Conexiones guardadas. No indica disponibilidad de los servidores.</caption><thead><tr><th>Servidor</th><th>Protocolo</th><th><span className="sr-only">Acción</span></th></tr></thead><tbody>
                {filtered.map(server => { const connection = connectionPresentation(server); const Icon = connection.protocol === 'RDP' ? Monitor : Terminal; return <tr key={server.id}>
                    <td><div className="flex items-center gap-3"><span className="catalog-server-icon"><Icon size={17} /></span><div className="min-w-0"><div className="text-gray-100 font-medium truncate" title={server.hostname}>{server.hostname}</div><div className="font-mono text-[11px] text-gray-400 mt-1 break-all">{server.ip_address}</div></div></div></td>
                    <td><span className="protocol-badge">{connection.protocol}:{connection.port}</span></td>
                    <td><button aria-label={`Conectar con ${server.hostname}`} className="catalog-connect" onClick={() => openTab({ type: 'terminal', title: server.hostname, serverId: String(server.id), server })}>Conectar<ArrowUpRight size={14} /></button></td>
                </tr>; })}
            </tbody></table>}
            {!loading && !error && !filtered.length && <div className="py-12 text-center text-sm text-gray-400">{servers.length ? 'No hay conexiones que coincidan con el filtro.' : 'Todavía no tienes conexiones. Agrega tu primer servidor.'}</div>}
            {loading && <p role="status" className="py-4 text-xs text-gray-400">Leyendo inventario…</p>}
        </div>
        <footer className="px-5 py-3 text-[11px] text-gray-400 border-t border-white/10">{filtered.length} conexiones · Organiza clientes y entornos en el árbol lateral.</footer>
    </section>;
}
