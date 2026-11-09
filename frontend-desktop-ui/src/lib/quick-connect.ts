export function parseQuickTarget(value: string, protocol: 'ssh' | 'rdp' | 'sftp') {
    const input = value.trim();
    if (!input || /\s|[/\\?#@]/.test(input)) throw new Error('Usa un nombre o IP, sin URL ni espacios.');
    const bracketed = input.match(/^\[([^\]]+)\](?::(\d+))?$/);
    const parts = input.split(':');
    let host = input;
    let port = protocol === 'rdp' ? 3389 : 22;
    if (bracketed) { host = bracketed[1]; if (bracketed[2]) port = Number(bracketed[2]); }
    else if (input.includes('[') || input.includes(']')) throw new Error('Dirección IPv6 inválida.');
    else if (parts.length === 2) { host = parts[0]; port = Number(parts[1]); }
    if (!host || !Number.isInteger(port) || port < 1 || port > 65535) throw new Error('El puerto debe estar entre 1 y 65535.');
    return { host, port };
}
