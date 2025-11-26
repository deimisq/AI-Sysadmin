"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Calendar, AlertTriangle, CheckCircle } from "lucide-react";
import { fetchLicenseStatus } from "@/lib/api";
import { useI18n } from "@/lib/i18n-context";

export function LicenseStatus() {
    const { t } = useI18n();
    const [license, setLicense] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadLicense();
    }, []);

    const loadLicense = async () => {
        try {
            const data = await fetchLicenseStatus();
            setLicense(data);
        } catch (error) {
            console.error("Failed to load license", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        License Status
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Loading...</p>
                </CardContent>
            </Card>
        );
    }

    if (!license) {
        return (
            <Card className="border-red-200 dark:border-red-900">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                        <AlertTriangle className="h-5 w-5" />
                        No License Found
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Please contact support to obtain a license.</p>
                </CardContent>
            </Card>
        );
    }

    const isExpiringSoon = license.days_remaining <= 7 && license.days_remaining > 0;
    const isExpired = license.status === "EXPIRED" || license.days_remaining <= 0;

    return (
        <Card className={isExpired ? "border-red-200 dark:border-red-900" : isExpiringSoon ? "border-yellow-200 dark:border-yellow-900" : ""}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    License Status
                </CardTitle>
                <CardDescription>
                    Current license information and validity
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">License Type</p>
                        <div className="flex items-center gap-2 mt-1">
                            <Badge variant={license.type === "TRIAL" ? "secondary" : "default"}>
                                {license.type}
                            </Badge>
                        </div>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Status</p>
                        <div className="flex items-center gap-2 mt-1">
                            {isExpired ? (
                                <Badge variant="destructive" className="flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    EXPIRED
                                </Badge>
                            ) : (
                                <Badge variant="default" className="flex items-center gap-1 bg-green-600">
                                    <CheckCircle className="h-3 w-3" />
                                    {license.status}
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Start Date</p>
                        <p className="text-sm mt-1">{new Date(license.start_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Expiration Date</p>
                        <p className="text-sm mt-1">{new Date(license.expiration_date).toLocaleDateString()}</p>
                    </div>
                </div>

                <div className={`p-4 rounded-md ${isExpired ? "bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900" : isExpiringSoon ? "bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-900" : "bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-900"}`}>
                    <div className="flex items-center gap-2">
                        <Calendar className={`h-5 w-5 ${isExpired ? "text-red-600 dark:text-red-400" : isExpiringSoon ? "text-yellow-600 dark:text-yellow-400" : "text-green-600 dark:text-green-400"}`} />
                        <div>
                            <p className={`font-medium ${isExpired ? "text-red-900 dark:text-red-100" : isExpiringSoon ? "text-yellow-900 dark:text-yellow-100" : "text-green-900 dark:text-green-100"}`}>
                                {isExpired ? "License Expired" : `${license.days_remaining} days remaining`}
                            </p>
                            <p className={`text-sm ${isExpired ? "text-red-700 dark:text-red-300" : isExpiringSoon ? "text-yellow-700 dark:text-yellow-300" : "text-green-700 dark:text-green-300"}`}>
                                {isExpired
                                    ? "Please renew your license to continue using the system"
                                    : isExpiringSoon
                                        ? "Your license will expire soon. Please renew to avoid service interruption"
                                        : "Your license is active and valid"}
                            </p>
                        </div>
                    </div>
                </div>

                {license.type === "TRIAL" && !isExpired && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-900 rounded-md">
                        <p className="text-sm text-blue-900 dark:text-blue-100">
                            <strong>Trial License:</strong> You are using a free trial version. Contact sales to purchase a commercial license.
                        </p>
                    </div>
                )}

                <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground">
                        Installation ID: <code className="bg-muted px-1 py-0.5 rounded text-xs">{license.installation_id}</code>
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
