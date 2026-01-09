/**
 * Desktop Detection and Configuration
 * 
 * This module detects if the app is running in Tauri (desktop mode)
 * and provides the appropriate API URL.
 */

/**
 * Check if the app is running in Tauri desktop mode
 */
export function isDesktopMode(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }

    // Check if __TAURI__ global exists
    return '__TAURI__' in window;
}

/**
 * Get the API base URL based on the environment
 */
export function getApiBaseUrl(): string {
    if (isDesktopMode()) {
        // Desktop mode: backend runs locally
        return 'http://127.0.0.1:8000';
    }

    // SaaS mode: use environment variable or default
    return process.env.NEXT_PUBLIC_API_URL || '/api/v1';
}

/**
 * Get the full API endpoint URL
 */
export function getApiEndpoint(path: string): string {
    const baseUrl = getApiBaseUrl();

    // Remove leading slash from path if present
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;

    if (isDesktopMode()) {
        // Desktop: full URL with /api/v1 prefix
        return `${baseUrl}/api/v1/${cleanPath}`;
    }

    // SaaS: relative or full URL
    if (baseUrl.startsWith('http')) {
        return `${baseUrl}/${cleanPath}`;
    }

    return `${baseUrl}/${cleanPath}`;
}

/**
 * Desktop app configuration
 */
export const desktopConfig = {
    isDesktop: isDesktopMode(),
    apiBaseUrl: getApiBaseUrl(),

    // Desktop-specific features
    features: {
        offlineMode: isDesktopMode(),
        localDatabase: isDesktopMode(),
        autoBackup: isDesktopMode(),
    },

    // Backend connection settings
    backend: {
        host: '127.0.0.1',
        port: 8000,
        healthCheckInterval: 30000, // 30 seconds
    },
};

/**
 * Log environment info (for debugging)
 */
export function logEnvironmentInfo() {
    if (typeof window === 'undefined') return;

    console.log('🖥️  Environment Info:');
    console.log('   Desktop Mode:', isDesktopMode());
    console.log('   API Base URL:', getApiBaseUrl());
    console.log('   Platform:', navigator.platform);
    console.log('   User Agent:', navigator.userAgent);
}

// Auto-log in development
if (process.env.NODE_ENV === 'development') {
    if (typeof window !== 'undefined') {
        setTimeout(logEnvironmentInfo, 1000);
    }
}
