# 🎨 Frontend - Desktop Mode Integration

## Uso de la Configuración Desktop

La aplicación detecta automáticamente si está corriendo en Tauri (desktop) o en modo SaaS (web).

### Importar Utilidades

```typescript
import { isDesktopMode, getApiBaseUrl, getApiEndpoint } from '@/utils/desktop-config';
```

### Verificar Modo Desktop

```typescript
if (isDesktopMode()) {
  console.log('Running in desktop mode!');
} else {
  console.log('Running in SaaS mode');
}
```

### Obtener URL de API Correcta

```typescript
// Automáticamente usa la URL correcta
const apiUrl = getApiBaseUrl();
// Desktop: "http://127.0.0.1:8000"
// SaaS: process.env.NEXT_PUBLIC_API_URL o "/api/v1"

// Para endpoints específicos
const endpoint = getApiEndpoint('servers');
// Desktop: "http://127.0.0.1:8000/api/v1/servers"
// SaaS: "/api/v1/servers"
```

### Ejemplo en un Componente

```typescript
'use client';

import { useEffect, useState } from 'react';
import { isDesktopMode, getApiEndpoint } from '@/utils/desktop-config';

export function ServersPage() {
  const [servers, setServers] = useState([]);

  useEffect(() => {
    const fetchServers = async () => {
      // Usa la URL correcta automáticamente
      const endpoint = getApiEndpoint('servers');
      
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      const data = await response.json();
      setServers(data);
    };

    fetchServers();
  }, []);

  return (
    <div>
      {isDesktopMode() && (
        <div className="desktop-badge">
          🖥️ Desktop Mode
        </div>
      )}
      
      {/* Rest of component */}
    </div>
  );
}
```

### Features Condicionales

```typescript
import { desktopConfig } from '@/utils/desktop-config';

// Habilitar features solo en desktop
if (desktopConfig.features.offlineMode) {
  enableOfflineSupport();
}

if (desktopConfig.features.localDatabase) {
  console.log('Using local SQLite database');
}

if (desktopConfig.features.autoBackup) {
  startAutoBackup();
}
```

### Health Check del Backend

```typescript
async function checkBackendHealth() {
  if (!isDesktopMode()) {
    // En SaaS no necesitamos verificar
    return true;
  }

  try {
    const health Url = 'http://127.0.0.1:8000/health';
    const response = await fetch(healthUrl);
    return response.ok;
  } catch (error) {
    console.error('Backend health check failed:', error);
    return false;
  }
}
```

## Actualizaciones Necesarias

### 1. Actualizar API Calls Existentes

Buscar en el proyecto todos los fetch/axios calls y actualizar:

**Antes:**

```typescript
fetch('/api/v1/servers')
```

**Después:**

```typescript
import { getApiEndpoint } from '@/utils/desktop-config';

fetch(getApiEndpoint('servers'))
```

### 2. Archivos a Revisar

Los archivos que típicamente necesitan actualización:

```
frontend/src/
├── app/
│   ├── dashboard/page.tsx      # API calls
│   ├── servers/page.tsx        # API calls
│   └── */page.tsx              # Revisar todos
│
├── components/
│   ├── admin/*.tsx             # Admin API calls
│   └── */                      # Componentes con fetch
│
└── lib/
    └── api-*.ts                # API utilities
```

### 3. Crear API Client Wrapper (Recomendado)

```typescript
// src/lib/api-client.ts
import { getApiEndpoint } from '@/utils/desktop-config';

export class ApiClient {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  async get(path: string) {
    const url = getApiEndpoint(path);
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return response.json();
  }

  async post(path: string, data: any) {
    const url = getApiEndpoint(path);
    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return response.json();
  }

  // ... put, delete, etc.
}

export const apiClient = new ApiClient();
```

**Uso:**

```typescript
import { apiClient } from '@/lib/api-client';

// En lugar de fetch directo
const servers = await apiClient.get('servers');
```

## Testing

### En Desktop Mode

1. Ejecutar backend:

```bash
cd backend/dist
./ai-sysadmin-backend
```

1. Ejecutar Tauri:

```bash
cd frontend
npm run tauri-dev
```

1. Verificar en consola:

```
🖥️  Environment Info:
   Desktop Mode: true
   API Base URL: http://127.0.0.1:8000
```

### En SaaS Mode

1. Ejecutar Next.js normal:

```bash
cd frontend
npm run dev
```

1. Verificar en consola:

```
🖥️  Environment Info:
   Desktop Mode: false
   API Base URL: /api/v1
```

## Notas Importantes

### CORS en Desktop

En desktop mode, las requests van a `127.0.0.1:8000` desde el frontend en Tauri. El backend ya está configurado para permitir esto en `desktop_main.py`.

### Environment Variables

El frontend aún respeta `NEXT_PUBLIC_API_URL` en modo SaaS. Solo en desktop mode usa hardcoded `127.0.0.1:8000`.

### Type Safety

Puedes crear tipos TypeScript para los endpoints:

```typescript
type ApiEndpoint = 
  | 'servers'
  | 'servers/:id'
  | 'auth/login'
  | 'auth/logout'
  | 'admin/users'
  // ... etc

export function getApiEndpoint(path: ApiEndpoint): string {
  // ...
}
```

## Migración Gradual

No necesitas cambiar todo de una vez. La app funcionará en SaaS mode mientras actualizas. Prioriza:

1. **Auth** - Login/logout
2. **Dashboard** - Pantalla principal
3. **Crítico** - Funcionalidades core
4. **Secundario** - Features menos usadas

## Debugging

### Ver Requests en Consola

```typescript
// En desktop-config.ts, agregar al final:
if (isDesktopMode() && process.env.NODE_ENV === 'development') {
  // Interceptar fetch
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    console.log('🌐 API Call:', args[0]);
    return originalFetch.apply(this, args);
  };
}
```

### DevTools

Tauri tiene DevTools integradas. Click derecho → "Inspect Element" funcionará igual que en Chrome.
