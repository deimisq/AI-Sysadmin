import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Book, Search, FileText, Zap, Shield, HelpCircle, Rocket, AlertCircle } from "lucide-react";
import ReactMarkdown from 'react-markdown';

interface DocSection {
    id: string;
    title: string;
    icon: any;
    description: string;
    content: string;
}

const documentationSections: DocSection[] = [
    {
        id: "getting-started",
        title: "Guía de Inicio Rápido",
        icon: Rocket,
        description: "Primeros pasos con AI Sysadmin Agent",
        content: `# 🚀 Guía de Inicio Rápido

## Bienvenido a AI Sysadmin Agent

Esta guía te ayudará a comenzar a usar la plataforma de gestión inteligente de servidores.

### ¿Qué es AI Sysadmin Agent?

AI Sysadmin Agent es una plataforma de gestión y diagnóstico de servidores impulsada por inteligencia artificial que te permite:

- 🤖 **Diagnósticos Inteligentes**: Detecta y resuelve problemas automáticamente
- 🔐 **Gestión Segura**: Control de acceso basado en roles (RBAC)
- 📊 **Multi-Servidor**: Administra toda tu infraestructura desde un solo lugar
- 🎨 **Interfaz Moderna**: UI responsive con modo oscuro/claro

### Primeros Pasos

#### 1. Acceso al Sistema

1. Abre la aplicación desktop
2. Inicia sesión con tus credenciales
3. Llegarás al **Dashboard** principal donde ves todos tus servidores

#### 2. Agregar Servidores

Los servidores se agregan directamente desde el Dashboard:

1. En el Dashboard, haz clic en el botón **"+ Agregar Servidor"**
2. Se abrirá un formulario donde completarás:
   - **Hostname**: Nombre del servidor
   - **Dirección IP**: IP del servidor
   - **Sistema Operativo**: Selecciona de la lista
   - **Usuario SSH**: Usuario para conexión
   - **Método de autenticación**: Contraseña o clave SSH
3. Haz clic en **"Crear Servidor"**
4. El sistema verificará la conexión automáticamente

#### 3. Organizar con Grupos

Los grupos te permiten organizar tus servidores:

1. En el Dashboard, haz clic en **"Gestionar Grupos"**
2. Puedes crear nuevos grupos, asignar servidores y editar grupos existentes
3. Los grupos comunes incluyen: "Producción", "Desarrollo", "Staging", etc.

#### 4. Usar el Chat IA

Para obtener ayuda inteligente con un servidor:

1. Haz clic en el ícono **💬 Chat IA** en la tarjeta del servidor
2. Se abrirá el panel de chat con el asistente IA
3. Escribe tu consulta o describe el problema
4. El AI analizará y proporcionará soluciones
5. Puedes ejecutar los comandos sugeridos directamente

### Navegación del Sistema

**Menú Lateral**:
- 🏠 **Agente IA Sysadmin**: Vista principal con todos los servidores
- 📅 **Informes Programados**: Reportes automáticos de salud
- 📚 **Documentación**: Esta guía
- 👤 **Perfil**: Tu información y preferencias
- 🛡️ **Admin**: Panel de administración (solo para admins)
`
    },
    {
        id: "servers",
        title: "Gestión de Servidores",
        icon: FileText,
        description: "Cómo administrar y conectar servidores",
        content: `# 📊 Gestión de Servidores

## Conectar Servidores

### Requisitos Previos

Para conectar un servidor necesitas:

- **Acceso SSH** habilitado en el servidor
- **Usuario con permisos** sudo o root
- **Clave SSH o contraseña** para autenticación

### Agregar un Servidor

1. **Ve al Dashboard Principal**: La página principal que ves al iniciar sesión

2. **Haz clic en "+ Agregar Servidor"**: Ubicado en la parte superior

3. **Completa el Formulario**:
   - **Hostname**: Un nombre descriptivo (ej: "Web Server 01")
   - **IP**: Dirección IP (192.168.1.100)
   - **Sistema Operativo**: Selecciona de la lista
   - **Usuario SSH**: Usuario para conexión (ubuntu, admin, root)
   - **Contraseña SSH**: Contraseña del usuario
   - **Ruta Clave SSH**: Ruta a la clave privada (alternativa a contraseña)
   - **Grupo**: Opcionalmente asigna a un grupo existente

4. **Guarda**: El servidor se agregará a tu lista

### Vista de Servidores

El Dashboard ofrece diferentes vistas:

- **Vista de Tarjetas**: Muestra servidores en tarjetas grandes con información visible
- **Vista de Lista**: Tabla compacta ideal para gestionar muchos servidores

### Acciones por Servidor

Para cada servidor puedes realizar:

- **🖥️ Consola**: Acceso a terminal SSH
- **💬 Chat IA**: Diagnóstico inteligente con el asistente IA
- **⚡ Diagnosticar**: Análisis rápido del servidor
- **✏️ Editar**: Modificar configuración del servidor
- **🗑️ Eliminar**: Remover del sistema (no afecta al servidor real)

### Mejores Prácticas

✅ **Recomendado**:
- Usa claves SSH en lugar de contraseñas (más seguro)
- Agrupa servidores lógicamente desde el inicio
- Mantén nombres descriptivos y consistentes
- Verifica el estado regularmente

❌ **Evita**:
- Usar el usuario root si no es necesario
- Dejar servidores sin asignar a grupos
- Nombres genéricos como "server1", "server2"
`
    },
    {
        id: "ai-copilot",
        title: "Chat IA",
        icon: Zap,
        description: "Cómo usar el asistente de IA",
        content: `# 🤖 Chat IA - Tu Asistente Inteligente

## ¿Qué es el Chat IA?

El Chat IA es un asistente de inteligencia artificial que te ayuda a:
- Diagnosticar problemas en servidores
- Sugerir soluciones a errores
- Ejecutar comandos de forma segura
- Interpretar logs y métricas
- Automatizar tareas comunes

## Cómo Usar el Chat IA

### 1. Acceso al Chat

Desde el Dashboard:
1. Encuentra el servidor que necesitas diagnosticar
2. Haz clic en el botón **"💬 Chat IA"** en la tarjeta del servidor
3. Se abrirá un panel de chat
4. El servidor ya estará seleccionado automáticamente

### 2. Hacer una Consulta

El AI entiende lenguaje natural. Puedes preguntar:

**Diagnósticos**:
- "Mi servidor web está siendo lento, ¿qué puede estar pasando?"
- "Revisa por qué el servicio de nginx no arranca"
- "Analiza el uso de memoria en este servidor"

**Comandos y Tareas**:
- "¿Cómo actualizo todos los paquetes en Ubuntu?"
- "Muéstrame los procesos que más consumen CPU"
- "Revisa los últimos 50 logs del sistema"

**Información**:
- "¿Qué puertos están abiertos?"
- "Explícame este error: Connection refused"
- "¿Cómo funciona el firewall UFW?"

### 3. Ejecutar Comandos

Cuando el AI sugiere comandos:

- Revisa el comando antes de aprobar
- El AI pedirá confirmación para comandos que modifican el sistema
- Puedes ejecutar directamente con el botón "Ejecutar"

### 4. Adjuntar Imágenes

Para diagnósticos más precisos, puedes adjuntar:
- Capturas de pantalla de errores
- Gráficos de monitoreo

1. Haz clic en el ícono de imagen 📎
2. Selecciona o arrastra la imagen
3. El AI la analizará junto con tu consulta

## Mejores Prácticas

✅ **Hacer**:
- Sé específico: "El puerto 80 no responde" es mejor que "hay un problema"
- Proporciona contexto: Menciona qué cambios recientes hiciste
- Adjunta logs o capturas relevantes

❌ **Evitar**:
- Preguntas muy amplias: "Arregla todo"
- Ejecutar comandos sin entenderlos
- Ignorar advertencias de seguridad
`
    },
    {
        id: "notifications",
        title: "Informes Programados",
        icon: AlertCircle,
        description: "Configurar reportes automáticos",
        content: `# 📧 Informes Programados

## Automatiza Reportes de Salud

Configura informes automáticos que se ejecutan periódicamente y se envían por email.

### Crear un Informe Programado

1. **Accede a Informes Programados**:
   - En el menú lateral, haz clic en **"📅 Informes Programados"**

2. **Haz clic en "Nuevo Chequeo Programado"**

3. **Configura el Informe**:
   - **Nombre**: Descriptivo (ej: "Health Check Semanal Producción")
   - **Tipo de objetivo**: Servidor individual o Grupo completo
   - **Frecuencia**: Diario, Semanal, Mensual o Custom (cron)
   - **Hora de ejecución**: Configura hora y minuto
   - **Email destinatarios**: Direcciones separadas por comas

4. **Guarda**: El informe quedará programado automáticamente

### Contenido del Informe

Cada informe incluye:
- Estado general del servidor/grupo
- Métricas clave (CPU, Memoria, Disco)
- Problemas detectados
- Análisis de IA con recomendaciones

### Expresiones Cron Personalizadas

Para frecuencias custom:

- \`0 8 * * *\` - Todos los días a las 8:00 AM
- \`0 8 * * 1\` - Todos los lunes a las 8:00 AM
- \`0 0 1 * *\` - Primer día de cada mes a medianoche
- \`0 */4 * * *\` - Cada 4 horas

### Gestionar Informes

- **Editar**: Actualiza configuración de informes existentes
- **Ejecutar Ahora**: Ejecuta manualmente sin esperar la programación
- **Ver Historial**: Revisa reportes anteriores
- **Eliminar**: Cancela y elimina el informe
`
    },
    {
        id: "security",
        title: "Seguridad y Permisos",
        icon: Shield,
        description: "Roles, permisos y mejores prácticas",
        content: `# 🔐 Seguridad y Permisos

## Sistema de Control de Acceso (RBAC)

AI Sysadmin Agent usa **Role-Based Access Control** para gestionar permisos.

### Roles Disponibles

#### 👑 Superadmin
**Permisos**:
- ✅ Acceso total al sistema
- ✅ Gestionar todos los usuarios
- ✅ Modificar configuración global
- ✅ Ver y gestionar todos los servidores y grupos
- ✅ Acceder a logs de auditoría

#### ⚡ Admin
**Permisos**:
- ✅ Gestionar usuarios (excepto otros admins)
- ✅ Crear y gestionar servidores
- ✅ Crear y gestionar grupos
- ✅ Ver logs de auditoría
- ✅ Configurar notificaciones
- ❌ No puede modificar configuración global

#### 👤 User
**Permisos**:
- ✅ Ver servidores asignados a sus grupos
- ✅ Usar Chat IA en servidores permitidos
- ✅ Ejecutar comandos de solo lectura
- ✅ Ver su perfil y actualizarlo
- ❌ No puede crear/eliminar servidores

### Gestión de Usuarios

#### Crear Usuarios (Solo Admin/Superadmin)

1. **Admin Panel > Usuarios**
2. **Nuevo Usuario**
3. **Completa el formulario**:
   - Email, Nombre completo, Rol
   - Grupos asignados (opcional)
4. **Crea el usuario**

#### Asignar Grupos a Usuarios

1. **Edita el usuario**
2. **En "Gestionar Permisos"**
3. **Elige los grupos** a los que tendrá acceso
4. **Guarda cambios**

### Políticas de Contraseña

Las contraseñas deben cumplir:
- ✅ Mínimo 8 caracteres
- ✅ Al menos una mayúscula
- ✅ Al menos un número
- ✅ Al menos un carácter especial

### Auditoría

Todas las acciones importantes quedan registradas:

- Login/Logout de usuarios
- Cambios en servidores
- Ejecución de comandos
- Cambios de configuración

**Acceso a Logs**: Admin > Auditoría (solo admins)

## Mejores Prácticas de Seguridad

✅ **Recomendaciones**:
1. **Principio de Mínimo Privilegio**: Asigna solo los permisos necesarios
2. **Rotar Credenciales**: Cambia contraseñas periódicamente
3. **Revisar Logs**: Monitorea actividad regularmente
4. **Grupos Organizados**: Usa grupos para segregar acceso

❌ **Evitar**:
- Usar la cuenta de superadmin para tareas diarias
- Compartir contraseñas entre usuarios
- Crear usuarios genéricos
- Dar permisos de admin "por si acaso"
`
    },
    {
        id: "troubleshooting",
        title: "Solución de Problemas",
        icon: HelpCircle,
        description: "Problemas comunes y sus soluciones",
        content: `# 🔧 Solución de Problemas

## Problemas Comunes

### No puedo conectarme a un servidor

**Síntomas**:
- Error "Connection timeout"
- Error "Connection refused"

**Soluciones**:

1. **Verifica la conectividad de red**:
   \`\`\`bash
   ping <IP_DEL_SERVIDOR>
   telnet <IP_DEL_SERVIDOR> 22
   \`\`\`

2. **Verifica que SSH esté corriendo**:
   \`\`\`bash
   sudo systemctl status sshd
   sudo systemctl start sshd
   \`\`\`

3. **Confirma las credenciales**:
   - Usuario correcto
   - Contraseña/clave SSH válida

4. **Revisa el firewall**:
   \`\`\`bash
   sudo ufw status
   sudo ufw allow 22/tcp
   \`\`\`

### El Chat IA no responde

**Síntomas**:
- Mensaje "Error al procesar consulta"
- Timeout en las respuestas

**Soluciones**:

1. **Verifica que el servidor esté seleccionado**:
   - Debe haber un servidor activo en el contexto

2. **Revisa la configuración de IA** (Solo Admins):
   - Admin > Parámetros IA
   - Verifica que la API Key esté configurada
   - Prueba la conexión con el proveedor de IA

3. **Límites de uso alcanzados**:
   - Espera unos minutos y reintenta
   - Contacta al administrador

### El build falla

**Soluciones**:

1. **Reinstala dependencias**:
   \`\`\`bash
   npm install
   \`\`\`

2. **Limpia el build anterior**:
   \`\`\`bash
   npm run clean
   npm run build
   \`\`\`

3. **Verifica la versión de Node**:
   - Requiere Node.js 18+

## Necesitas Más Ayuda?

- Usa el **Chat IA** para consultas específicas
- Contacta al administrador del sistema
- Revisa los logs de auditoría para más detalles
`
    }
];

