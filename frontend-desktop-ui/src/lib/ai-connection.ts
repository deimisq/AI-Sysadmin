export function normalizedAiEndpoint(provider: string, address: string): string {
    const url = new URL(address.trim());
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error('URL no válida');
    let path = url.pathname.replace(/\/+$/, '');
    if (provider === 'ollama') path = path.replace(/\/(api|v1)$/i, '') + '/v1';
    url.pathname = path;
    return url.toString().replace(/\/+$/, '');
}

export function sameAiEndpoint(provider: string, address: string, saved: string): boolean {
    try { return normalizedAiEndpoint(provider, address) === normalizedAiEndpoint(provider, saved); }
    catch { return false; }
}
