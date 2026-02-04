"use client";

import { useEffect, useState } from "react";
import { fetchVersion, fetchLicenseStatus, activateLicenseKey, LicenseStatus, fetchCurrentUser } from "@/lib/api";
import { useI18n } from "@/lib/i18n-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, ShieldCheck, ShieldAlert, Key, ExternalLink, X } from "lucide-react";

export function Footer() {
    const { t } = useI18n();
    const [versionInfo, setVersionInfo] = useState<any>({
        version: "0.9.3-beta3",
        fullVersion: "0.9.3-beta3",
        name: "AI Sysadmin Agent",
        currentYear: new Date().getFullYear()
    });
    const [licenseStatus, setLicenseStatus] = useState<LicenseStatus | null>(null);
    const [showLicenseModal, setShowLicenseModal] = useState(false);
    const [newLicenseKey, setNewLicenseKey] = useState("");
    const [activating, setActivating] = useState(false);
    const [activationError, setActivationError] = useState("");
    const [isSuperadmin, setIsSuperadmin] = useState(false);

    useEffect(() => {
        loadVersion();
        checkUserRole();
    }, []);

    const checkUserRole = async () => {
        // Check if user is logged in and is superadmin via API
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;
            if (!token) return;

            const user = await fetchCurrentUser();
            if (user && user.role === "superadmin") {
                setIsSuperadmin(true);
                loadLicenseStatus();
            }
        } catch (e) {
            // User not logged in or error fetching - silently ignore
            console.debug("Could not fetch user role for license display");
        }
    };

    const loadVersion = async () => {
        try {
            const data = await fetchVersion();
            setVersionInfo(data);
        } catch (error) {
            console.error("Failed to load version", error);
        }
    };

    const loadLicenseStatus = async () => {
        try {
            const data = await fetchLicenseStatus();
            setLicenseStatus(data);
        } catch (error) {
            console.error("Failed to load license status", error);
        }
    };

    const handleActivateLicense = async () => {
        if (!newLicenseKey.trim()) return;

        setActivating(true);
        setActivationError("");

        try {
            await activateLicenseKey(newLicenseKey.trim());
            await loadLicenseStatus();
            setShowLicenseModal(false);
            setNewLicenseKey("");
        } catch (error: any) {
            setActivationError(error.message || "Error al activar licencia");
        } finally {
            setActivating(false);
        }
    };

    const getLicenseTypeLabel = (type: string) => {
        switch (type) {
            case "trial": return t.license?.trial || "Prueba";
            case "commercial": return t.license?.commercial || "Comercial";
            case "enterprise": return t.license?.enterprise || "Enterprise";
            default: return type;
        }
    };

    const getLicenseIcon = () => {
        if (!licenseStatus) return <Shield className="h-4 w-4 text-gray-400" />;
        if (licenseStatus.is_expired) return <ShieldAlert className="h-4 w-4 text-red-500" />;
        if (licenseStatus.days_remaining <= 30) return <ShieldAlert className="h-4 w-4 text-yellow-500" />;
        return <ShieldCheck className="h-4 w-4 text-green-500" />;
    };

    const getLicenseStatusClass = () => {
        if (!licenseStatus) return "text-gray-400";
        if (licenseStatus.is_expired) return "text-red-500";
        if (licenseStatus.days_remaining <= 30) return "text-yellow-500";
        return "text-green-500";
    };

    return (
        <>
            <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex flex-col items-center justify-between gap-4 py-6 md:h-16 md:flex-row md:py-0">
                    {/* Left side - Copyright */}
                    <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
                        <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
                            © {versionInfo.currentYear} {versionInfo.name}. {t.footer.allRightsReserved}
                        </p>
                    </div>

                    {/* Center - License Status (only for superadmin) */}
                    {isSuperadmin && (
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setShowLicenseModal(true)}
                                className={`flex items-center gap-2 text-xs hover:opacity-80 transition-opacity cursor-pointer ${getLicenseStatusClass()}`}
                            >
                                {getLicenseIcon()}
                                {licenseStatus ? (
                                    <span>
                                        <span className="font-medium">{getLicenseTypeLabel(licenseStatus.license_type)}</span>
                                        {" · "}
                                        {licenseStatus.is_expired ? (
                                            <span className="text-red-500">{t.license?.expired || "Expirada"}</span>
                                        ) : (
                                            <span>
                                                {licenseStatus.days_remaining} {t.license?.daysRemaining || "días restantes"}
                                            </span>
                                        )}
                                    </span>
                                ) : (
                                    <span>{t.common?.loading || "Cargando..."}</span>
                                )}
                            </button>
                        </div>
                    )}

                    {/* Right side - Version */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                            {t.footer.version}: <span className="font-mono font-semibold">{versionInfo.fullVersion || versionInfo.version}</span>
                        </span>
                    </div>
                </div>
            </footer>

            {/* License Modal (only for superadmin) */}
            {isSuperadmin && showLicenseModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-background border rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <Key className="h-5 w-5" />
                                {t.license?.title || "Gestión de Licencia"}
                            </h2>
                            <button
                                onClick={() => setShowLicenseModal(false)}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Current License Status */}
                        <div className="bg-muted/50 rounded-lg p-4 mb-4">
                            <h3 className="text-sm font-medium mb-2">{t.license?.currentLicense || "Licencia Actual"}</h3>
                            {licenseStatus && (
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">{t.license?.type || "Tipo"}:</span>
                                        <span className={`font-medium ${getLicenseStatusClass()}`}>
                                            {getLicenseTypeLabel(licenseStatus.license_type)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">{t.license?.status || "Estado"}:</span>
                                        <span className={licenseStatus.is_expired ? "text-red-500" : "text-green-500"}>
                                            {licenseStatus.is_expired ?
                                                (t.license?.expired || "Expirada") :
                                                (t.license?.active || "Activa")
                                            }
                                        </span>
                                    </div>
                                    {!licenseStatus.is_expired && (
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">{t.license?.daysRemaining || "Días restantes"}:</span>
                                            <span className={licenseStatus.days_remaining <= 30 ? "text-yellow-500" : ""}>
                                                {licenseStatus.days_remaining}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">{t.license?.maxServers || "Máx. Servidores"}:</span>
                                        <span>{licenseStatus.max_servers === -1 ? "∞" : licenseStatus.max_servers}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">{t.license?.maxUsers || "Máx. Usuarios"}:</span>
                                        <span>{licenseStatus.max_users === -1 ? "∞" : licenseStatus.max_users}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Activate New License */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-medium">{t.license?.activateNew || "Activar Nueva Licencia"}</h3>
                            <Input
                                placeholder="XXXX-XXXX-XXXX-XXXX-XXXX"
                                value={newLicenseKey}
                                onChange={(e) => setNewLicenseKey(e.target.value.toUpperCase())}
                                className="font-mono"
                            />
                            {activationError && (
                                <p className="text-sm text-red-500">{activationError}</p>
                            )}
                            <Button
                                onClick={handleActivateLicense}
                                disabled={activating || !newLicenseKey.trim()}
                                className="w-full"
                            >
                                {activating ? (t.common?.loading || "Cargando...") : (t.license?.activate || "Activar Licencia")}
                            </Button>
                        </div>

                        {/* Buy License Link */}
                        <div className="mt-4 pt-4 border-t">
                            <a
                                href="https://agent.sentrait.com.uy:8080/licenses.html"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 text-sm text-primary hover:underline"
                            >
                                <ExternalLink className="h-4 w-4" />
                                {t.license?.buyLicense || "Comprar Licencia"}
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
