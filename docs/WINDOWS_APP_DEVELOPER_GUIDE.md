# Guía de Desarrollo: Aplicación Nativa Windows (.NET 8)

Este documento está dirigido al equipo de desarrollo encargado del **Shell Nativo de Windows**. Su responsabilidad es crear el contenedor que aloja la interfaz de usuario (React) y gestiona las funcionalidades profundas del sistema operativo (RDP ActiveX, SSH Tunnels, File System).

## 🏗️ Arquitectura Técnica

La aplicación sigue el patrón **Hybrid Desktop Application**:

* **Contendor:** WPF (.NET 8).
* **UI Principal:** React (cargado vía Microsoft Edge WebView2).
* **Componentes Nativos:** Windows Forms Host (para ActiveX RDP) y Librerías de Red (.NET).

### Stack Tecnológico

* **Lenguaje:** C# 12 / .NET 8.0 (LTS).
* **Framework UI:** WPF (Windows Presentation Foundation).
* **Navegador Embebido:** Microsoft.Web.WebView2.
* **RDP Client:** `MSTSCLib` (Microsoft Terminal Services Client ActiveX - `mstscax.dll`).

---

## 🛠️ Configuración del Entorno de Desarrollo

### Requisitos Previos

1. **Visual Studio 2022** (Community, Pro, o Enterprise).
2. **Workload:** ".NET Desktop Development".
3. **Componentes Individuales:** Asegurarse de tener ".NET 8.0 Runtime" y "SDK".

### Configuración Inicial del Proyecto

El proyecto se encuentra en `/apps/windows/`.
Al abrir `AiSysadmin.csproj`, Visual Studio restaurará los paquetes NuGet automáticamente.

**Dependencias Clave (NuGet):**

* `Microsoft.Web.WebView2` (Gestión del navegador).
* `Newtonsoft.Json` (o `System.Text.Json` para parseo de mensajes).

---

## 🔌 El Puente UI <-> Nativo (The Bridge)

La aplicación no tiene botones nativos (excepto emergencias). Toda la interacción nace en React. React envía mensajes JSON y C# reacciona.

### Protocolo de Comunicación

**1. Recepción (C# escucha a React):**
El evento `CoreWebView2.WebMessageReceived` es el punto de entrada.

```csharp
// Estructura del Mensaje JSON esperado
{
    "type": "START_RDP",
    "payload": {
        "host": "192.168.1.10",
        "username": "admin",
        "password": "...", 
        "width": 1920,
        "height": 1080
    }
}
```

**2. Envío (C# habla a React):**
Usar `PostWebMessageAsJson` para notificar cambios de estado.

```csharp
// Notificar error de conexión
await webView.CoreWebView2.PostWebMessageAsJson("{\"type\": \"RDP_ERROR\", \"message\": \"Timeout\"}");
```

---

## 🖥️ Implementación del RDP Nativo (ActiveX)

Esta es la parte crítica. **No usar librerías de terceros (FreeRDP)** si no es estrictamente necesario. Usamos el componente oficial de Microsoft (`mstscax.dll`) para garantizar rendimiento nativo.

### Pasos para Integración

1. **WindowsFormsHost:** WPF no soporta ActiveX directamente. Se debe usar un `WindowsFormsHost` dentro del XAML para alojar el control de Windows Forms.
2. **Referencia COM:** Agregar referencia a `Microsoft Terminal Services Control Type Library` en el proyecto. Esto generará `AxMSTSCLib` y `MSTSCLib`.

### Configuración Óptima del Control

Para evitar bordes, barras de desplazamiento o escalado incorrecto, aplicar las siguientes propiedades al instanciar `AxMsRdpClient9NotSafeForScripting`:

```csharp
var rdp = new AxMsRdpClient9NotSafeForScripting();

// 1. Configuración de Red
rdp.AdvancedSettings9.EnableCredSspSupport = true;
rdp.AdvancedSettings9.NegotiateSecurityLayer = true;

// 2. Configuración Visual (CRÍTICO)
rdp.AdvancedSettings9.SmartSizing = true; // Permite redimensionar sin scrollbars
rdp.AdvancedSettings9.DisplayConnectionBar = false; // Oculta la barra azul superior nativa

// 3. Conexión
rdp.Server = host;
rdp.UserName = user;
rdp.AdvancedSettings9.ClearTextPassword = password;
rdp.Connect();
```

---

## 🔄 Flujo de Desarrollo (Dev Loop)

Para trabajar rápidamente sin recompilar el frontend a cada cambio:

1. El equipo de **Frontend** ejecuta `npm run dev` en `/frontend-desktop-ui`. Esto sirve la UI en `http://localhost:5173`.
2. En el código C# (`MainWindow.xaml.cs`), configurar la fuente del WebView:

```csharp
#if DEBUG
    // Desarrollo: Carga desde Vite Server (Hot Reload activo)
    MainWebView.Source = new Uri("http://localhost:5173");
#else
    // Producción: Carga desde archivos locales compilados
    // Asegurarse de copiar /frontend-desktop-ui/dist a la carpeta de salida
    MainWebView.Source = new Uri(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "wwwroot/index.html"));
#endif
```

---

## 📦 Compilación y Distribución (Roadmap)

1. **Build Frontend:** `cd frontend-desktop-ui && npm run build`.
2. **Copy Assets:** Copiar el contenido de `dist/` a `apps/windows/bin/Release/net8.0-windows/wwwroot/`.
3. **Publish .NET:** `dotnet publish -c Release -r win-x64 --self-contained`.

Esto generará un ejecutable único (o carpeta con dependencias) que no requiere que el cliente tenga Node.js ni Python instalados (si el backend se empaqueta o se accede remoto).
