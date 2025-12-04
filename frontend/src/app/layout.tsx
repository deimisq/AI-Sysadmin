import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n-context";
import { ThemeProvider } from "@/lib/theme-context";
import { FeedbackButton } from "@/components/feedback-button";

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
                        {children}
                        <FeedbackButton />
                    </I18nProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
