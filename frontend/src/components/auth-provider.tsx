"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { removeAuthToken, getAuthToken } from "@/utils/auth";

interface AuthContextType {
    isAuthenticated: boolean;
    checkSession: () => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Decode JWT to check expiration
function isTokenExpired(token: string): boolean {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const exp = payload.exp * 1000; // Convert to milliseconds
        return Date.now() >= exp;
    } catch {
        return true; // If we can't decode, assume expired
    }
}

// Get time until token expires in ms
function getTimeUntilExpiry(token: string): number {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const exp = payload.exp * 1000;
        return Math.max(0, exp - Date.now());
    } catch {
        return 0;
    }
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    const publicPaths = ["/login", "/register", "/forgot-password"];

    const logout = useCallback(() => {
        removeAuthToken();
        setIsAuthenticated(false);
        // Only redirect if not already on a public path
        if (!publicPaths.some(p => pathname?.startsWith(p))) {
            router.push("/login");
        }
    }, [router, pathname]);

    const checkSession = useCallback(() => {
        const token = getAuthToken();
        
        if (!token) {
            if (!publicPaths.some(p => pathname?.startsWith(p))) {
                logout();
            }
            return;
        }

        if (isTokenExpired(token)) {
            console.log("[Auth] Token expired, redirecting to login");
            logout();
            return;
        }

        setIsAuthenticated(true);
    }, [logout, pathname]);

    // Check session on mount and pathname change
    useEffect(() => {
        checkSession();
    }, [checkSession]);

    // Set up periodic session check (every 30 seconds)
    useEffect(() => {
        const token = getAuthToken();
        if (!token) return;

        const interval = setInterval(() => {
            checkSession();
        }, 30000); // Check every 30 seconds

        // Also set up a timer to logout exactly when token expires
        const timeUntilExpiry = getTimeUntilExpiry(token);
        let expiryTimeout: NodeJS.Timeout | undefined;
        
        if (timeUntilExpiry > 0 && timeUntilExpiry < 24 * 60 * 60 * 1000) { // Only if less than 24h
            expiryTimeout = setTimeout(() => {
                console.log("[Auth] Token expired by timer");
                logout();
            }, timeUntilExpiry);
        }

        return () => {
            clearInterval(interval);
            if (expiryTimeout) clearTimeout(expiryTimeout);
        };
    }, [checkSession, logout]);

    // Listen for 401 events from API calls
    useEffect(() => {
        const handleUnauthorized = () => {
            console.log("[Auth] Received 401 event, logging out");
            logout();
        };

        window.addEventListener("auth:unauthorized", handleUnauthorized);
        return () => window.removeEventListener("auth:unauthorized", handleUnauthorized);
    }, [logout]);

    return (
        <AuthContext.Provider value={{ isAuthenticated, checkSession, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
