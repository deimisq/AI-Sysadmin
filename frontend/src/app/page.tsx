"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Terminal, Users, Zap, Download, Lock, Globe, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { LanguageSwitcher } from "@/components/language-switcher";

export default function LandingPage() {
    const router = useRouter();

    const features = [
        {
            icon: Terminal,
            title: "Gestión SSH Centralizada",
            description: "Administra todas tus conexiones SSH desde una sola aplicación. Conexiones seguras y encriptadas."
        },
        {
            icon: Shield,
            title: "Multi-Tenancy Empresarial",
            description: "Organiza usuarios, equipos y servidores por organizaciones con aislamiento completo de datos."
        },
        {
            icon: Zap,
            title: "Asistente IA Integrado",
            description: "Automatiza tareas de administración con nuestro asistente de IA especializado en sistemas."
        },
        {
            icon: Users,
            title: "Gestión de Usuarios",
            description: "Control granular de permisos y roles. Invita usuarios y gestiona accesos fácilmente."
        },
        {
            icon: Lock,
            title: "Seguridad Avanzada",
            description: "Autenticación robusta, encriptación de credenciales y auditoría completa de acciones."
        },
        {
            icon: Globe,
            title: "Acceso Web y Desktop",
            description: "Panel de administración web + aplicación desktop para trabajo remoto completo."
        }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950">
            {/* Header */}
            <header className="fixed top-0 w-full backdrop-blur-sm bg-white/70 dark:bg-gray-900/70 border-b border-gray-200 dark:border-gray-800 z-50">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Shield className="h-8 w-8 text-blue-600" />
                        <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                            AI Sysadmin Agent
                        </span>
                    </div>
                    <nav className="hidden md:flex items-center gap-6">
                        <a href="#features" className="text-sm hover:text-blue-600 transition-colors">Características</a>
                        <a href="#download" className="text-sm hover:text-blue-600 transition-colors">Descargas</a>
                        <a href="#pricing" className="text-sm hover:text-blue-600 transition-colors">Licencias</a>
                        <ThemeSwitcher />
                        <LanguageSwitcher />
                        <Button onClick={() => router.push("/login")} variant="outline" size="sm">
                            Iniciar Sesión
                        </Button>
                    </nav>
                </div>
            </header>

            {/* Hero Section */}
            <section className="pt-32 pb-20 px-4">
                <div className="container mx-auto text-center max-w-4xl">
                    <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                        Gestión de Servidores con Inteligencia Artificial
                    </h1>
                    <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
                        La herramienta definitiva para administradores de sistemas. Conecta, gestiona y automatiza tus servidores desde una sola plataforma.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Button size="lg" className="text-lg px-8" onClick={() => router.push("#download")}>
                            <Download className="mr-2 h-5 w-5" />
                            Descargar Ahora
                        </Button>
                        <Button size="lg" variant="outline" className="text-lg px-8" onClick={() => router.push("/login")}>
                            Panel Web
                            <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-20 px-4 bg-white/50 dark:bg-gray-900/50">
                <div className="container mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-4xl font-bold mb-4">Características Principales</h2>
                        <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                            Todo lo que necesitas para gestionar tu infraestructura de manera eficiente y segura
                        </p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {features.map((feature, index) => (
                            <Card key={index} className="hover:shadow-lg transition-shadow">
                                <CardHeader>
                                    <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg w-fit mb-4">
                                        <feature.icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <CardTitle>{feature.title}</CardTitle>
                                    <CardDescription>{feature.description}</CardDescription>
                                </CardHeader>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* Download Section */}
            <section id="download" className="py-20 px-4">
                <div className="container mx-auto text-center">
                    <h2 className="text-4xl font-bold mb-4">Descarga la Aplicación</h2>
                    <p className="text-gray-600 dark:text-gray-300 mb-12 max-w-2xl mx-auto">
                        Disponible para Windows, Linux y macOS
                    </p>
                    <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                        <Card className="hover:shadow-lg transition-shadow">
                            <CardHeader>
                                <CardTitle>Windows</CardTitle>
                                <CardDescription>Windows 10/11 (64-bit)</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button className="w-full" disabled>
                                    <Download className="mr-2 h-4 w-4" />
                                    Próximamente
                                </Button>
                            </CardContent>
                        </Card>
                        <Card className="hover:shadow-lg transition-shadow">
                            <CardHeader>
                                <CardTitle>Linux</CardTitle>
                                <CardDescription>Ubuntu, Debian, Fedora</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button className="w-full" disabled>
                                    <Download className="mr-2 h-4 w-4" />
                                    Próximamente
                                </Button>
                            </CardContent>
                        </Card>
                        <Card className="hover:shadow-lg transition-shadow">
                            <CardHeader>
                                <CardTitle>macOS</CardTitle>
                                <CardDescription>macOS 11+ (Intel/Apple Silicon)</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button className="w-full" disabled>
                                    <Download className="mr-2 h-4 w-4" />
                                    Próximamente
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="py-20 px-4 bg-white/50 dark:bg-gray-900/50">
                <div className="container mx-auto text-center">
                    <h2 className="text-4xl font-bold mb-4">Planes y Licencias</h2>
                    <p className="text-gray-600 dark:text-gray-300 mb-12 max-w-2xl mx-auto">
                        Elige el plan que mejor se adapte a tus necesidades
                    </p>
                    <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                        <Card>
                            <CardHeader>
                                <CardTitle>Starter</CardTitle>
                                <CardDescription>Para equipos pequeños</CardDescription>
                                <div className="text-3xl font-bold mt-4">$99<span className="text-lg text-gray-500">/mes</span></div>
                            </CardHeader>
                            <CardContent>
                                <ul className="text-left space-y-2 mb-6">
                                    <li>✓ Hasta 5 usuarios</li>
                                    <li>✓ 20 servidores</li>
                                    <li>✓ Soporte por email</li>
                                    <li>✓ Actualizaciones incluidas</li>
                                </ul>
                                <Button className="w-full" variant="outline" disabled>Próximamente</Button>
                            </CardContent>
                        </Card>
                        <Card className="border-2 border-blue-500 shadow-lg">
                            <CardHeader>
                                <div className="text-xs bg-blue-500 text-white px-3 py-1 rounded-full w-fit mb-2">Más Popular</div>
                                <CardTitle>Professional</CardTitle>
                                <CardDescription>Para equipos en crecimiento</CardDescription>
                                <div className="text-3xl font-bold mt-4">$299<span className="text-lg text-gray-500">/mes</span></div>
                            </CardHeader>
                            <CardContent>
                                <ul className="text-left space-y-2 mb-6">
                                    <li>✓ Usuarios ilimitados</li>
                                    <li>✓ 100 servidores</li>
                                    <li>✓ Soporte prioritario</li>
                                    <li>✓ IA avanzada</li>
                                    <li>✓ Multi-tenant</li>
                                </ul>
                                <Button className="w-full" disabled>Próximamente</Button>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Enterprise</CardTitle>
                                <CardDescription>Para grandes organizaciones</CardDescription>
                                <div className="text-3xl font-bold mt-4">Custom</div>
                            </CardHeader>
                            <CardContent>
                                <ul className="text-left space-y-2 mb-6">
                                    <li>✓ Todo en Professional</li>
                                    <li>✓ Servidores ilimitados</li>
                                    <li>✓ Soporte 24/7</li>
                                    <li>✓ Implementación dedicada</li>
                                    <li>✓ SLA garantizado</li>
                                </ul>
                                <Button className="w-full" variant="outline" disabled>Contactar</Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 px-4 border-t border-gray-200 dark:border-gray-800">
                <div className="container mx-auto text-center text-gray-600 dark:text-gray-400">
                    <p>&copy; 2026 AI Sysadmin Agent. Todos los derechos reservados.</p>
                    <div className="mt-4 flex justify-center gap-6">
                        <a href="#" className="hover:text-blue-600 transition-colors">Documentación</a>
                        <a href="#" className="hover:text-blue-600 transition-colors">Soporte</a>
                        <a href="#" className="hover:text-blue-600 transition-colors">Términos</a>
                        <a href="#" className="hover:text-blue-600 transition-colors">Privacidad</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
