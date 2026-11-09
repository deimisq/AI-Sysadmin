export function validateConnectionForm(data: { hostname: string; ip_address: string; ssh_username: string }, local: boolean, port: number) {
    const errors: Record<string, string> = {};
    if (!data.hostname.trim()) errors.hostname = 'Escribe un nombre para identificar la conexión.';
    if (!data.ip_address.trim()) errors.ip_address = 'Escribe la dirección IP o el nombre DNS.';
    else if (/\s|:\/\//.test(data.ip_address.trim())) errors.ip_address = 'Usa una dirección o nombre DNS, sin protocolo ni espacios.';
    if (local && !data.ssh_username.trim()) errors.ssh_username = 'Escribe el usuario de conexión.';
    if (local && (!Number.isInteger(port) || port < 1 || port > 65535)) errors.port = 'El puerto debe estar entre 1 y 65535.';
    return errors;
}
