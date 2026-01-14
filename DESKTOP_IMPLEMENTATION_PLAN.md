# Frontend Desktop - Plan de Implementación Completo

## Auditoría completa de frontend web → desktop

### ESTADO ACTUAL (✅ = Implementado, 🔧 = Parcial, ❌ = Falta)

## 1. PÁGINAS PRINCIPALES

### ✅ Login (`/login`)

- [x] Formulario login/register toggle
- [x] Autenticación con backend
- [x] Theme switcher
- [x] Navegación post-login
**Status: COMPLETO**

### ✅ Dashboard (`/`)

- [x] Layout con sidebar
- [x] Lista de servidores con grupos
- [x] Búsqueda y filtros
- [x] Vista Grid/List toggle
- [x] Ordenamiento
- [x] Agregar servidor (modal mejorado con SSH)
- [x] Editar servidor (con SSH credentials)
- [x] Eliminar servidor
- [x] **CSV Import** - COMPLETADO
- [x] **Group Manager completo** - COMPLETADO
- [ ] **Diagnóstico servidor** - Solo placeholder
**Status: 95% - Falta solo Diagnóstico**

### ✅ Console (`/server/:id/console`)

- [x] Terminal interactivo (xterm.js)
- [x] Ejecución de comandos
- [x] Layout con DashboardLayout
**Status: COMPLETO**

### ✅ Scheduled Reports (`/scheduled-reports`)

- [x] Vista de reportes programados
- [x] Crear/editar/eliminar reportes
- [x] Configuración de frecuencia  
- [x] Vista de historial
- [x] Ejecutar manualmente
- [x] Descargar PDFs
**Status: COMPLETO**

### ❌ Documentation (`/documentation`)

- [ ] Visualizador de documentación
- [ ] Navegación por secciones
- [ ] Buscar en docs
**Status: 0% - NO INICIADO**

### ✅ Profile (`/profile`)

- [x] Información del usuario
- [x] Cambiar contraseña
- [x] Preferencias
- [x] Editar perfil
**Status: COMPLETO**

### 🔧 Admin (`/admin`)

- [x] Panel de administración con tabs
- [x] Gestión de usuarios (crear/eliminar/listar)
- [x] Botones Groups, Mail, Edit (UI completa)
- [x] Envío de notificaciones (funcional)
- [x] Información del sistema
- [ ] Edición de usuarios (modal edit)
- [ ] Gestión de grupos por usuario (modal groups)
- [ ] Logs de auditoría
- [ ] Preferencias de notificación
- [ ] Parámetros del frontend
- [ ] Configuración de seguridad
- [ ] Configuración de comunicaciones
**Status: 50% - User Management con UI completa, faltan modals Edit/Groups**

## 2. COMPONENTES REUTILIZABLES

### ✅ Implementados

- [x] Button
- [x] Input
- [x] Card
- [x] Dialog
- [x] AlertDialog
- [x] DropdownMenu
- [x] Label
- [x] Textarea
- [x] ScrollArea
- [x] Sheet
- [x] ThemeProvider
- [x] ThemeSwitcher

### ❌ Faltan

- [ ] add-server-form (mejorado) - **Integrar en Desktop**
- [ ] csv-import - **Crear**
- [ ] group-manager - **Crear**
- [ ] agent-chat - **Crear**
- [ ] conversational-chat - **Crear**
- [ ] feedback-button - **Crear**
- [ ] language-switcher - **Mejorar (actualmente placeholder)**
- [ ] version-notification - **Crear**
- [ ] server-list (componente separado) - **Ya integrado en Dashboard**

### Admin Components (todos faltan)

- [ ] audit-logs
- [ ] communication-settings
- [ ] frontend-parameters
- [ ] notification-preferences
- [ ] security-settings
- [ ] user-management
- [ ] system-info
- [ ] backup-restore
- [ ] email-test
- [ ] api-keys
- [ ] role-management

## 3. API METHODS

### ✅ Implementados

- [x] login (form-urlencoded)
- [x] register
- [x] fetchCurrentUser
- [x] fetchServers
- [x] fetchServer
- [x] createServer
- [x] updateServer
- [x] deleteServer
- [x] executeCommand
- [x] fetchGroups
- [x] createGroup
- [x] updateGroup
- [x] deleteGroup

### ❌ Faltan

- [ ] fetchScheduledReports
- [ ] createScheduledReport
- [ ] updateScheduledReport
- [ ] deleteScheduledReport
- [ ] fetchUsers (admin)
- [ ] createUser (admin)
- [ ] updateUser (admin)
- [ ] deleteUser (admin)
- [ ] fetchSystemConfig (admin)
- [ ] updateSystemConfig (admin)
- [ ] fetchAuditLogs (admin)
- [ ] uploadCSV (servidores)
- [ ] fetchDocumentation
- [ ] updateProfile
- [ ] changePassword

