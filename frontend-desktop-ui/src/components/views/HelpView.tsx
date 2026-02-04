import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Book, MessageCircle, Github, Mail } from "lucide-react";

export function HelpView() {
    return (
        <div className="p-6 h-full overflow-y-auto">
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Ayuda y Soporte</h1>
                    <p className="text-muted-foreground">Recursos para aprovechar al máximo la plataforma</p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Book className="h-5 w-5" /> Documentación</CardTitle>
                            <CardDescription>Guías completas y referencias</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground mb-4">
                                Accede a nuestras guías detalladas, tutoriales y referencias de API.
                            </p>
                            <Button variant="secondary" className="w-full">Abrir Documentación</Button>
                        </CardContent>
                    </Card>

                    <Card className="hover:bg-muted/50 transition-colors">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><MessageCircle className="h-5 w-5" /> Asistente IA</CardTitle>
                            <CardDescription>Ayuda contextual inmediata</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground mb-4">
                                Pregunta a tu asistente IA sobre cualquier error o configuración.
                            </p>
                            <Button variant="secondary" className="w-full">Ir al Chat</Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Github className="h-5 w-5" /> Código Fuente</CardTitle>
                            <CardDescription>Reportar bugs y contribuir</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button variant="outline" className="w-full">Ver en GitHub</Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5" /> Contacto</CardTitle>
                            <CardDescription>Soporte técnico directo</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button variant="outline" className="w-full">support@aisysadmin.com</Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
