// Dynamically determine API URL based on environment
const getApiBaseUrl = () => {
    // Prioritize environment variable
    if (process.env.NEXT_PUBLIC_API_URL) {
        return process.env.NEXT_PUBLIC_API_URL;
    }

    // Always use relative path through nginx proxy
    // This works both in production and development when using docker-compose
    return '/api/v1';
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

// Handle unauthorized responses (expired/invalid token)
export const handleUnauthorized = () => {
    // Dispatch event for AuthProvider to handle
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
    if (typeof window !== 'undefined') {
        // Clear token and user data
        localStorage.removeItem("token");
        // Redirect to login
        window.location.href = "/login";
    }
};

// Check response for auth errors and handle appropriately
export const checkAuthResponse = async (res: Response) => {
    if (res.status === 401) {
        handleUnauthorized();
        throw new Error("Session expired. Redirecting to login...");
    }
    return res;
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

export async function fetchClients() {
    const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;
    const res = await fetch(`${API_BASE_URL}/clients/`, {
        headers: {
            ...(token && { "Authorization": `Bearer ${token}` }),
        },
    });
    if (!res.ok) throw new Error("Failed to fetch clients");
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

export async function fetchServerStats(serverId: number) {
    const res = await fetch(`${API_BASE_URL}/servers/${serverId}/stats`, {
        headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch stats");
    return res.json();
}

export async function fetchServerFiles(serverId: number, path: string = "/") {
    const res = await fetch(`${API_BASE_URL}/servers/${serverId}/files?path=${encodeURIComponent(path)}`, {
        headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch files");
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
export async function fetchAuditLogs(
    skip: number = 0,
    limit: number = 100,
    filters?: {
        start_date?: string;
        end_date?: string;
        action?: string;
        resource_type?: string;
        user_id?: number;
    }
) {
    const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;

    const params = new URLSearchParams({
        skip: skip.toString(),
        limit: limit.toString(),
    });

    if (filters) {
        if (filters.start_date) params.append('start_date', filters.start_date);
        if (filters.end_date) params.append('end_date', filters.end_date);
        if (filters.action) params.append('action', filters.action);
        if (filters.resource_type) params.append('resource_type', filters.resource_type);
        if (filters.user_id) params.append('user_id', filters.user_id.toString());
    }

    const res = await fetch(`${API_BASE_URL}/admin/audit-logs?${params.toString()}`, {
        headers: {
            ...(token && { "Authorization": `Bearer ${token}` }),
        },
    });
    if (!res.ok) throw new Error("Failed to fetch audit logs");
    return res.json();
}

export async function fetchAuditLogStats() {
    const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;
    const res = await fetch(`${API_BASE_URL}/admin/audit-logs/stats`, {
        headers: {
            ...(token && { "Authorization": `Bearer ${token}` }),
        },
    });
    if (!res.ok) throw new Error("Failed to fetch audit log stats");
    return res.json();
}

export async function exportAuditLogsCSV(filters?: {
    start_date?: string;
    end_date?: string;
    action?: string;
    resource_type?: string;
    user_id?: number;
}) {
    const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;

    const params = new URLSearchParams();
    if (filters) {
        if (filters.start_date) params.append('start_date', filters.start_date);
        if (filters.end_date) params.append('end_date', filters.end_date);
        if (filters.action) params.append('action', filters.action);
        if (filters.resource_type) params.append('resource_type', filters.resource_type);
        if (filters.user_id) params.append('user_id', filters.user_id.toString());
    }

    const res = await fetch(`${API_BASE_URL}/admin/audit-logs/export/csv?${params.toString()}`, {
        headers: {
            ...(token && { "Authorization": `Bearer ${token}` }),
        },
    });
    if (!res.ok) throw new Error("Failed to export audit logs");

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
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
    if (!token) {
        throw new Error("No token");
    }
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
            "Authorization": `Bearer ${token}`,
        },
    });
    if (!res.ok) {
        if (res.status === 401) {
            handleUnauthorized();
            throw new Error("Session expired");
        }
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
            version: "0.9.3-beta3",
            name: "AI Sysadmin Agent",
            currentYear: new Date().getFullYear()
        };
    }
    return res.json();
}

// ==================== LICENSE ====================

export interface LicenseStatus {
    license_type: string;
    days_remaining: number;
    expires_at: string | null;
    is_active: boolean;
    is_expired: boolean;
    max_servers: number;
    max_users: number;
    message: string;
}

export async function fetchLicenseStatus(): Promise<LicenseStatus> {
    try {
        const res = await fetch(`${API_BASE_URL}/license/public-status`);
        if (!res.ok) {
            return {
                license_type: "unknown",
                days_remaining: 0,
                expires_at: null,
                is_active: false,
                is_expired: true,
                max_servers: 0,
                max_users: 0,
                message: "Error al obtener licencia"
            };
        }
        return res.json();
    } catch (error) {
        return {
            license_type: "unknown",
            days_remaining: 0,
            expires_at: null,
            is_active: false,
            is_expired: true,
            max_servers: 0,
            max_users: 0,
            message: "Error de conexión"
        };
    }
}

export async function activateLicenseKey(licenseKey: string) {
    const res = await fetch(`${API_BASE_URL}/license/activate-key?license_key=${encodeURIComponent(licenseKey)}`, {
        method: "POST",
        headers: getAuthHeaders(),
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || "Error al activar licencia");
    }
    return res.json();
}

// ==================== INVITATIONS & ORGANIZATIONS ====================

export interface Organization {
    id: number;
    name: string;
    slug?: string;
    subscription_tier?: string;
}

export async function fetchInvitations() {
    const res = await fetch(`${API_BASE_URL}/invitations/`, {
        headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch invitations");
    return res.json();
}

export async function createInvitation(data: any) {
    const res = await fetch(`${API_BASE_URL}/invitations/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.detail || "Failed to create invitation");
    }
    return res.json();
}

export async function deleteInvitation(invitationId: number) {
    const res = await fetch(`${API_BASE_URL}/invitations/${invitationId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Failed to delete invitation");
    return res.json();
}

export async function fetchOrganizations() {
    const res = await fetch(`${API_BASE_URL}/organizations/`, {
        headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch organizations");
    return res.json();
}

export async function createOrganization(data: any) {
    const res = await fetch(`${API_BASE_URL}/organizations/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create organization");
    return res.json();
}

export async function updateOrganization(orgId: number, data: any) {
    const res = await fetch(`${API_BASE_URL}/organizations/${orgId}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update organization");
    return res.json();
}

export async function deleteOrganization(orgId: number) {
    const res = await fetch(`${API_BASE_URL}/organizations/${orgId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Failed to delete organization");
    return res.json();
}

export async function getInvitationDetails(token: string) {
    const res = await fetch(`${API_BASE_URL}/invitations/details/${token}`);
    if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.detail || "Failed to get invitation details");
    }
    return res.json();
}

export async function acceptInvitation(token: string, data: any) {
    const res = await fetch(`${API_BASE_URL}/invitations/accept/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.detail || "Failed to accept invitation");
    }
    return res.json();
}

export async function fetchServer(serverId: number) {
    const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;
    const res = await fetch(`/api/v1/servers/${serverId}`, {
        headers: {
            "Authorization": `Bearer ${token}`,
        },
    });
    if (!res.ok) throw new Error("Failed to fetch server");
    return res.json();
}
