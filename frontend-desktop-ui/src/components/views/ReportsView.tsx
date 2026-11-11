import { uiText, uiFormat } from '../../lib/ui-language';
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Clock, Mail, Server, FolderOpen, Play, Trash2, Edit, Plus, Download, History, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
// import DashboardLayout from "@/components/dashboard-layout";
import { API_BASE_URL } from "@/lib/api";

const API_URL = API_BASE_URL;

interface ScheduledCheck {
    id: number;
    name: string;
    server_id: number | null;
    group_id: number | null;
    server_name: string | null;
    group_name: string | null;
    schedule_type: string;
    cron_expression: string | null;
    schedule_hour: number;
    schedule_minute: number;
    schedule_day_of_week: number | null;
    schedule_day_of_month: number | null;
    email_recipients: string;
    is_active: boolean;
    last_run: string | null;
    next_run: string | null;
    last_status: string | null;
    created_at: string;
}

interface Report {
    id: number;
    server_hostname: string;
    cpu_usage: string | null;
    memory_usage: string | null;
    disk_usage: string | null;
    services_status: string | null;
    status: string;
    pdf_filename: string | null;
    created_at: string;
}

interface ServerOption {
    id: number;
    hostname: string;
}

interface GroupOption {
    id: number;
    name: string;
}

