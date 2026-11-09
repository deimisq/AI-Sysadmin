"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Loader2, Shield, Building2, CreditCard } from "lucide-react";
import { toast } from "sonner";

function SubscribePageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const preselectedPlan = searchParams.get("plan") || "starter";

    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState(preselectedPlan);
    const [formData, setFormData] = useState({
        orgName: "",
        adminName: "",
        email: "",
        password: "",
        confirmPassword: ""
    });

    const plans = [
        {
            id: "starter",
            name: "Starter",
            price: "$99",
            features: ["5 Usuarios", "20 Servidores", "Soporte Email"]
        },
        {
            id: "professional",
            name: "Professional",
            price: "$299",
            features: ["Usuarios Ilimitados", "100 Servidores", "IA Avanzada", "Multi-tenant"]
        },
        {
            id: "enterprise",
            name: "Enterprise",
            price: "Custom",
            features: ["Servidores Ilimitados", "Soporte 24/7", "SLA Garantizado", "Onboarding Dedicado"]
        }
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            toast.error("Las contraseñas no coinciden");
            return;
        }

        setIsLoading(true);

        try {
            const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "/api/v1";
            const res = await fetch(`${apiBaseUrl}/organizations/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    org_name: formData.orgName,
                    admin_name: formData.adminName,
                    email: formData.email,
                    password: formData.password,
                    plan: selectedPlan
                })
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.detail || "Error en el registro");
            }

            toast.success("¡Organización registrada exitosamente!");
            setIsSubmitted(true);
            window.scrollTo(0, 0);
        } catch (error) {
            toast.error("Error al registrar: " + (error as Error).message);
        } finally {
            setIsLoading(false);
        }
    };

    if (isSubmitted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
                <Card className="max-w-md w-full text-center">
                    <CardHeader>
                        <div className="mx-auto bg-blue-100 dark:bg-blue-900/30 p-4 rounded-full w-fit mb-4">
                            <Shield className="h-12 w-12 text-blue-600 dark:text-blue-400" />
                        </div>
                        <CardTitle>¡Cuenta Creada!</CardTitle>
                        <CardDescription>
                            Hemos enviado un correo de verificación a <strong>{formData.email}</strong>
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Por favor revisa tu bandeja de entrada (y spam) y haz clic en el enlace de verificación para activar tu cuenta y comenzar.
                        </p>
                        <Button variant="outline" onClick={() => router.push("/login")} className="w-full">
                            Ir al Login
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto space-y-8">

                <div className="text-center">
                    <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-100 mb-2">
                        Configura tu Organización
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-400">
                        Comienza a gestionar tus servidores de manera inteligente en minutos.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Left Column: Plan Selection */}
                    <div className="space-y-6">
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-blue-600" />
                            Plan Seleccionado
                        </h2>
                        <div className="space-y-4">
                            {plans.map((plan) => (
                                <div
                                    key={plan.id}
                                    className={`relative rounded-lg border-2 p-4 cursor-pointer transition-all ${selectedPlan === plan.id
                                        ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                                        : "border-gray-200 dark:border-gray-800 hover:border-blue-300"
                                        }`}
                                    onClick={() => setSelectedPlan(plan.id)}
                                >
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="font-bold text-lg">{plan.name}</h3>
                                        {selectedPlan === plan.id && <Check className="h-5 w-5 text-blue-600" />}
                                    </div>
                                    <div className="text-2xl font-bold mb-2">{plan.price}<span className="text-sm font-normal text-gray-500">/mes</span></div>
                                    <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-300">
                                        {plan.features.map((feat, i) => (
                                            <li key={i}>• {feat}</li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Column: Registration Form */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Building2 className="h-5 w-5 text-blue-600" />
                                Detalles de la Cuenta
                            </CardTitle>
                            <CardDescription>
                                Crea la cuenta de administrador para tu organización.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="orgName">Nombre de la Organización</Label>
                                    <Input
                                        id="orgName"
                                        placeholder="Ej: Acme Corp"
                                        required
                                        value={formData.orgName}
                                        onChange={e => setFormData({ ...formData, orgName: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="adminName">Nombre Completo del Admin</Label>
                                    <Input
                                        id="adminName"
                                        placeholder="Ej: Juan Pérez"
                                        required
                                        value={formData.adminName}
                                        onChange={e => setFormData({ ...formData, adminName: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Correo Electrónico</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="admin@empresa.com"
                                        required
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="password">Contraseña</Label>
                                        <Input
                                            id="password"
                                            type="password"
                                            required
                                            value={formData.password}
                                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="confirmPassword">Confirmar</Label>
                                        <Input
                                            id="confirmPassword"
                                            type="password"
                                            required
                                            value={formData.confirmPassword}
                                            onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Creando cuenta...
                                        </>
                                    ) : (
                                        "Crear Organización y Suscribirse"
                                    )}
                                </Button>
                            </form>
                        </CardContent>
                        <CardFooter className="flex justify-center border-t pt-4">
                            <p className="text-xs text-center text-muted-foreground">
                                Al registrarte, aceptas nuestros <a href="#" className="underline hover:text-primary">Términos de Servicio</a> y <a href="#" className="underline hover:text-primary">Política de Privacidad</a>.
                            </p>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </div>
    );
}

export default function SubscribePage() {
    return <Suspense fallback={<div role="status">Cargando...</div>}><SubscribePageContent /></Suspense>;
}
