# Plan de Implementación: Frontend Local Completo para Desktop App

## Objetivo

Convertir la app de "SaaS wrapper" a **aplicación desktop nativa** con frontend local y backend remoto.

## Arquitectura Objetivo

```
┌─────────────────────────────────────┐
│   Desktop App (Tauri)               │
│                                     │
│  ┌───────────────────────────────┐ │
│  │  Frontend (React + Vite)      │ │ ← Corre LOCALMENTE
│  │  - Rápido (sin latencia red)  │ │
│  │  - Routing client-side        │ │
│  │  - Build estático             │ │
│  └───────────────────────────────┘ │
│              ↓ API calls            │
└──────────────┼──────────────────────┘
               ↓
    ┌──────────────────────┐
    │  Backend API         │
    │  testing.sentrait.   │ ← Sigue en la nube
    │  com.uy/api/v1       │
    └──────────────────────┘
```

## Problema Actual

Next.js App Router con `output: 'export'` no soporta:

- Rutas dinámicas (`/server/[id]/console`)
- Server-side features
- Middleware

## Opciones de Solución

### Opción A: Migrar a Vite + React + React Router (RECOMENDADO)

**Pros:**

- ✅ Perfecto para desktop apps
- ✅ Build super rápido
- ✅ Routing 100% client-side
- ✅ Más simple que Next.js
- ✅ Mejor control
- ✅ Menos peso

**Contras:**

- ⚠️ Requiere reescribir estructura de rutas
- ⚠️ ~2-3 días de trabajo
- ⚠️ Perder algunas features de Next.js (no críticas para desktop)

**Estimación:** 2-3 días

### Opción B: Next.js Pages Router (legacy)

**Pros:**

- ✅ Menos cambios en el código
- ✅ Soporta static export mejor

**Contras:**

- ⚠️ Pages Router es legacy
- ⚠️ Aún tiene limitaciones
- ⚠️ Next.js es pesado para desktop

**Estimación:** 1-2 días

### Opción C: Electron en lugar de Tauri

**Pros:**

- ✅ Puede correr Next.js standalone
- ✅ No necesita cambios en frontend

**Contras:**

- ❌ Electron es MUY pesado (>100MB)
- ❌ Más lento que Tauri
- ❌ Más memoria

**Estimación:** 3-4 días

## RECOMENDACIÓN: Opción A (Vite + React Router)

### Fase 1: Setup Base (2-3 horas)

- [ ] Crear estructura Vite en `frontend-desktop/`
- [ ] Configurar React Router
- [ ] Configurar Tailwind CSS
- [ ] Configurar i18n
- [ ] Actualizar Tauri config

### Fase 2: Componentes Core (4-5 horas)

- [ ] Migrar layout base
- [ ] Migrar componentes UI (botones, cards, etc)
- [ ] Configurar tema (dark/light)
- [ ] Sistema de autenticación

### Fase 3: Páginas Principales (6-8 horas)

- [ ] Login page
- [ ] Dashboard (lista de servidores)
- [ ] Página de servidor individual
- [ ] Console/Terminal
- [ ] Configuración
- [ ] Admin

### Fase 4: Features Avanzadas (4-5 horas)

- [ ] Grupos de servidores
- [ ] Búsqueda y filtros
- [ ] WebSocket para terminal
- [ ] Notificaciones desktop
- [ ] Gestión de estado (Zustand o similar)

### Fase 5: Testing y Polish (2-3 horas)

- [ ] Testing en Windows
- [ ] Optimizar rendimiento
- [ ] Iconos y assets
- [ ] Build de producción

## Total Estimado: 18-24 horas de desarrollo

## Archivos a Crear/Modificar

### Nuevos

```
frontend-desktop/
├── src/
│   ├── main.tsx           # Entry point
│   ├── App.tsx            # Router setup
│   ├── routes/            # Páginas
│   ├── components/        # Componentes reutilizables
│   ├── lib/              # Utilidades, API client
│   ├── hooks/            # Custom hooks
│   └── styles/           # CSS global
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

### Modificar

- `src-tauri/tauri.conf.json` - Apuntar a frontend-desktop
- `.gitignore` - Ignorar dist/

## Siguiente Paso

¿Quieres que empiece con la Fase 1 ahora?

Voy a:

1. Crear la estructura Vite + React Router
2. Configurar Tauri para usarla
3. Migrar el login como prueba de concepto
4. Si funciona bien, continuar con el resto

¿Procedemos?
