const API_BASE_URL = "http://localhost:8000/api/v1";

export async function fetchServers() {
    const res = await fetch(`${API_BASE_URL}/servers/`);
    if (!res.ok) throw new Error("Failed to fetch servers");
    return res.json();
}

export async function createServer(data: any) {
    const res = await fetch(`${API_BASE_URL}/servers/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create server");
    return res.json();
}

export async function diagnoseProblem(serverId: number, problem: string) {
    const res = await fetch(`${API_BASE_URL}/agent/diagnose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ server_id: serverId, problem_description: problem }),
    });
    if (!res.ok) throw new Error("Failed to diagnose problem");
    return res.json();
}

export async function executeCommand(serverId: number, command: string) {
    const res = await fetch(`${API_BASE_URL}/execute/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ server_id: serverId, command: command }),
    });
    if (!res.ok) throw new Error("Failed to execute command");
    return res.json();
}
