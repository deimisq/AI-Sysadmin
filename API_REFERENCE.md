# 📡 API Reference

Base URL: `http://localhost:8000/api/v1`

## 🤖 Agent Endpoints

### Diagnose Problem
Analyzes a problem on a specific server using AI and RAG.

-   **URL**: `/agent/diagnose`
-   **Method**: `POST`
-   **Body**:
    ```json
    {
      "server_id": 1,
      "problem_description": "High CPU usage detected",
      "language": "en" // Optional: "en" or "es"
    }
    ```
-   **Response**:
    ```json
    {
      "analysis": {
        "analysis": "Markdown string with analysis...",
        "proposed_command": "top -bn1"
      },
      "diagnostics": { ... } // Raw diagnostic data used
    }
    ```

### Execute Solution
Executes a command on a server.

-   **URL**: `/agent/execute`
-   **Method**: `POST`
-   **Body**:
    ```json
    {
      "server_id": 1,
      "command": "top -bn1"
    }
    ```
-   **Response**:
    ```json
    {
      "stdout": "...",
      "stderr": "",
      "exit_code": 0
    }
    ```

## 🖥️ Server Management Endpoints

### List Servers
Get all managed servers.

-   **URL**: `/servers/`
-   **Method**: `GET`
-   **Response**: Array of Server objects.

### Create Server
Add a new server to management.

-   **URL**: `/servers/`
-   **Method**: `POST`
-   **Body**:
    ```json
    {
      "hostname": "web-01",
      "ip_address": "192.168.1.10",
      "ssh_username": "ubuntu",
      "ssh_password": "optional_password",
      "ssh_key_path": "/path/to/key",
      "client_id": 1
    }
    ```

### Delete Server
Remove a server.

-   **URL**: `/servers/{server_id}`
-   **Method**: `DELETE`

## 👥 Client Management Endpoints

### List Clients
-   **URL**: `/clients/`
-   **Method**: `GET`

### Create Client
-   **URL**: `/clients/`
-   **Method**: `POST`
-   **Body**:
    ```json
    {
      "name": "Acme Corp",
      "description": "Main client"
    }
    ```

## 🏥 Health Check

-   **URL**: `/health` (Root level, not under `/api/v1`)
-   **Method**: `GET`
-   **Response**: `{"status": "ok"}`
