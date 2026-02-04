# AI Sysadmin Agent - Architecture V2 (2026)

Este documento define la estructura del proyecto para permitir el desarrollo paralelo por equipos especializados: Backend, Frontend y Aplicación Nativa.

## 📂 Estructura de Directorios Propuesta

```text
/
├── backend/                  # [TEAM BACKEND]
│   ├── app/                  # FastAPI Application
│   ├── db/                   # Database Migrations & Models
│   └── Dockerfile            # Server Environment
│
├── frontend-web/             # [TEAM FRONTEND - WEB]
│   ├── src/                  # Next.js Application (Browser Access)
│   └── public/               # Static Assets
│
├── frontend-desktop-ui/      # [TEAM FRONTEND - DESKTOP UI]
│   ├── src/                  # React/Vite App (The UI running inside the App)
│   ├── components/           # UI Components (Menu, Sidebar, Terminal)
│   └── build/                # The produced HTML/JS/CSS bundle
│
└── apps/                     # [TEAM NATIVE APPS]
    ├── windows/              # .NET 8 WPF Application
    │   ├── MainWindow.xaml   # Native Shell Layout
    │   ├── Services/         # Native RDP, SSH integration
    │   └── host/             # WebView2 Configuration
    │
    ├── macos/                # (Future) Swift/Native wrapper
    └── linux/                # (Future) GTK/Native wrapper
```

## 🛠️ Roles y Responsabilidades

### 1. Backend Team (Python)

* **Objetivo:** Proveer datos y gestionar conexiones seguras.
* **Stack:** Python 3.11, FastAPI, PostgreSQL (pgvector).
* **Docker:** El backend corre aislado.
* **Contrato:** Expone una API REST en `http://localhost:8000/api/v1`.

### 2. Frontend Team (React/TS)

* **Objetivo:** Crear la interfaz visual. No se preocupan por "cómo abrir una ventana RDP nativa", solo indican "el usuario quiere abrir RDP".
* **Stack:** React, TailwindCSS, ShadcnUI.
* **Desarrollo:** Usan `npm run dev`. En desarrollo usan mocks o conectan al Docker backend.
* **Comunicación Native:** Usan una capa de abstracción `NativeBridge`.
  * Web: `NativeBridge` hace console.log (o abre nueva pestaña).
  * Desktop: `NativeBridge` envía mensajes al Shell (.NET).

### 3. Native App Team (Windows/.NET)

* **Objetivo:** Crear el contenedor de alto rendimiento.
* **Stack:** .NET 8, WPF, WebView2.
* **Tarea Crítica:** Implementar el **RDP Host Nativo**.
  * La App carga el `index.html` del *Frontend Team*.
  * Intersecta llamadas JS.
  * Renderiza el control ActiveX RDP **encima** o **integrado** en la ventana WPF, gestionando DPI, Focus y Z-Order nativamente.

---

## 🚀 Flujo de Desarrollo (Workflow)

1. **Backend** inicia servidores: `docker-compose up backend db`.
2. **Frontend** inicia UI: `npm run dev` (localhost:5173).
3. **App Team** inicia Visual Studio:
    * Configura el WebView para apuntar a `localhost:5173` (Modo Dev).
    * O carga los archivos compilados de `dist` (Modo Prod).

## 🔌 El Puente (The Bridge)

La comunicación entre React y .NET se hace vía `WebView2.CoreWebView2.PostWebMessageAsJson`.

**React (Frontend):**

```typescript
// Solicitar abrir RDP
window.chrome.webview.postMessage({
    type: 'START_RDP',
    payload: { host: '192.168.1.10', user: 'admin', width: 1200, height: 800 }
});
```

**C# (Backend Nativo):**

```csharp
// Recibir solicitud
private void OnWebMessageReceived(object sender, CoreWebView2WebMessageReceivedEventArgs e) {
    var message = e.TryGetWebMessageAsString();
    // Parsear JSON -> Crear Control ActiveX nativo -> Incrustar en la ventana
}
```
