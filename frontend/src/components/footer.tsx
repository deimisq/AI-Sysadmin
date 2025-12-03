"use client";

import { useEffect, useState } from "react";
import { fetchVersion } from "@/lib/api";
import { useI18n } from "@/lib/i18n-context";

export function Footer() {
    const { t } = useI18n();
    const [versionInfo, setVersionInfo] = useState({
        version: "1.0.0",
        name: "AI Sysadmin Agent",
        currentYear: new Date().getFullYear()
    });

    useEffect(() => {
        loadVersion();
    }, []);

    const loadVersion = async () => {
        try {
            const data = await fetchVersion();
            setVersionInfo(data);
        } catch (error) {
            console.error("Failed to load version", error);
        }
    };

    return (
        <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex flex-col items-center justify-between gap-4 py-6 md:h-16 md:flex-row md:py-0">
                <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
                    <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
                        © {versionInfo.currentYear} {versionInfo.name}. {t.footer.allRightsReserved}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                        {t.footer.version}: <span className="font-mono font-semibold">{versionInfo.version}</span>
                    </span>
                </div>
            </div>
        </footer>
    );
}
