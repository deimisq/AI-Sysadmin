import { sendCommand } from './bridge';
import { isLocalWorkspace, selectWorkspaceMode } from './workspace-mode';
export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

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
        if (isLocalWorkspace()) {
            if (endpoint === '/agent/diagnose') return sendCommand<T>('local_ai_diagnose', JSON.parse(String(options.body)));
            return sendCommand<T>('local_request', {
                method: options.method || 'GET', endpoint,
                ...(options.body ? { body: JSON.parse(String(options.body)) } : {}),
            });
        }
        const url = `${this.baseUrl}${endpoint}`;

        // The browser and WebView2 use their platform's TLS validation.
        const response = await fetch(url, {
            ...options,
            headers: {
                ...this.getHeaders(),
                ...options.headers,
            },
        });

        if (!response.ok) {
            if (response.status === 401) {
                removeAuthToken();
                window.location.hash = '#/login';
            }
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
    return isLocalWorkspace() || !!getAuthToken();
};

export interface Server {
    quick_protocol?: 'ssh' | 'rdp' | 'sftp';
    id: number;
    hostname: string;
    ip_address: string;
    description: string;
    os_info: string;
    group_id?: number;
    ssh_username?: string;
    ssh_password?: string;
    ssh_key_path?: string;
    os_type?: string;
    ssh_port?: number;
    created_by?: number;
    organization_id?: number;
    connection_protocol?: 'ssh' | 'rdp';
    rdp_port?: number;
}

export const fetchServers = () => api.get<Server[]>('/servers/');

export const fetchServer = (id: string) => api.get<Server>(`/servers/${id}`);

export interface ServerCredentials {
    ip_address: string;
    ssh_username: string;
    ssh_password?: string;
    ssh_key_path?: string;
    ssh_port: number;
    rdp_port?: number;
}

export const fetchServerCredentials = (id: number) =>
    api.get<ServerCredentials>(`/servers/${id}/credentials`);




export const createServer = (data: Partial<Server>) => api.post<Server>('/servers/', data);

export const updateServer = (id: number, data: Partial<Server>) => api.put<Server>(`/servers/${id}`, data);

export const deleteServer = (id: number) => api.delete(`/servers/${id}`);

// ... imports

// Diagnosis Response Type
export interface DiagnosisResponse {
    context_truncated?: boolean;
    context_characters?: number;
    history_saved?: boolean;
    analysis: string | {
        analysis: string;
        proposed_command?: string;
    };
}

export const diagnoseProblem = (serverId: number | string, problem: string, language: string = "es", contextConsentVersion?: string, selectedEvidence?: import('./ai-evidence').AiEvidence, expectedServer?: Server, terminalSessionId?: string) => {
    const protocol = expectedServer?.connection_protocol || (expectedServer?.os_info.toLowerCase().includes('windows') ? 'rdp' : 'ssh');
    return api.post<DiagnosisResponse>('/agent/diagnose', {
        server_id: Number(serverId),
        problem_description: problem,
        language,
        context_consent_version: contextConsentVersion,
        ...(selectedEvidence ? { evidence: selectedEvidence, evidence_reviewed: true } : {}),
        ...(terminalSessionId ? { terminal_session_id: terminalSessionId } : {}),
        ...(expectedServer ? { expected_target: { address: expectedServer.ip_address, protocol, port: protocol === 'rdp' ? expectedServer.rdp_port || 3389 : expectedServer.ssh_port || 22 } } : {}),
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
export const updateGroup = (id: number, data: { name: string; description?: string; color?: string; organization_id?: number }) => api.put<any>(`/groups/${id}`, data);
export const deleteGroup = (id: number) => api.delete(`/groups/${id}`);

export const fetchCurrentUser = () => api.get<any>('/auth/me');
export const register = (data: any) => api.post('/auth/register', data);

export async function login(username: string, password: string) {
    selectWorkspaceMode('enterprise');
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ username, password }),
    });
    if (!response.ok) throw new Error('No se pudo iniciar sesión. Verifica tus credenciales.');
    const result = await response.json();
    setAuthToken(result.access_token);
    return result;
}

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

// Invitations
export const fetchInvitations = () => api.get<any[]>('/invitations/');
export const createInvitation = (data: { email: string; role: string; organization_id?: number }) => api.post<any>('/invitations/', data);
export const deleteInvitation = (id: number) => api.delete(`/invitations/${id}`);
export const getInvitationDetails = (token: string) => api.get<any>(`/invitations/details/${token}`);
export const acceptInvitation = (token: string, userData: { username: string; password: string; full_name: string }) =>
    api.post<any>(`/invitations/accept/${token}`, userData);
