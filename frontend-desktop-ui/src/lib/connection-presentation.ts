export function connectionPresentation(server?: { quick_protocol?: string; connection_protocol?: string; os_type?: string; os_info?: string; ssh_port?: number; rdp_port?: number }) {
    if (server?.quick_protocol === 'sftp') return { protocol: 'SFTP', port: server.ssh_port || 22 };
    const rdp = server?.connection_protocol === 'rdp' || (!server?.connection_protocol && (server?.os_type || server?.os_info || '').toLowerCase().includes('windows'));
    return { protocol: rdp ? 'RDP' : 'SSH', port: rdp ? server?.rdp_port || 3389 : server?.ssh_port || 22 };
}
