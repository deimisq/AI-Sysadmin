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

        // Check if running in Tauri to decide fetch implementation
        // Ideally use plugin-http always for desktop build
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
}

export const fetchServers = () => api.get<Server[]>('/servers/');

export const fetchServer = (id: string) => api.get<Server>(`/servers/${id}`);

export const createServer = (data: Partial<Server>) => api.post<Server>('/servers/', data);

export const updateServer = (id: number, data: Partial<Server>) => api.put<Server>(`/servers/${id}`, data);

export const deleteServer = (id: number) => api.delete(`/servers/${id}`);

export const executeCommand = async (serverId: string, command: string) => {
    const response = await api.post<{ output: string; exit_code: number }>(`/servers/${serverId}/execute`, { command });
    return response.output;
};

export const fetchGroups = () => api.get<any[]>('/groups/');
export const createGroup = (data: { name: string; description?: string }) => api.post<any>('/groups/', data);
export const updateGroup = (id: number, data: { name: string; description?: string }) => api.put<any>(`/groups/${id}`, data);
export const deleteGroup = (id: number) => api.delete(`/groups/${id}`);

export const fetchCurrentUser = () => api.get<any>('/auth/me');
export const register = (data: any) => api.post<{ access_token: string }>('/auth/register', data);
