import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { type Server, createServer, updateServer } from '@/lib/api';
import { toast } from 'sonner';
import { isLocalWorkspace } from '@/lib/workspace-mode';
import { validateConnectionForm } from '@/lib/connection-form';

const OS_OPTIONS = [
    "Ubuntu 24.04",
    "Ubuntu 22.04",
    "Ubuntu 20.04",
    "Debian 12",
    "Debian 11",
    "CentOS 7",
    "Rocky Linux 9",
    "AlmaLinux 9",
    "Windows 11",
    "Windows 10",
    "Windows Server 2025",
    "Windows Server 2022",
    "Windows Server 2019"
];

interface ServerFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    serverToEdit?: Server | null;
    groups: any[];
    onSuccess: (server: Server) => void | Promise<void>;
    destination?: string;
}

export function ServerFormDialog({ open, onOpenChange, serverToEdit, groups, onSuccess, destination }: ServerFormDialogProps) {
    const local = isLocalWorkspace();
    const [protocol, setProtocol] = useState<'ssh' | 'rdp'>('ssh');
    const [port, setPort] = useState(22);
    const isEditing = !!serverToEdit;
    const [loading, setLoading] = useState(false);
    const [isCustomOS, setIsCustomOS] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const saving = useRef(false);
    const formRef = useRef<HTMLFormElement>(null);
    const changeOpen = (next: boolean) => { if (!saving.current) onOpenChange(next); };

    // Form State
    const [formData, setFormData] = useState({
        hostname: '',
        ip_address: '',
        description: '',
        os_info: '',
        group_id: null as number | null,
        ssh_username: '',
        ssh_password: '', // Will be empty on edit for security
        ssh_key_path: ''
    });

    // Load data when dialog opens
    useEffect(() => {
        if (open) {
            setErrors({});
            const connectionProtocol = serverToEdit?.connection_protocol || ((serverToEdit?.os_info || '').toLowerCase().includes('windows') ? 'rdp' : 'ssh');
            setProtocol(connectionProtocol);
            setPort(connectionProtocol === 'rdp' ? serverToEdit?.rdp_port || 3389 : serverToEdit?.ssh_port || 22);
            if (serverToEdit) {
                const os = serverToEdit.os_info || '';
                // If OS is present and NOT in options, it's custom
                const custom = !!os && !OS_OPTIONS.includes(os);
                setIsCustomOS(custom);

                setFormData({
                    hostname: serverToEdit.hostname,
                    ip_address: serverToEdit.ip_address,
                    description: serverToEdit.description || '',
                    os_info: os,
                    group_id: serverToEdit.group_id || null,
                    ssh_username: serverToEdit.ssh_username || '',
                    ssh_password: '',
                    ssh_key_path: ''
                });
            } else {
                setIsCustomOS(false);
                setFormData({
                    hostname: '',
                    ip_address: '',
                    description: '',
                    os_info: '',
                    group_id: null,
                    ssh_username: '',
                    ssh_password: '',
                    ssh_key_path: ''
                });
            }
        }
    }, [open, serverToEdit]);

    const handleSubmit = async () => {
        if (saving.current) return;
        const nextErrors = validateConnectionForm(formData, local, port);
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length) {
            requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
            return;
        }

        saving.current = true;
        setLoading(true);
        try {
            const payload = {
                ...formData,
                hostname: formData.hostname.trim(),
                ip_address: formData.ip_address.trim(),
                ssh_username: formData.ssh_username.trim(),
                ...(local ? { connection_protocol: protocol, ...(protocol === 'ssh' ? { ssh_port: port } : { rdp_port: port }) } : {}),
                group_id: formData.group_id ?? undefined
            };

            // Remove empty password/key fields
            if (!payload.ssh_password) delete (payload as any).ssh_password;
            if (!payload.ssh_key_path) delete (payload as any).ssh_key_path;

            let saved: Server;
            if (isEditing && serverToEdit) {
                saved = await updateServer(serverToEdit.id, payload);
                toast.success('Servidor actualizado exitosamente');
            } else {
                saved = await createServer(payload);
                toast.success('Servidor creado exitosamente');
            }
            // Persistence already succeeded: a follow-up presentation failure must not invite another create.
            try { await onSuccess(saved); }
            catch { toast.warning('La conexión se guardó, pero no se pudo actualizar su organización. Revisa el inventario antes de volver a crearla.'); }
            onOpenChange(false);
        } catch (err: any) {

            toast.error(err.message || 'Error al guardar el servidor');
        } finally {
            saving.current = false;
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={changeOpen}>
            <DialogContent onPointerDownOutside={event => event.preventDefault()} className="connection-properties max-w-2xl max-h-[90vh] overflow-hidden bg-[#202020] border-[#444] text-[#eeeeee] p-0 gap-0">
              <form ref={formRef} noValidate onSubmit={event => { event.preventDefault(); void handleSubmit(); }} className="flex flex-col max-h-[90vh]">
                <DialogHeader className="px-5 py-4 border-b border-[#383838] shrink-0">
                    <DialogTitle className="text-base font-semibold text-white">
                        {isEditing ? 'Propiedades de la conexión' : 'Nueva conexión'}
                    </DialogTitle>
                    <DialogDescription className="text-gray-400">
                        {isEditing
                            ? 'Modifica los detalles de conexión y configuración del servidor.'
                            : 'Ingresa los detalles para conectar un nuevo servidor a la plataforma.'}
                    </DialogDescription>
                </DialogHeader>

                <fieldset disabled={loading} className="connection-fields space-y-4 px-5 py-4 overflow-y-auto min-h-0">
                    <legend className="sr-only">Propiedades de conexión</legend>
                    {destination && <p className="text-xs text-gray-300 border-b border-[#383838] pb-3 break-words"><span className="text-gray-400">Carpeta de destino: </span>{destination}</p>}
                    {local && <div className="space-y-3">
                        <p className="text-xs text-gray-400">Se guarda cifrado en este equipo con tu cuenta de Windows. La conexión sale directamente desde aquí.</p>
                        <div className="grid grid-cols-2 gap-4">
                            <label className="text-sm">Protocolo<select aria-label="Protocolo" value={protocol} onChange={e => { const next = e.target.value as 'ssh' | 'rdp'; setProtocol(next); setPort(next === 'ssh' ? 22 : 3389); }} className="mt-2 w-full rounded border border-[#444] bg-[#2d2d2d] p-2"><option value="ssh">SSH</option><option value="rdp">RDP</option></select></label>
                            <label className="text-sm">Puerto<Input aria-invalid={!!errors.port} aria-describedby={errors.port ? "error-port" : undefined} aria-label="Puerto" type="number" min={1} max={65535} value={Number.isNaN(port) ? '' : port} onChange={e => setPort(e.target.value === '' ? NaN : Number(e.target.value))} className="mt-2 bg-[#2d2d2d] border-[#444]" /></label>
                        </div>
                        {errors.port && <p id="error-port" role="alert" className="text-xs text-red-300">{errors.port}</p>}
                    </div>}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="connection-hostname" className="text-gray-300">Nombre *</Label>
                            <Input
                                id="connection-hostname" aria-invalid={!!errors.hostname} aria-describedby={errors.hostname ? "error-hostname" : undefined}
                                value={formData.hostname}
                                onChange={(e) => setFormData({ ...formData, hostname: e.target.value })}
                                placeholder="ej., servidor-web-01"
                                className="bg-[#2d2d2d] border-[#444] text-white placeholder:text-gray-500"
                            />
                            {errors.hostname && <p id="error-hostname" role="alert" className="text-xs text-red-300">{errors.hostname}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="connection-ip_address" className="text-gray-300">Dirección IP o DNS *</Label>
                            <Input
                                id="connection-ip_address" aria-invalid={!!errors.ip_address} aria-describedby={errors.ip_address ? "error-ip_address" : undefined}
                                value={formData.ip_address}
                                onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
                                placeholder="ej., 192.168.1.100"
                                className="bg-[#2d2d2d] border-[#444] text-white placeholder:text-gray-500"
                            />
                            {errors.ip_address && <p id="error-ip_address" role="alert" className="text-xs text-red-300">{errors.ip_address}</p>}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-gray-300">Sistema Operativo</Label>
                        <select
                            className="flex h-10 w-full rounded-md border border-[#444] bg-[#2d2d2d] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={isCustomOS ? "other" : formData.os_info}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val === "other") {
                                    setIsCustomOS(true);
                                    setFormData({ ...formData, os_info: "" });
                                } else {
                                    setIsCustomOS(false);
                                    setFormData({ ...formData, os_info: val });
                                }
                            }}
                        >
                            <option value="" disabled>Selecciona Sistema Operativo</option>
                            {OS_OPTIONS.map((os) => (
                                <option key={os} value={os}>{os}</option>
                            ))}
                            <option value="other">Otro / Personalizado...</option>
                        </select>

                        {isCustomOS && (
                            <Input
                                value={formData.os_info}
                                onChange={(e) => setFormData({ ...formData, os_info: e.target.value })}
                                placeholder="ej., Arch Linux"
                                className="bg-[#2d2d2d] border-[#444] text-white placeholder:text-gray-500 mt-2"
                                autoFocus
                            />
                        )}
                    </div>

                    {!local && <div className="space-y-2">
                        <Label className="text-gray-300">Grupo</Label>
                        <select
                            className="flex h-10 w-full rounded-md border border-[#444] bg-[#2d2d2d] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={formData.group_id || ''}
                            onChange={(e) => setFormData({ ...formData, group_id: e.target.value ? Number(e.target.value) : null })}
                        >
                            <option value="">Sin grupo (General)</option>
                            {groups.map(g => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                        </select>
                    </div>}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="connection-ssh_username" className="text-gray-300">Usuario {local && protocol === 'rdp' ? 'RDP' : 'SSH'}</Label>
                            <Input
                                id="connection-ssh_username" aria-invalid={!!errors.ssh_username} aria-describedby={errors.ssh_username ? "error-ssh_username" : undefined}
                                value={formData.ssh_username}
                                onChange={(e) => setFormData({ ...formData, ssh_username: e.target.value })}
                                placeholder="root"
                                className="bg-[#2d2d2d] border-[#444] text-white placeholder:text-gray-500"
                            />
                            {errors.ssh_username && <p id="error-ssh_username" role="alert" className="text-xs text-red-300">{errors.ssh_username}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label className="text-gray-300">Contraseña {isEditing && '(vacío conserva la actual)'}</Label>
                            <Input
                                type="password"
                                value={formData.ssh_password}
                                onChange={(e) => setFormData({ ...formData, ssh_password: e.target.value })}
                                placeholder={isEditing ? "••••••••" : "Contraseña"}
                                className="bg-[#2d2d2d] border-[#444] text-white placeholder:text-gray-500"
                            />
                        </div>
                    </div>

                    {(!local || protocol === 'ssh') && <div className="space-y-2">
                        <Label className="text-gray-300">Clave privada SSH: contenido o ruta {isEditing && '(vacío conserva la actual)'}</Label>
                        <Textarea
                            className="min-h-[100px] font-mono text-xs bg-[#2d2d2d] border-[#444] text-white placeholder:text-gray-500"
                            value={formData.ssh_key_path}
                            onChange={(e) => setFormData({ ...formData, ssh_key_path: e.target.value })}
                            placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;..."
                        />
                        <p className="text-xs text-gray-500">
                            Proporciona contraseña SSH o ruta de clave privada (prioridad a clave).
                        </p>
                    </div>}

                    <div className="space-y-2">
                        <Label className="text-gray-300">Descripción (Opcional)</Label>
                        <Textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Información adicional..."
                            className="bg-[#2d2d2d] border-[#444] text-white placeholder:text-gray-500"
                        />
                    </div>
                </fieldset>

                <DialogFooter className="px-5 py-3 border-t border-[#383838] bg-[#252525] shrink-0 gap-2 sm:gap-0">
                    <Button type="button" disabled={loading} variant="outline" onClick={() => changeOpen(false)} className="border-[#444] text-gray-300 hover:bg-[#333] hover:text-white">
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
                        {loading ? 'Guardando...' : 'Guardar conexión'}
                    </Button>
                </DialogFooter>
              </form>
            </DialogContent>
        </Dialog>
    );
}
