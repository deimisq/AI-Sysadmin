import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Server, MessageSquare } from "lucide-react";

export function CommunicationSettings() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Configuración de Comunicaciones
                </CardTitle>
                <CardDescription>
                    Gestiona la integración con servicios de comunicación
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                    <div className="p-6 border rounded-lg text-center">
                        <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="font-medium mb-2">Microsoft Teams</h3>
                        <p className="text-sm text-muted-foreground">Coming Soon</p>
                    </div>
                    <div className="p-6 border rounded-lg text-center">
                        <Server className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="font-medium mb-2">Webhooks</h3>
                        <p className="text-sm text-muted-foreground">Coming Soon</p>
                    </div>
                    <div className="p-6 border rounded-lg text-center">
                        <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="font-medium mb-2">Email Gateway</h3>
                        <p className="text-sm text-muted-foreground">Coming Soon</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
