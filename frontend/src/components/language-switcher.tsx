"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useI18n } from "@/lib/i18n-context";

export function LanguageSwitcher() {
    const { locale, setLocale, t } = useI18n();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                    <Globe className="h-[1.2rem] w-[1.2rem]" />
                    <span className="sr-only">{t.language.switch}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setLocale('en')} className={locale === 'en' ? "bg-accent" : ""}>
                    🇺🇸 {t.language.english}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocale('es')} className={locale === 'es' ? "bg-accent" : ""}>
                    🇪🇸 {t.language.spanish}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
