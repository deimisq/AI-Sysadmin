import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Monitor, Languages, Bell, Laptop } from "lucide-react";

export function SettingsView() {
    return (
        <div className="p-6 h-full overflow-y-auto">
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Ajustes</h1>
                    <p className="text-muted-foreground">Preferencias generales de la aplicación</p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Monitor className="h-5 w-5" /> Apariencia</CardTitle>
                        <CardDescription>Personaliza la experiencia visual</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <Label className="text-base">Tema</Label>
                                <p className="text-sm text-muted-foreground">Selecciona el tema de la interfaz</p>
                            </div>
                            <div className="flex items-center bg-muted rounded-lg p-1 gap-1">
                                <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground"><Sun className="h-4 w-4 mr-2" /> Claro</Button>
                                <Button variant="secondary" size="sm" className="h-8 px-2"><Moon className="h-4 w-4 mr-2" /> Oscuro</Button>
                                <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground"><Laptop className="h-4 w-4 mr-2" /> Sistema</Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Languages className="h-5 w-5" /> Idioma y Región</CardTitle>
                        <CardDescription>Configuración regional</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <Label className="text-base">Idioma</Label>
                                <p className="text-sm text-muted-foreground">Idioma principal de la aplicación</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">Español</span>
                                <Button variant="outline" size="sm">Cambiar</Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