## 4. PLAN DE IMPLEMENTACIÓN PRIORIZADO

### FASE 1: Completar Dashboard (ALTA PRIORIDAD)

1. **CSV Import para servidores**
   - Crear componente `csv-import.tsx`
   - Integrar en modal "Agregar Servidor"
   - API endpoint para bulk upload

2. **Group Manager completo**
   - Crear componente `group-manager.tsx`
   - CRUD completo de grupos
   - Asignación de servidores a grupos

3. **Diagnóstico de servidor**
   - Modal con información del servidor
   - Métricas en tiempo real (si disponibles)

### FASE 2: Páginas Secundarias (MEDIA PRIORIDAD)

1. **Scheduled Reports**
   - Crear route `/scheduled-reports`
   - Lista de reportes con tabla
   - Modal crear/editar reporte
   - Configuración de frecuencia (cron)

2. **Profile**
   - Crear route `/profile`
   - Formulario de información personal
   - Cambio de contraseña
   - Preferencias del usuario

### FASE 3: Documentation (BAJA PRIORIDAD)

1. **Documentation Viewer**
   - Crear route `/documentation`
   - Navegación por secciones
   - Renderizado markdown
   - Búsqueda

### FASE 4: Admin Panel (ALTA COMPLEJIDAD)

1. **Admin Dashboard**
   - Crear route `/admin`
   - Tabs para cada sección
   - User Management
   - System Config
   - Audit Logs
   - Security Settings
   - Notification Preferences
   - Frontend Parameters
   - Communication Settings

### FASE 5: Features Avanzadas

1. **AI Chat Assistant**
   - Integrar `agent-chat.tsx`
   - Integrar `conversational-chat.tsx`
   - Conexión con backend AI

2. **Language Switcher funcional**
   - Sistema i18n completo
   - Archivos de traducción
   - Persistencia de idioma

3. **Version Checker**
    - Notificaciones de nuevas versiones
    - Auto-update (Tauri)

## 5. ARCHIVOS A COPIAR/ADAPTAR DIRECTAMENTE

### Del frontend web al desktop

```
frontend/src/components/add-server-form.tsx → frontend-desktop/src/components/add-server-form.tsx
frontend/src/components/csv-import.tsx → frontend-desktop/src/components/csv-import.tsx
frontend/src/components/group-manager.tsx → frontend-desktop/src/components/group-manager.tsx
frontend/src/components/server-list.tsx → (Ya integrado en dashboard.tsx)
frontend/src/components/admin/* → frontend-desktop/src/components/admin/*
```

## 6. DECISIONES DE ARQUITECTURA

### Routing

- ✅ HashRouter (ya implementado - necesario para Tauri)

### State Management

- ✅ React useState/useEffect (suficiente por ahora)
- Considerar: Zustand o Context API si crece mucho

### API Client

- ✅ Tauri HTTP Plugin (bypass CORS)
- ✅ Token en localStorage

### Themes

- ✅ next-themes (dark/light mode)
- ✅ CSS variables para colores

### Forms

- Actual: Estado local
- Considerar: react-hook-form para formas complejas

## 7. TESTING CHECKLIST

### Por cada página/componente nuevo

- [ ] Compila sin errores TypeScript
- [ ] Funciona en modo desarrollo
- [ ] Funciona en build de producción
- [ ] Navegación funcional
- [ ] API calls funcionan
- [ ] Errores manejados correctamente
- [ ] Loading states implementados
- [ ] Responsive design
- [ ] Theme switching funciona
- [ ] Accesibilidad básica

## 8. PRÓXIMOS PASOS INMEDIATOS

1. ✅ Completar audit (este documento)
2. ✅ Implementar CSV Import
3. ✅ Implementar Group Manager completo
4. ✅ Crear página Scheduled Reports
5. ✅ Crear página Profile
6. ✅ Crear esqueleto Admin panel
7. ✅ Agregar botones Groups/Mail/Edit a User Management
8. ⏳ Implementar modal Edit User
9. ⏳ Implementar modal Manage Groups
10. ⏳ Agregar otras secciones de Admin (Audit Logs, Security, etc.)

## ESTIMACIÓN DE TIEMPO

- Fase 1 (Dashboard completo): 2-3 horas
- Fase 2 (Páginas secundarias): 3-4 horas
- Fase 3 (Documentation): 1-2 horas
- Fase 4 (Admin panel): 5-6 horas
- Fase 5 (Features avanzadas): 4-5 horas

**TOTAL: ~15-20 horas de desarrollo**

## NOTAS

- Priorizar funcionalidad sobre perfección estética
- Reutilizar componentes web tanto como sea posible
- Mantener paridad API con versión web
- Documentar diferencias Desktop vs Web si las hay
