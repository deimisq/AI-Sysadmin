import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n-context";
import { ThemeProvider } from "@/lib/theme-context";
import { VersionNotification } from "@/components/version-notification";
import { AuthProvider } from "@/components/auth-provider";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Sysadmin AI Agent",
    description: "AI-powered sysadmin assistant",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={`${inter.className} min-h-screen flex flex-col`}>
                <ThemeProvider>
                    <I18nProvider>
                        <AuthProvider>
                            <div className="flex-1 flex flex-col">
                                {children}
                            </div>
                            <VersionNotification />
                        </AuthProvider>
                        <Toaster
                            position="top-right"
                            expand={true}
                            richColors
                            closeButton
                        />
                    </I18nProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
