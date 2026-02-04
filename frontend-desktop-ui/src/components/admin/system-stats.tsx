import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";

interface SystemStatsProps {
    stats: any;
}

export function SystemStats({ stats }: SystemStatsProps) {
    if (!stats) {
        return <div>Cargando estadísticas...</div>;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Estadísticas del Sistema
                </CardTitle>
                <CardDescription>Resumen de recursos y actividad del sistema</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <h3 className="font-medium">Recursos</h3>
                        <div className="space-y-1">
                            <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Total Usuarios:</span>
                                <span className="font-medium">{stats.total_users}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Total Servidores:</span>
                                <span className="font-medium">{stats.total_servers}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Total Grupos:</span>
                                <span className="font-medium">{stats.total_groups}</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h3 className="font-medium">Actividad</h3>
                        <div className="space-y-1">
                            <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Total Operaciones:</span>
                                <span className="font-medium">{stats.total_operations}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-green-600">
                                <Activity className="h-4 w-4" />
                                <span>Operativo</span>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
