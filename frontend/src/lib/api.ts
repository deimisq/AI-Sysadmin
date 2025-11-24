// Dynamically determine API URL based on environment
const getApiBaseUrl = () => {
    // Client-side: use the current hostname with port 8000
    if (typeof window !== 'undefined') {
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        console.log(`[API] Using backend at: ${protocol}//${hostname}:8000/api/v1`);
        return `${protocol}//${hostname}:8000/api/v1`;
    }

    // Server-side: use environment variable or fallback to localhost
    if (process.env.NEXT_PUBLIC_API_URL) {
        return process.env.NEXT_PUBLIC_API_URL;
    }

    // Fallback for SSR
    return "http://localhost:8000/api/v1";
};

const API_BASE_URL = getApiBaseUrl();

// Get authentication headers
const getAuthHeaders = () => {
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
