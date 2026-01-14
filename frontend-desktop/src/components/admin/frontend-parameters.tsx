import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Code, Palette, Layout } from "lucide-react";

export function FrontendParameters() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Code className="h-5 w-5" />
                    Parámetros del Frontend
                </CardTitle>
                <CardDescription>
                    Configuración de la interfaz de usuario y preferencias visuales
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                    <div className="p-6 border rounded-lg text-center">
                        <Palette className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="font-medium mb-2">Temas y Colores</h3>
                        <p className="text-sm text-muted-foreground">Personaliza la apariencia</p>
                    </div>
                    <div className="p-6 border rounded-lg text-center">
                        <Layout className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="font-medium mb-2">Layout</h3>
                        <p className="text-sm text-muted-foreground">Configura el diseño</p>
                    </div>
                    <div className="p-6 border rounded-lg text-center">
                        <Code className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="font-medium mb-2">Scripts personalizados</h3>
                        <p className="text-sm text-muted-foreground">Añade código personalizado</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
