# 📡 Referencia de la API

Base URL: `http://localhost:8000/api/v1`

## 🤖 Endpoints del Agente

### Diagnosticar Problema
Analiza un problema en un servidor específico utilizando IA y RAG.

-   **URL**: `/agent/diagnose`
-   **Método**: `POST`
-   **Cuerpo**:
    ```json
    {
      "server_id": 1,
      "problem_description": "Alto uso de CPU detectado",
      "language": "es" // Opcional: "en" o "es"
    }
    ```
-   **Respuesta**:
    ```json
    {
      "analysis": {
        "analysis": "Cadena Markdown con el análisis...",
        "proposed_command": "top -bn1"
      },
      "diagnostics": { ... } // Datos de diagnóstico en bruto utilizados
    }
    ```

### Ejecutar Solución
Ejecuta un comando en un servidor.

-   **URL**: `/agent/execute`
-   **Método**: `POST`
-   **Cuerpo**:
    ```json
    {
      "server_id": 1,
      "command": "top -bn1"
    }
    ```
-   **Respuesta**:
    ```json
    {
      "stdout": "...",
      "stderr": "",
      "exit_code": 0
    }
    ```

## 🖥️ Endpoints de Gestión de Servidores

### Listar Servidores
Obtiene todos los servidores gestionados.

-   **URL**: `/servers/`
-   **Método**: `GET`
-   **Respuesta**: Array de objetos Server.

### Crear Servidor
Agrega un nuevo servidor a la gestión.

-   **URL**: `/servers/`
-   **Método**: `POST`
-   **Cuerpo**:
    ```json
    {
      "hostname": "web-01",
      "ip_address": "192.168.1.10",
      "ssh_username": "ubuntu",
      "ssh_password": "password_opcional",
      "ssh_key_path": "/ruta/a/la/llave",
      "client_id": 1
    }
    ```

### Eliminar Servidor
Elimina un servidor.

-   **URL**: `/servers/{server_id}`
-   **Método**: `DELETE`

## 👥 Endpoints de Gestión de Clientes

### Listar Clientes
-   **URL**: `/clients/`
-   **Método**: `GET`

### Crear Cliente
-   **URL**: `/clients/`
-   **Método**: `POST`
-   **Cuerpo**:
    ```json
    {
      "name": "Acme Corp",
      "description": "Cliente principal"
    }
    ```

## 🏥 Comprobación de Salud (Health Check)

-   **URL**: `/health` (Nivel raíz, no bajo `/api/v1`)
-   **Método**: `GET`
-   **Respuesta**: `{"status": "ok"}`
