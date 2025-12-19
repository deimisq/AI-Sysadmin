import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n-context";
import { ThemeProvider } from "@/lib/theme-context";
import { FeedbackButton } from "@/components/feedback-button";
import { VersionNotification } from "@/components/version-notification";
import { AuthProvider } from "@/components/auth-provider";

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
            <body className={inter.className}>
                <ThemeProvider>
                    <I18nProvider>
                        <AuthProvider>
                            {children}
                            <FeedbackButton />
                            <VersionNotification />
                        </AuthProvider>
                    </I18nProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
