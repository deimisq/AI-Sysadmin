// Dynamically determine API URL based on environment
const getApiBaseUrl = () => {
    // Prioritize environment variable
    if (process.env.NEXT_PUBLIC_API_URL) {
        return process.env.NEXT_PUBLIC_API_URL;
    }

    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;

        // If we are NOT on localhost, ALWAYS use relative path
        // This assumes we are behind Nginx/Cloudflare
        if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
            return '/api/v1';
        }

        // Only for localhost development
        return `${window.location.protocol}//${hostname}:8000/api/v1`;
    }

    return "http://backend:8000/api/v1";
};

export const API_BASE_URL = getApiBaseUrl();

// Debug: log the API URL being used
if (typeof window !== 'undefined') {
    console.log('[API Client] Using API_BASE_URL:', API_BASE_URL);
    console.log('[API Client] NEXT_PUBLIC_API_URL env var:', process.env.NEXT_PUBLIC_API_URL);
}

// Get authentication headers
export const getAuthHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;
    return {
        "Content-Type": "application/json",
        ...(token && { "Authorization": `Bearer ${token}` }),
    };
};

export async function fetchServers() {
    const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;
    const res = await fetch(`${API_BASE_URL}/servers/`, {
        headers: {
            ...(token && { "Authorization": `Bearer ${token}` }),
        },
    });
    if (!res.ok) throw new Error("Failed to fetch servers");
    return res.json();
}

export async function fetchAllServers() {
    const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;
    const res = await fetch(`${API_BASE_URL}/admin/servers`, {
        headers: {
            ...(token && { "Authorization": `Bearer ${token}` }),
        },
    });
    if (!res.ok) throw new Error("Failed to fetch all servers");
    return res.json();
}

export async function createClient(data: any) {
    const res = await fetch(`${API_BASE_URL}/clients/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create client");
    return res.json();
}

// Server Groups
export async function fetchGroups() {
    const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;
    const res = await fetch(`${API_BASE_URL}/groups/`, {
        headers: {
            ...(token && { "Authorization": `Bearer ${token}` }),
        },
    });
    if (!res.ok) throw new Error("Failed to fetch groups");
    return res.json();
}

export async function createGroup(data: any) {
    const res = await fetch(`${API_BASE_URL}/groups/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create group");
    return res.json();
}

export async function updateGroup(groupId: number, data: any) {
    const res = await fetch(`${API_BASE_URL}/groups/${groupId}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update group");
    return res.json();
}

export async function deleteGroup(groupId: number) {
    const res = await fetch(`${API_BASE_URL}/groups/${groupId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Failed to delete group");
    return res.json();
}


export async function createServer(data: any) {
    const res = await fetch(`${API_BASE_URL}/servers/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create server");
    return res.json();
}

export async function updateServer(serverId: number, data: any) {
    const res = await fetch(`${API_BASE_URL}/servers/${serverId}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update server");
    return res.json();
}

export async function deleteServer(serverId: number) {
    const res = await fetch(`${API_BASE_URL}/servers/${serverId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Failed to delete server");
    return res.json();
}


export async function diagnoseProblem(serverId: number, problem: string, language: string = "en") {
    const res = await fetch(`${API_BASE_URL}/agent/diagnose`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ server_id: serverId, problem_description: problem, language }),
    });
    if (!res.ok) throw new Error("Failed to diagnose problem");
    return res.json();
}

export async function executeCommand(serverId: number, command: string) {
    const res = await fetch(`${API_BASE_URL}/execute/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ server_id: serverId, command: command }),
    });
    if (!res.ok) throw new Error("Failed to execute command");
    return res.json();
}

// ==================== ADMIN API ====================

// User Management
export async function fetchAllUsers() {
    const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;
    const res = await fetch(`${API_BASE_URL}/admin/users`, {
        headers: {
            ...(token && { "Authorization": `Bearer ${token}` }),
        },
    });
    if (!res.ok) throw new Error("Failed to fetch users");
    return res.json();
}

export async function fetchUser(userId: number) {
    const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;
    const res = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
        headers: {
            ...(token && { "Authorization": `Bearer ${token}` }),
        },
    });
    if (!res.ok) throw new Error("Failed to fetch user");
    return res.json();
}

export async function updateUserAdmin(userId: number, data: any) {
    const res = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update user");
    return res.json();
}

export async function createUser(data: any) {
    const res = await fetch(`${API_BASE_URL}/admin/users`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.detail || "Failed to create user");
    }
    return res.json();
}

export async function deleteUser(userId: number) {
    const res = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Failed to delete user");
    return res.json();
}

// Group Permissions
export async function grantGroupAccess(userId: number, groupId: number, role: string = "user") {
    const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/groups/${groupId}/grant?role=${role}`, {
        method: "POST",
        headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Failed to grant access");
    return res.json();
}

export async function revokeGroupAccess(userId: number, groupId: number) {
    const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/groups/${groupId}/revoke`, {
        method: "DELETE",
        headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Failed to revoke access");
    return res.json();
}

export async function fetchUserGroups(userId: number) {
    const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;
    const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/groups`, {
        headers: {
            ...(token && { "Authorization": `Bearer ${token}` }),
        },
    });
    if (!res.ok) throw new Error("Failed to fetch user groups");
    return res.json();
}

// Audit & Stats
export async function fetchAuditLogs(skip: number = 0, limit: number = 100) {
    const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;
    const res = await fetch(`${API_BASE_URL}/admin/audit-logs?skip=${skip}&limit=${limit}`, {
        headers: {
            ...(token && { "Authorization": `Bearer ${token}` }),
        },
    });
    if (!res.ok) throw new Error("Failed to fetch audit logs");
    return res.json();
}

export async function fetchSystemStats() {
    const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;
    const res = await fetch(`${API_BASE_URL}/admin/stats`, {
        headers: {
            ...(token && { "Authorization": `Bearer ${token}` }),
        },
    });
    if (!res.ok) throw new Error("Failed to fetch stats");
    return res.json();
}

// Current User
export async function fetchCurrentUser() {
    const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
            ...(token && { "Authorization": `Bearer ${token}` }),
        },
    });
    if (!res.ok) {
        if (res.status === 401) throw new Error("Unauthorized");
        const error = await res.json().catch(() => ({}));
        throw new Error(error.detail || "Failed to fetch current user");
    }
    return res.json();
}

// Configuration Management
export async function getConfigByCategory(category: string) {
    const res = await fetch(`${API_BASE_URL}/config/${category}`, {
        headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(`Failed to fetch ${category} configuration`);
    return res.json();
}

export async function getAllConfig() {
    const res = await fetch(`${API_BASE_URL}/config/`, {
        headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch configuration");
    return res.json();
}

export async function updateConfigCategory(category: string, configData: Record<string, any>) {
    const res = await fetch(`${API_BASE_URL}/config/${category}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(configData),
    });
    if (!res.ok) throw new Error(`Failed to update ${category} configuration`);
    return res.json();
}

export async function deleteConfig(category: string, key: string) {
    const res = await fetch(`${API_BASE_URL}/config/${category}/${key}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Failed to delete configuration");
    return res.json();
}

// ==================== VERSION ====================

export async function fetchVersion() {
    const res = await fetch(`${API_BASE_URL}/version`);
    if (!res.ok) {
        return {
            version: "1.0.0",
            name: "AI Sysadmin Agent",
            currentYear: new Date().getFullYear()
        };
    }
    return res.json();
}

// ==================== LICENSE ====================

export async function fetchLicenseStatus() {
    const res = await fetch(`${API_BASE_URL}/config/license`, {
        headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch license status");
    return res.json();
}
