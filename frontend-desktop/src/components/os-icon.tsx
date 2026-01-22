import { Terminal, Monitor, Server, HelpCircle } from "lucide-react";

interface OSIconProps {
    os?: string;
    className?: string;
}

export function OSIcon({ os, className = "h-5 w-5" }: OSIconProps) {
    const lowerOS = (os || "").toLowerCase();

    // Ubuntu
    if (lowerOS.includes("ubuntu")) {
        return (
            <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" title="Ubuntu">
                <circle cx="16" cy="16" r="16" fill="#E95420" />
                <path d="M16 4C9.37 4 4 9.37 4 16C4 22.63 9.37 28 16 28C22.63 28 28 22.63 28 16" stroke="white" strokeWidth="2" strokeLinecap="round" />
                <circle cx="16" cy="16" r="3" fill="white" />
                <circle cx="23" cy="10" r="2" fill="white" />
                <circle cx="23" cy="22" r="2" fill="white" />
                <circle cx="7" cy="16" r="2" fill="white" />
            </svg>
        );
    }

    // Windows
    if (lowerOS.includes("windows")) {
        return (
            <svg viewBox="0 0 88 88" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" title="Windows">
                <path fill="#00ADEF" d="M0,12.402,35.656,7.523v36.067H0V12.402z M35.656,47.783L0,43.202v32.396l35.656,4.883V47.783z M40.117,6.938 L88,0v43.594H40.117V6.938z M40.117,47.783H88v40.217l-47.883-6.572V47.783z" />
            </svg>
        );
    }

    // Debian
    if (lowerOS.includes("debian")) {
        return (
            <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" title="Debian">
                <path d="M50 5C25.2 5 5 25.2 5 50s20.2 45 45 45 45-20.2 45-45S74.8 5 50 5zm0 9c19.9 0 36 16.1 36 36S69.9 86 50 86 14 69.9 14 50 30.1 14 50 14zm-4.5 13.5c-2.4.1-4.7 1.1-6.4 2.9-3.4 3.7-3.1 9.5.7 12.9 3.7 3.4 9.5 3.1 12.9-.7 1.8-2 2.6-4.7 2.3-7.3-.4-3.5-3-6.4-6.5-7-1-.2-2-.3-3-.2z" fill="#D70A53" />
            </svg>
        );
    }

    // CentOS / RedHat / Fedora (Hat generic)
    if (lowerOS.includes("centos") || lowerOS.includes("red hat") || lowerOS.includes("rhel") || lowerOS.includes("fedora")) {
        return (
            <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" title="Red Hat / CentOS">
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2z" stroke="red" />
                <path d="M12 8v8" stroke="red" />
                <path d="M8 12h8" stroke="red" />
            </svg>
        );
    }

    // Apple / MacOS
    if (lowerOS.includes("macos") || lowerOS.includes("darwin") || lowerOS.includes("apple")) {
        return (
            <svg viewBox="0 0 24 24" className={className} fill="currentColor" title="Apple">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.24-1.99 1.11-3.2-.26 0-3.32-.23-4.54 3.19.86.99 2.57 2.1 3.43.01z" />
            </svg>
        )
    }

    // Generic Linux
    if (lowerOS.includes("linux")) {
        return <Terminal className={className} />;
    }

    // Fallback
    return <Server className={className} />;
}