export function DocsView() {
    const [selectedSection, setSelectedSection] = useState<string>("getting-started");
    const [searchQuery, setSearchQuery] = useState("");

    const filteredSections = documentationSections.filter(section =>
        section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        section.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        section.content.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const currentSection = documentationSections.find(s => s.id === selectedSection) || documentationSections[0];

    return (
        <div className="h-full flex flex-col p-6">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    <Book className="h-8 w-8" />
                    Documentación
                </h1>
                <p className="text-muted-foreground">
                    Guías completas para usar AI Sysadmin Agent
                </p>
            </div>

            {/* Search */}
            <div className="mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar en la documentación..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-6 overflow-hidden">
                {/* Sidebar */}
                <Card className="md:col-span-1">
                    <CardHeader>
                        <CardTitle className="text-sm">Secciones</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ScrollArea className="h-[calc(100vh-300px)]">
                            <div className="space-y-1 p-4">
                                {filteredSections.map((section) => {
                                    const Icon = section.icon;
                                    return (
                                        <Button
                                            key={section.id}
                                            variant={selectedSection === section.id ? "secondary" : "ghost"}
                                            className="w-full justify-start"
                                            onClick={() => setSelectedSection(section.id)}
                                        >
                                            <Icon className="mr-2 h-4 w-4" />
                                            <span className="truncate">{section.title}</span>
                                        </Button>
                                    );
                                })}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>

                {/* Content */}
                <Card className="md:col-span-3">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <currentSection.icon className="h-6 w-6 text-primary" />
                            <div>
                                <CardTitle>{currentSection.title}</CardTitle>
                                <CardDescription>{currentSection.description}</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[calc(100vh-300px)] pr-4">
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                                <ReactMarkdown>{currentSection.content}</ReactMarkdown>
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
