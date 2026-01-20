import { fetch } from '@tauri-apps/plugin-http';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://testing.sentrait.com.uy/api/v1';

class ApiClient {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    private getHeaders(): HeadersInit {
        const token = localStorage.getItem('token');
        return {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
        };
    }

    async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;

        // Use Tauri fetch plugin (bypasses CORS)
        const response = await fetch(url, {
            ...options,
            headers: {
                ...this.getHeaders(),
                ...options.headers,
            },
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(error || `HTTP ${response.status}`);
        }

        return response.json();
    }

    // GET
    get<T>(endpoint: string): Promise<T> {
        return this.request<T>(endpoint, { method: 'GET' });
    }

    // POST
    post<T>(endpoint: string, data?: unknown): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'POST',
            body: data ? JSON.stringify(data) : undefined,
        });
    }

    // PUT
    put<T>(endpoint: string, data?: unknown): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'PUT',
            body: data ? JSON.stringify(data) : undefined,
        });
    }

    // DELETE
    delete<T>(endpoint: string): Promise<T> {
        return this.request<T>(endpoint, { method: 'DELETE' });
    }
}

export const api = new ApiClient(API_BASE_URL);

// Auth helpers
export const setAuthToken = (token: string) => {
    localStorage.setItem('token', token);
};

export const getAuthToken = () => {
    return localStorage.getItem('token');
};

export const removeAuthToken = () => {
    localStorage.removeItem('token');
};

export const isAuthenticated = () => {
    return !!getAuthToken();
};

export interface Server {
    id: number;
    hostname: string;
    ip_address: string;
    description: string;
    os_info: string;
    group_id?: number;
    ssh_username?: string;
    ssh_password?: string;
    ssh_key_path?: string;
}

export const fetchServers = () => api.get<Server[]>('/servers/');

export const fetchServer = (id: string) => api.get<Server>(`/servers/${id}`);

export interface ServerCredentials {
    ip_address: string;
    ssh_username: string;
    ssh_password?: string;
    ssh_key_path?: string;
    ssh_port: number;
}

export const fetchServerCredentials = (id: number) =>
    api.get<ServerCredentials>(`/servers/${id}/credentials`);




export const createServer = (data: Partial<Server>) => api.post<Server>('/servers/', data);

export const updateServer = (id: number, data: Partial<Server>) => api.put<Server>(`/servers/${id}`, data);

export const deleteServer = (id: number) => api.delete(`/servers/${id}`);

// ... imports

// Diagnosis Response Type
export interface DiagnosisResponse {
    analysis: string | {
        analysis: string;
        proposed_command?: string;
    };
}

export const diagnoseProblem = (serverId: number | string, problem: string, language: string = "es") => {
    return api.post<DiagnosisResponse>('/agent/diagnose', {
        server_id: Number(serverId),
        problem_description: problem,
        language
    });
};

// Update executeCommand to use correct global endpoint
export const executeCommand = async (serverId: number | string, command: string) => {
    return api.post<{ output: string; exit_code: number; stderr?: string; stdout?: string }>('/execute/', {
        server_id: Number(serverId),
        command
    });
};

export const fetchGroups = () => api.get<any[]>('/groups/');
export const createGroup = (data: { name: string; description?: string; color?: string; organization_id?: number }) => api.post<any>('/groups/', data);
export const updateGroup = (id: number, data: { name: string; description?: string; color?: string }) => api.put<any>(`/groups/${id}`, data);
export const deleteGroup = (id: number) => api.delete(`/groups/${id}`);

export const fetchCurrentUser = () => api.get<any>('/auth/me');
export const register = (data: any) => api.post<{ access_token: string }>('/auth/register', data);

// Organization Endpoints
export interface Organization {
    id: number;
    name: string;
    slug: string;
    subscription_tier: string;
    max_users: number;
    created_at: string;
}

export const fetchOrganizations = () => api.get<Organization[]>('/organizations/');
export const fetchOrganization = (id: number) => api.get<Organization>(`/organizations/${id}`);
export const createOrganization = (data: Partial<Organization>) => api.post<Organization>('/organizations/', data);
export const updateOrganization = (id: number, data: Partial<Organization>) => api.put<Organization>(`/organizations/${id}`, data);
export const deleteOrganization = (id: number) => api.delete(`/organizations/${id}`);