export function ReportsView() {
    const [checks, setChecks] = useState<ScheduledCheck[]>([]);
    const [servers, setServers] = useState<ServerOption[]>([]);
    const [groups, setGroups] = useState<GroupOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [showHistory, setShowHistory] = useState<number | null>(null);
    const [reports, setReports] = useState<Report[]>([]);
    const [runningId, setRunningId] = useState<number | null>(null);

    const [form, setForm] = useState({
        name: "",
        target_type: "server" as "server" | "group",
        server_id: "",
        group_id: "",
        schedule_type: "daily",
        schedule_hour: "9",
        schedule_minute: "0",
        schedule_day_of_week: "0",
        schedule_day_of_month: "1",
        cron_expression: "",
        email_recipients: "",
        is_active: true
    });

    useEffect(() => {
        loadData();
    }, []);

    const getAuthHeaders = () => {
        const token = localStorage.getItem("token");
        return {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        };
    };

    const loadData = async () => {
        try {
            if (API_URL === 'MOCK') {
                // Mock data
                setChecks([
                    {
                        id: 1, name: "Daily Health Check", server_id: 1, group_id: null, server_name: "Production-DB", group_name: null,
                        schedule_type: "daily", cron_expression: null, schedule_hour: 8, schedule_minute: 0,
                        schedule_day_of_week: null, schedule_day_of_month: null, email_recipients: "admin@example.com",
                        is_active: true, last_run: new Date().toISOString(), next_run: new Date(Date.now() + 86400000).toISOString(),
                        last_status: "success", created_at: new Date().toISOString()
                    }
                ]);
                setServers([{ id: 1, hostname: "Production-DB" }, { id: 2, hostname: "Web-Server-01" }]);
                setGroups([{ id: 1, name: "Production" }, { id: 2, name: "Staging" }]);
                return;
            }

            // Load scheduled checks
            const checksRes = await fetch(`${API_URL}/scheduled-reports`, {
                headers: getAuthHeaders()
            });
            if (checksRes.ok) {
                setChecks(await checksRes.json());
            }

            // Load servers
            const serversRes = await fetch(`${API_URL}/servers/`, {
                headers: getAuthHeaders()
            });
            if (serversRes.ok) {
                setServers(await serversRes.json());
            }

            // Load groups
            const groupsRes = await fetch(`${API_URL}/groups/`, {
                headers: getAuthHeaders()
            });
            if (groupsRes.ok) {
                setGroups(await groupsRes.json());
            }
        } catch (error) {
            console.error("Failed to load data:", error);
            toast.error("Error al cargar datos");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        try {
            const payload = {
                name: form.name,
                server_id: form.target_type === "server" ? parseInt(form.server_id) : null,
                group_id: form.target_type === "group" ? parseInt(form.group_id) : null,
                schedule_type: form.schedule_type,
                schedule_hour: parseInt(form.schedule_hour),
                schedule_minute: parseInt(form.schedule_minute),
                schedule_day_of_week: form.schedule_type === "weekly" ? parseInt(form.schedule_day_of_week) : null,
                schedule_day_of_month: form.schedule_type === "monthly" ? parseInt(form.schedule_day_of_month) : null,
                cron_expression: form.schedule_type === "custom" ? form.cron_expression : null,
                email_recipients: form.email_recipients,
                is_active: form.is_active
            };

            const url = editingId
                ? `${API_URL}/scheduled-reports/${editingId}`
                : `${API_URL}/scheduled-reports`;

            const method = editingId ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                toast.success(editingId ? uiText("Configuración actualizada") : uiText("Chequeo programado creado"));
                setShowForm(false);
                setEditingId(null);
                resetForm();
                loadData();
            } else {
                const error = await res.json();
                toast.error(uiFormat("Error: {0}", error.detail || "Error desconocido"));
            }
        } catch (error: any) {
            toast.error(uiFormat("Error: {0}", error.message));
        }
    };

    const handleDelete = async (id: number) => {
        try {
            const res = await fetch(`${API_URL}/scheduled-reports/${id}`, {
                method: "DELETE",
                headers: getAuthHeaders()
            });

            if (res.ok) {
                toast.success(uiText("Chequeo eliminado"));
                loadData();
            }
        } catch (error: any) {
            toast.error(uiFormat("Error: {0}", error.message));
        }
    };

    const handleRunNow = async (id: number) => {
        setRunningId(id);
        try {
            const res = await fetch(`${API_URL}/scheduled-reports/${id}/run`, {
                method: "POST",
                headers: getAuthHeaders()
            });

            if (res.ok) {
                toast.success(uiText("Chequeo iniciado. El reporte será enviado por email."));
            }
        } catch (error: any) {
            toast.error(uiFormat("Error: {0}", error.message));
        } finally {
            setTimeout(() => setRunningId(null), 2000);
        }
    };

    const handleViewHistory = async (checkId: number) => {
        setShowHistory(checkId);
        try {
            const res = await fetch(`${API_URL}/scheduled-reports/${checkId}/history`, {
                headers: getAuthHeaders()
            });
            if (res.ok) {
                setReports(await res.json());
            }
        } catch (error) {
            console.error("Failed to load history:", error);
        }
    };

    const handleDownload = async (reportId: number, filename: string) => {
        try {
            const res = await fetch(`${API_URL}/scheduled-reports/report/${reportId}/download`, {
                headers: getAuthHeaders()
            });
            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = filename;
                a.click();
            }
        } catch (error) {
            console.error("Failed to download:", error);
        }
    };

    const handleEdit = (check: ScheduledCheck) => {
        setForm({
            name: check.name,
            target_type: check.server_id ? "server" : "group",
            server_id: check.server_id?.toString() || "",
            group_id: check.group_id?.toString() || "",
            schedule_type: check.schedule_type,
            schedule_hour: check.schedule_hour?.toString() || "9",
            schedule_minute: check.schedule_minute?.toString() || "0",
            schedule_day_of_week: check.schedule_day_of_week?.toString() || "0",
            schedule_day_of_month: check.schedule_day_of_month?.toString() || "1",
            cron_expression: check.cron_expression || "",
            email_recipients: check.email_recipients,
            is_active: check.is_active
        });
        setEditingId(check.id);
        setShowForm(true);
    };

    const resetForm = () => {
        setForm({
            name: "",
            target_type: "server",
            server_id: "",
            group_id: "",
            schedule_type: "daily",
            schedule_hour: "9",
            schedule_minute: "0",
            schedule_day_of_week: "0",
            schedule_day_of_month: "1",
            cron_expression: "",
            email_recipients: "",
            is_active: true
        });
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return "—";
        return new Date(dateStr).toLocaleString();
    };

    const getStatusBadge = (status: string | null) => {
        if (!status) return null;
        const colors: Record<string, string> = {
            success: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
            failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
            running: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
        };
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || "bg-gray-100"}`}>
                {status}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
        );
    }

    return (
        <div className="p-6 h-full overflow-y-auto">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />{uiText("Informes Programados")}</CardTitle>
                    <CardDescription>{uiText("Configura chequeos de salud automáticos que se ejecutan periódicamente y envían reportes por email")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Add Button */}
                    {!showForm && !showHistory && (
                        <Button onClick={() => { resetForm(); setShowForm(true); setEditingId(null); }}>
                            <Plus className="mr-2 h-4 w-4" />{uiText("Nuevo Chequeo Programado")}</Button>
                    )}

                    {/* Form */}
                    {showForm && (
                        <div className="border rounded-lg p-4 space-y-4 bg-muted/50">
                            <h3 className="font-medium">{editingId ? "Editar Chequeo" : uiText("Nuevo Chequeo Programado")}</h3>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="text-sm font-medium">{uiText("Nombre")}</label>
                                    <Input
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        placeholder="Chequeo diario producción"
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-medium">{uiText("Tipo de objetivo")}</label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={form.target_type}
                                        onChange={(e) => setForm({ ...form, target_type: e.target.value as any })}
                                    >
                                        <option value="server">{uiText("Servidor individual")}</option>
                                        <option value="group">{uiText("Grupo de servidores")}</option>
                                    </select>
                                </div>

                                {form.target_type === "server" ? (
                                    <div>
                                        <label className="text-sm font-medium">{uiText("Servidor")}</label>
                                        <select
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                            value={form.server_id}
                                            onChange={(e) => setForm({ ...form, server_id: e.target.value })}
                                        >
                                            <option value="">{uiText("Seleccionar servidor...")}</option>
                                            {servers.map(s => (
                                                <option key={s.id} value={s.id}>{s.hostname}</option>
                                            ))}
                                        </select>
                                    </div>
                                ) : (
                                    <div>
                                        <label className="text-sm font-medium">{uiText("Grupo")}</label>
                                        <select
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                            value={form.group_id}
                                            onChange={(e) => setForm({ ...form, group_id: e.target.value })}
                                        >
                                            <option value="">{uiText("Seleccionar grupo...")}</option>
                                            {groups.map(g => (
                                                <option key={g.id} value={g.id}>{g.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div>
                                    <label className="text-sm font-medium">{uiText("Frecuencia")}</label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={form.schedule_type}
                                        onChange={(e) => setForm({ ...form, schedule_type: e.target.value })}
                                    >
                                        <option value="daily">{uiText("Diario")}</option>
                                        <option value="weekly">{uiText("Semanal")}</option>
                                        <option value="monthly">{uiText("Mensual")}</option>
                                        <option value="custom">{uiText("Personalizado (Cron)")}</option>
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-sm font-medium">{uiText("Hora")}</label>
                                        <Input
                                            type="number"
                                            min="0"
                                            max="23"
                                            value={form.schedule_hour}
                                            onChange={(e) => setForm({ ...form, schedule_hour: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">{uiText("Minuto")}</label>
                                        <Input
                                            type="number"
                                            min="0"
                                            max="59"
                                            value={form.schedule_minute}
                                            onChange={(e) => setForm({ ...form, schedule_minute: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {form.schedule_type === "weekly" && (
                                    <div>
                                        <label className="text-sm font-medium">{uiText("Día de la semana")}</label>
                                        <select
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                            value={form.schedule_day_of_week}
                                            onChange={(e) => setForm({ ...form, schedule_day_of_week: e.target.value })}
                                        >
                                            <option value="0">{uiText("Lunes")}</option>
                                            <option value="1">{uiText("Martes")}</option>
                                            <option value="2">{uiText("Miércoles")}</option>
                                            <option value="3">{uiText("Jueves")}</option>
                                            <option value="4">{uiText("Viernes")}</option>
                                            <option value="5">{uiText("Sábado")}</option>
                                            <option value="6">{uiText("Domingo")}</option>
                                        </select>
                                    </div>
                                )}

                                {form.schedule_type === "monthly" && (
                                    <div>
                                        <label className="text-sm font-medium">{uiText("Día del mes")}</label>
                                        <Input
                                            type="number"
                                            min="1"
                                            max="31"
                                            value={form.schedule_day_of_month}
                                            onChange={(e) => setForm({ ...form, schedule_day_of_month: e.target.value })}
                                        />
                                    </div>
                                )}

                                {form.schedule_type === "custom" && (
                                    <div className="md:col-span-2">
                                        <label className="text-sm font-medium">{uiText("Expresión Cron")}</label>
                                        <Input
                                            value={form.cron_expression}
                                            onChange={(e) => setForm({ ...form, cron_expression: e.target.value })}
                                            placeholder="0 9 * * 1 (Lunes a las 9:00)"
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">{uiText("Formato: minuto hora día mes día_semana")}</p>
                                    </div>
                                )}

                                <div className="md:col-span-2">
                                    <label className="text-sm font-medium">{uiText("Emails destinatarios")}</label>
                                    <Input
                                        value={form.email_recipients}
                                        onChange={(e) => setForm({ ...form, email_recipients: e.target.value })}
                                        placeholder="admin@example.com, ops@example.com"
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">{uiText("Separar múltiples emails con comas")}</p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="is_active"
                                        checked={form.is_active}
                                        onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                                        className="h-4 w-4"
                                    />
                                    <label htmlFor="is_active" className="text-sm font-medium">{uiText("Activo")}</label>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-4">
                                <Button onClick={handleSubmit}>
                                    {editingId ? "Guardar cambios" : uiText("Crear")}
                                </Button>
                                <Button variant="outline" onClick={() => { setShowForm(false); setEditingId(null); }}>{uiText("Cancelar")}</Button>
                            </div>
                        </div>
                    )}

                    {/* History View */}
                    {showHistory && (
                        <div className="border rounded-lg p-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-medium">{uiText("Historial de Reportes")}</h3>
                                <Button variant="outline" size="sm" onClick={() => setShowHistory(null)}>{uiText("Volver")}</Button>
                            </div>

                            {reports.length === 0 ? (
                                <p className="text-muted-foreground">{uiText("No hay reportes aún.")}</p>
                            ) : (
                                <div className="space-y-2">
                                    {reports.map(report => (
                                        <div key={report.id} className="flex items-center justify-between p-3 border rounded-lg">
                                            <div>
                                                <div className="font-medium">{report.server_hostname}</div>
                                                <div className="text-sm text-muted-foreground">
                                                    {formatDate(report.created_at)} • CPU: {report.cpu_usage || "N/A"} • RAM: {report.memory_usage || "N/A"}
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                {report.services_status === "all_ok" ? (
                                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                                ) : (
                                                    <XCircle className="h-5 w-5 text-yellow-500" />
                                                )}
                                                {report.pdf_filename && (
                                                    <Button size="sm" variant="outline" onClick={() => handleDownload(report.id, report.pdf_filename!)}>
                                                        <Download className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* List of Scheduled Checks */}
                    {!showForm && !showHistory && (
                        <div className="space-y-3">
                            {checks.length === 0 ? (
                                <p className="text-muted-foreground text-center py-8">{uiText("No hay chequeos programados. Crea uno nuevo para comenzar.")}</p>
                            ) : (
                                checks.map(check => (
                                    <div key={check.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">{check.name}</span>
                                                {!check.is_active && (
                                                    <span className="px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-800">{uiText("Inactivo")}</span>
                                                )}
                                                {getStatusBadge(check.last_status)}
                                            </div>
                                            <div className="text-sm text-muted-foreground mt-1 flex items-center gap-4">
                                                <span className="flex items-center gap-1">
                                                    {check.server_name ? (
                                                        <><Server className="h-3 w-3" /> {check.server_name}</>
                                                    ) : (
                                                        <><FolderOpen className="h-3 w-3" /> {check.group_name}</>
                                                    )}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {check.schedule_type} @ {check.schedule_hour.toString().padStart(2, "0")}:{check.schedule_minute.toString().padStart(2, "0")}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Mail className="h-3 w-3" />
                                                    {check.email_recipients.split(",")[0]}...
                                                </span>
                                            </div>
                                            <div className="text-xs text-muted-foreground mt-1">{uiText("Última ejecución:")}{formatDate(check.last_run)}{" "}{uiText("• Próxima:")}{" "}{formatDate(check.next_run)}
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <Button size="sm" variant="ghost" onClick={() => handleRunNow(check.id)} disabled={runningId === check.id}>
                                                {runningId === check.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                                            </Button>
                                            <Button size="sm" variant="ghost" onClick={() => handleViewHistory(check.id)}>
                                                <History className="h-4 w-4" />
                                            </Button>
                                            <Button size="sm" variant="ghost" onClick={() => handleEdit(check)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button size="sm" variant="ghost" onClick={() => handleDelete(check.id)}>
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
