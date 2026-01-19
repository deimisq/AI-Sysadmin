import { useEffect, useState } from 'react';
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

interface ServerFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    serverToEdit?: Server | null;
    groups: any[];
    onSuccess: () => void;
}

export function ServerFormDialog({ open, onOpenChange, serverToEdit, groups, onSuccess }: ServerFormDialogProps) {
    const isEditing = !!serverToEdit;
    const [loading, setLoading] = useState(false);

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
            if (serverToEdit) {
                setFormData({
                    hostname: serverToEdit.hostname,
                    ip_address: serverToEdit.ip_address,
                    description: serverToEdit.description || '',
                    os_info: serverToEdit.os_info || '',
                    group_id: serverToEdit.group_id || null,
                    ssh_username: serverToEdit.ssh_username || '',
                    ssh_password: '',
                    ssh_key_path: ''
                });
            } else {
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
        if (!formData.hostname || !formData.ip_address) {
            toast.error("Nombre y Dirección IP son obligatorios");
            return;
        }

        setLoading(true);
        try {
            const payload = {
                ...formData,
                group_id: formData.group_id ?? undefined
            };

            // Remove empty password/key fields to avoid overwriting with empty strings if API doesn't handle it
            if (!payload.ssh_password) delete (payload as any).ssh_password;
            if (!payload.ssh_key_path) delete (payload as any).ssh_key_path;

            if (isEditing && serverToEdit) {
                await updateServer(serverToEdit.id, payload);
                toast.success('Servidor actualizado exitosamente');
            } else {
                await createServer(payload);
                toast.success('Servidor creado exitosamente');
            }
            onSuccess();
            onOpenChange(false);
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || 'Error al guardar el servidor');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#1e1e1e] border-[#333] text-[#cccccc]">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-semibold text-white">
                        {isEditing ? 'Editar Servidor' : 'Agregar Nuevo Servidor'}
                    </DialogTitle>
                    <DialogDescription className="text-gray-400">
                        {isEditing
                            ? 'Modifica los detalles de conexión y configuración del servidor.'
                            : 'Ingresa los detalles para conectar un nuevo servidor a la plataforma.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-gray-300">Nombre *</Label>
                            <Input
                                value={formData.hostname}
                                onChange={(e) => setFormData({ ...formData, hostname: e.target.value })}
                                placeholder="ej., servidor-web-01"
                                className="bg-[#2d2d2d] border-[#444] text-white placeholder:text-gray-500"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-gray-300">Dirección IP *</Label>
                            <Input
                                value={formData.ip_address}
                                onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
                                placeholder="ej., 192.168.1.100"
                                className="bg-[#2d2d2d] border-[#444] text-white placeholder:text-gray-500"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-gray-300">Sistema Operativo</Label>
                        <Input
                            value={formData.os_info}
                            onChange={(e) => setFormData({ ...formData, os_info: e.target.value })}
                            placeholder="ej., Ubuntu 22.04"
                            className="bg-[#2d2d2d] border-[#444] text-white placeholder:text-gray-500"
                        />
                    </div>

                    <div className="space-y-2">
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
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-gray-300">Usuario SSH</Label>
                            <Input
                                value={formData.ssh_username}
                                onChange={(e) => setFormData({ ...formData, ssh_username: e.target.value })}
                                placeholder="root"
                                className="bg-[#2d2d2d] border-[#444] text-white placeholder:text-gray-500"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-gray-300">Contraseña SSH {isEditing && '(Opcional)'}</Label>
                            <Input
                                type="password"
                                value={formData.ssh_password}
                                onChange={(e) => setFormData({ ...formData, ssh_password: e.target.value })}
                                placeholder={isEditing ? "••••••••" : "Contraseña"}
                                className="bg-[#2d2d2d] border-[#444] text-white placeholder:text-gray-500"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-gray-300">Ruta de Clave Privada SSH {isEditing && '(Opcional)'}</Label>
                        <Textarea
                            className="min-h-[100px] font-mono text-xs bg-[#2d2d2d] border-[#444] text-white placeholder:text-gray-500"
                            value={formData.ssh_key_path}
                            onChange={(e) => setFormData({ ...formData, ssh_key_path: e.target.value })}
                            placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;..."
                        />
                        <p className="text-xs text-gray-500">
                            Proporciona contraseña SSH o ruta de clave privada (prioridad a clave).
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-gray-300">Descripción (Opcional)</Label>
                        <Textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Información adicional..."
                            className="bg-[#2d2d2d] border-[#444] text-white placeholder:text-gray-500"
                        />
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="border-[#444] text-gray-300 hover:bg-[#333] hover:text-white">
                        Cancelar
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
                        {loading ? 'Guardando...' : (isEditing ? 'Guardar Cambios' : 'Crear Servidor')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
