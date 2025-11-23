import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n-context";

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
        <html lang="en">
            <body className={inter.className}>
                <I18nProvider>{children}</I18nProvider>
            </body>
        </html>
    );
}
