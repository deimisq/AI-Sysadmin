"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import en from "../../messages/en.json";
import es from "../../messages/es.json";

type Messages = typeof en;
type Locale = "en" | "es";

interface I18nContextType {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    t: Messages;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const messages = { en, es };

export function I18nProvider({ children }: { children: ReactNode }) {
    const [locale, setLocaleState] = useState<Locale>("es");

    useEffect(() => {
        // Load locale from cookie
        const savedLocale = document.cookie
            .split("; ")
            .find((row) => row.startsWith("NEXT_LOCALE="))
            ?.split("=")[1] as Locale | undefined;

        if (savedLocale && (savedLocale === "en" || savedLocale === "es")) {
            setLocaleState(savedLocale);
        } else {
            // Check browser language
            const browserLang = navigator.language.split("-")[0];
            if (browserLang === "es") {
                setLocaleState("es");
            }
        }
    }, []);

    const setLocale = (newLocale: Locale) => {
        setLocaleState(newLocale);
        document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000`;
    };

    return (
        <I18nContext.Provider value={{ locale, setLocale, t: messages[locale] }}>
            {children}
        </I18nContext.Provider>
    );
}

export function useI18n() {
    const context = useContext(I18nContext);
    if (!context) {
        throw new Error("useI18n must be used within I18nProvider");
    }
    return context;
}
