"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Book, Search, FileText, Zap, Shield, HelpCircle, Rocket, AlertCircle, ArrowLeft } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";
import { Footer } from "@/components/footer";
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
- 🌐 **Multi-Idioma**: Disponible en Español e Inglés
- 🎨 **Interfaz Moderna**: UI responsive con modo oscuro/claro

### Primeros Pasos

#### 1. Acceso al Sistema

1. Abre tu navegador y ve a la URL de tu instalación
2. Inicia sesión con tus credenciales
3. Llegarás al **Dashboard** principal donde ves todos tus servidores

#### 2. Agregar Servidores

Los servidores se agregan directamente desde el Dashboard:

1. En el Dashboard, haz clic en el botón **"+ Agregar Servidor"** (esquina superior derecha)
2. Se desplegará un formulario donde completarás:
   - **Nombre del servidor**: Descriptivo (ej: "Web Server 01")
   - **Dirección IP o Hostname**: Dirección del servidor
   - **Puerto SSH**: Por defecto 22
   - **Usuario SSH**: Usuario para conexión (ej: ubuntu, root)
   - **Método de autenticación**: Contraseña o clave SSH privada
3. Haz clic en **"Agregar Servidor"**
4. El sistema verificará la conexión automáticamente

#### 3. Organizar con Grupos

Los grupos te permiten organizar tus servidores:

1. En el Dashboard, haz clic en **"Gestionar Grupos"**
2. Se abrirá el gestor de grupos donde puedes:
   - Crear nuevos grupos
   - Asignar servidores a grupos (arrastra y suelta)
   - Editar o eliminar grupos
3. Los grupos comunes incluyen: "Producción", "Desarrollo", "Staging", etc.

#### 4. Usar el AI Copilot

Para obtener ayuda inteligente con un servidor:

1. Haz clic en un servidor de la lista
2. Se abrirá el panel de chat con el **AI Copilot**
3. Escribe tu consulta o describe el problema
4. El AI analizará y proporcionará soluciones
5. Puedes ejecutar los comandos sugeridos directamente

Alternativamente, puedes:
- Hacer clic en el botón **"Diagnosticar"** de cualquier servidor
- Acceder a la consola del servidor y usar el AI desde ahí

### Navegación del Sistema

**Menú Lateral Izquierdo**:
- 🏠 **Dashboard**: Vista principal con todos los servidores
- 📅 **Informes Programados**: Reportes automáticos de salud
- 📚 **Documentación**: Esta guía
- 👤 **Perfil**: Tu información y preferencias
- 🛡️ **Admin**: Panel de administración (solo para admins)

### Próximos Pasos

- Explora la sección de **Informes Programados** para automatizar reportes
- Configura tus **Preferencias de Notificación** en tu perfil
- Si eres administrador, lee la documentación de **Roles y Permisos**
- Usa el **AI Copilot** para diagnosticar cualquier problema
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

1. **Ve al Dashboard Principal**:
   - El Dashboard es la página principal que ves al iniciar sesión
   - Aquí se muestran todos tus servidores en tarjetas o lista

2. **Haz clic en "Agregar Servidor"**:
   - Botón ubicado en la parte superior derecha del Dashboard
   - Se desplegará un formulario debajo del header

3. **Completa el Formulario**:
   - **Nombre**: Un nombre descriptivo (ej: "Web Server 01")
   - **IP/Hostname**: Dirección IP (192.168.1.100) o dominio (server.example.com)
   - **Puerto SSH**: Por defecto 22 (cambia si usas otro puerto)
   - **Usuario SSH**: Usuario para conexión (ubuntu, admin, root)
   - **Grupo**: Opcionalmente asigna a un grupo existente
   - **Método de Autenticación**: 
     - **Contraseña**: Ingresa la contraseña del usuario SSH
     - **Clave SSH**: Pega tu clave privada SSH

4. **Probar y Guardar**:
   - El botón cambiará a "Probando conexión..."
   - Si la conexión es exitosa, el servidor se agregará
   - Aparecerá en tu lista de servidores inmediatamente

### Organizar con Grupos

Los grupos facilitan la gestión de múltiples servidores:

**Para Gestionar Grupos**:
1. En el Dashboard, haz clic en **"Gestionar Grupos"**
2. Se abrirá un panel lateral con todas las opciones de grupos
3. Puedes:
   - **Crear Grupo**: Botón "+ Crear Grupo"
   - **Ver Grupos Existentes**: Lista de todos los grupos
   - **Asignar Servidores**: Arrastra servidores a los grupos
   - **Editar Grupo**: Cambiar nombre o descripción
   - **Eliminar Grupo**: Los servidores quedan sin asignar

**Casos de Uso Comunes**:
- Por ambiente: Producción, Staging, Desarrollo
- Por ubicación: US-East, EU-West, LATAM
- Por función: Web Servers, Database Servers, Cache Servers
- Por cliente: Cliente A, Cliente B, Interno

### Visualización de Servidores

El Dashboard ofrece diferentes vistas:

**Vista de Tarjetas** (por defecto):
- Muestra servidores en tarjetas grandes
- Información visible: nombre, IP, estado, botones de acción

**Vista de Lista**:
- Tabla compacta con todos los servidores
- Ideal para gestionar muchos servidores

**Vista Agrupada**:
- Los servidores se agrupan por su grupo asignado
- Fácil navegación entre grupos

### Monitoreo de Estado

Cada servidor muestra su estado con un indicador de color:

- 🟢 **Online**: Servidor accesible y funcionando correctamente
- 🟡 **Warning**: Problemas menores o warnings detectados
- 🔴 **Error**: Servidor inaccesible o error crítico
- ⚪ **Unknown**: Estado no verificado aún

### Acciones por Servidor

Para cada servidor puedes realizar varias acciones:

**Desde la Tarjeta del Servidor**:
- **🔍 Diagnosticar**: Abre el AI Copilot para ese servidor
- **🖥️ Consola**: Acceso a terminal SSH web
- **✏️ Editar**: Modificar configuración del servidor
- **🗑️ Eliminar**: Remover del sistema (no afecta al servidor real)
- **📊 Estadísticas**: Ver métricas de rendimiento

**Consola SSH Web**:
- Acceso directo desde el navegador
- No requiere cliente SSH local
- Sesión segura y encriptada

### Editar un Servidor

Para modificar la configuración de un servidor:

1. Haz clic en el ícono **✏️ Editar** en la tarjeta del servidor
2. Se abrirá el mismo formulario que para agregar
3. Los campos estarán pre-completados con los valores actuales
4. Modifica lo necesario y guarda cambios
5. La conexión se re-verificará si cambias datos de acceso

### Eliminar un Servidor

**⚠️ Importante**: Eliminar un servidor del sistema NO afecta al servidor físico/virtual real, solo lo quita de la plataforma.

1. Haz clic en **🗑️ Eliminar**
2. Aparecerá una confirmación
3. Confirma la eliminación
4. El servidor desaparecerá de tu lista

### Mejores Prácticas

✅ **Recomendado**:
- Usa claves SSH en lugar de contraseñas (más seguro)
- Agrupa servidores lógicamente desde el inicio
- Mantén nombres descriptivos y consistentes
- Verifica el estado regularmente
- Documenta cambios importantes en la descripción

❌ **Evita**:
- Compartir credenciales entre usuarios de la plataforma
- Usar el usuario root si no es necesario
- Dejar servidores sin asignar a grupos
- Nombres genéricos como "server1", "server2", "test"
- Guardar contraseñas en texto plano fuera del sistema
`
    },
    {
        id: "ai-copilot",
        title: "AI Copilot",
        icon: Zap,
        description: "Cómo usar el asistente de IA",
        content: `# 🤖 AI Copilot - Tu Asistente Inteligente

## ¿Qué es el AI Copilot?

El AI Copilot es un asistente de inteligencia artificial que te ayuda a:
- Diagnosticar problemas en servidores
- Sugerir soluciones a errores
- Ejecutar comandos de forma segura
- Interpretar logs y métricas
- Automatizar tareas comunes

## Cómo Usar el AI Copilot

### 1. Acceso al Copilot

El AI Copilot se puede acceder de estas formas:

**Desde el Dashboard** (Más Rápido):
1. Ve al Dashboard principal
2. Encuentra el servidor que necesitas diagnosticar
3. Haz clic en el botón **"🔍 Diagnosticar"** en la tarjeta del servidor
4. Se abrirá un panel de chat con el AI Copilot
5. El servidor ya estará seleccionado automáticamente

**Desde la Consola del Servidor**:
1. Haz clic en **"🖥️ Consola"** en cualquier servidor
2. Accederás a la consola SSH web del servidor
3. En la consola verás el panel del AI Copilot a la derecha
4. Puedes chatear con el AI mientras trabajas en la consola

**Características del Chat**:
- El historial de conversación se mantiene
- Puedes hacer múltiples preguntas seguidas
- El AI recuerda el contexto de la conversación
- Los comandos sugeridos se pueden ejecutar directamente

### 2. Hacer una Consulta

El AI entiende lenguaje natural. Puedes preguntar de varias formas:

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

### 3. Contexto del Servidor

El AI necesita saber en qué servidor trabajar:

1. **Selecciona el servidor** antes de preguntar
2. O menciona el servidor en tu pregunta: "En el servidor web-01, revisa..."
3. El AI recordará el contexto de la conversación

### 4. Ejecutar Comandos

Cuando el AI sugiere comandos:

**El AI puede**:
- ✅ Leer archivos de log
- ✅ Ver procesos y recursos
- ✅ Revisar configuraciones
- ✅ Ejecutar comandos de diagnóstico

**El AI NO puede** (sin tu confirmación):
- ❌ Modificar archivos de configuración
- ❌ Instalar/desinstalar software
- ❌ Reiniciar servicios
- ❌ Eliminar archivos

**Confirmación Requerida**:
- Para comandos que modifican el sistema, el AI pedirá confirmación
- Revisa el comando antes de aprobar
- Puedes cancelar en cualquier momento

### 5. Adjuntar Imágenes

Para diagnósticos más precisos, puedes adjuntar:
- Capturas de pantalla de errores
- Gráficos de monitoreo
- Diagramas de arquitectura

1. Haz clic en el ícono de imagen 📎
2. Selecciona o arrastra la imagen
3. El AI la analizará junto con tu consulta

## Mejores Prácticas

### ✅ Hacer

- **Sé específico**: "El puerto 80 no responde" es mejor que "hay un problema"
- **Proporciona contexto**: Menciona qué cambios recientes hiciste
- **Usa términos técnicos** cuando sea posible
- **Adjunta logs** o capturas relevantes
- **Sigue las sugerencias** paso a paso

### ❌ Evitar

- Preguntas muy amplias: "Arregla todo"
- Omitir información crítica
- Ejecutar comandos sin entenderlos
- Ignorar advertencias de seguridad

## Ejemplos de Uso

### Ejemplo 1: Servidor Lento

**Usuario**: "Mi servidor está muy lento desde esta mañana"

**AI**: "Voy a revisar varios aspectos. Déjame verificar:
1. Uso de CPU y memoria
2. Procesos más consumidores de recursos
3. Espacio en disco
4. Carga de red

\`\`\`bash
top -b -n 1 | head -20
df -h
free -m
\`\`\`

¿Puedo ejecutar estos comandos de diagnóstico?"

### Ejemplo 2: Servicio Caído

**Usuario**: "Nginx no arranca y muestra error 'Address already in use'"

**AI**: "Este error indica que el puerto 80 ya está en uso. Vamos a identificar qué proceso lo está usando:

\`\`\`bash
sudo lsof -i :80
sudo netstat -tulpn | grep :80
\`\`\`

Una vez identifiquemos el proceso, podemos decidir si debemos:
1. Detenerlo si es un proceso duplicado
2. Cambiar el puerto de nginx
3. Verificar si hay otro servidor web corriendo"

## Configuración Avanzada

### Modelos de IA Soportados

El sistema soporta múltiples modelos:
- **Google Gemini**: Rápido y eficiente
- **Anthropic Claude**: Excelente para tareas complejas
- **AWS Bedrock**: Para entornos enterprise

Los administradores pueden configurar qué modelo usar en Configuración.

### Límites y Consideraciones

- **Contexto**: El AI recuerda las últimas ~10 interacciones
- **Comandos**: Máximo 5 comandos por respuesta para seguridad
- **Timeout**: Comandos limitados a 30 segundos
- **Permisos**: El AI respeta tus permisos de usuario
`
    },
    {
        id: "notifications",
        title: "Notificaciones y Reportes",
        icon: AlertCircle,
        description: "Configurar alertas y reportes automáticos",
        content: `# 📧 Notificaciones y Reportes

## Sistema de Notificaciones

Mantente informado sobre eventos importantes en tu infraestructura.

### Tipos de Notificaciones

**Por Email**:
- Nuevos usuarios registrados (para admins)
- Alertas de seguridad
- Cambios críticos en configuración
- Reportes programados

**En la Aplicación**:
- Confirmaciones de acciones
- Errores y warnings
- Actualizaciones de estado

### Configurar Notificaciones

1. **Ve a tu Perfil**
   - Haz clic en tu avatar (esquina superior derecha)
   - Selecciona "Perfil"

2. **Preferencias de Email**
   - Activa/desactiva cada tipo de notificación
   - Guarda cambios

3. **Idioma de Emails**
   - Los emails se envían en tu idioma preferido
   - Automáticamente detectado del navegador
   - Cambiable en Configuración

## Informes Programados

Automatiza la generación de reportes de salud de servidores.

### Crear un Informe Programado

1. **Accede a Informes Programados**
   - En el menú lateral izquierdo, haz clic en **"📅 Informes Programados"**
   - Esta opción está disponible directamente desde el Dashboard
   - No necesitas ir al panel de Admin

2. **Haz clic en "Crear Informe"** o "+ Nuevo Informe"

3. **Configura el Informe**:
   - **Nombre**: Descriptivo (ej: "Health Check Semanal Producción")
   - **Descripción**: Opcional, ayuda a recordar el propósito
   - **Selecciona Objetivo**: 
     - **Un Servidor Específico**: Elige de la lista de servidores
     - **Un Grupo Completo**: Elige un grupo para reportar todos sus servidores
   - **Frecuencia**:
     - **Diaria**: Se ejecuta todos los días a las 8:00 AM
     - **Semanal**: Se ejecuta los lunes a las 8:00 AM
     - **Mensual**: Primer día de cada mes a las 12:00 AM
     - **Custom**: Define tu propia expresión cron
   - **Email de Destino**: Dirección donde se enviará el reporte
     - Puede ser diferente a tu email de registro
     - Útil para enviar a equipos o managers

4. **Guarda el Informe**
   - El informe quedará programado automáticamente
   - La primera ejecución será en la próxima fecha/hora programada

### Contenido del Informe

Cada informe incluye:

**Resumen Ejecutivo**:
- Estado general del servidor/grupo
- Problemas detectados
- Recomendaciones de la IA

**Métricas Clave**:
- Uso de CPU
- Uso de Memoria
- Espacio en Disco
- Carga del Sistema

**Análisis de IA**:
- Tendencias identificadas
- Predicciones de problemas
- Sugerencias de optimización

**Comparación**:
- Cambios desde el informe anterior
- Degradaciones de performance
- Mejoras implementadas

### Formato PDF

Los informes se envían como:
- **Archivo adjunto PDF** profesional
- **Gráficas y visualizaciones**
- **Formato imprimible**

### Expresiones Cron Personalizadas

Para frecuencias custom, usa expresiones cron:

\`\`\`
* * * * *
│ │ │ │ │
│ │ │ │ └─── Día de la semana (0-7, 0 y 7 = Domingo)
│ │ │ └───── Mes (1-12)
│ │ └─────── Día del mes (1-31)
│ └───────── Hora (0-23)
└─────────── Minuto (0-59)
\`\`\`

**Ejemplos**:
- \`0 8 * * *\` - Todos los días a las 8:00 AM
- \`0 8 * * 1\` - Todos los lunes a las 8:00 AM
- \`0 0 1 * *\` - Primer día de cada mes a medianoche
- \`0 */4 * * *\` - Cada 4 horas

### Gestionar Informes

**Editar**: Actualiza configuración de informes existentes
**Pausar**: Detiene temporalmente un informe sin eliminarlo
**Eliminar**: Cancela y elimina el informe

## Mejores Prácticas

✅ **Recomendaciones**:
- Programa informes en horarios de baja carga
- No excedas 1 informe diario por servidor
- Revisa los informes regularmente
- Actualiza los destinatarios según sea necesario

❌ **Evita**:
- Informes muy frecuentes (consume recursos)
- Enviar a muchos destinatarios innecesariamente
- Ignorar alertas sistemáticamente
`
    },
    {
        id: "security",
        title: "Seguridad y Permisos",
        icon: Shield,
        description: "Roles, permisos y mejores prácticas de seguridad",
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
- ✅ Configurar integraciones

**Casos de Uso**:
- Instalación y configuración inicial
- Gestión de administradores
- Configuraciones críticas del sistema

#### ⚡ Admin
**Permisos**:
- ✅ Gestionar usuarios (excepto otros admins)
- ✅ Crear y gestionar servidores
- ✅ Crear y gestionar grupos
- ✅ Ver logs de auditoría
- ✅ Configurar notificaciones
- ✅ Crear informes programados
- ❌ No puede modificar configuración global
- ❌ No puede gestionar otros administradores

**Casos de Uso**:
- Gestión diaria de la infraestructura
- Administración de equipos
- Soporte técnico

#### 👤 User
**Permisos**:
- ✅ Ver servidores asignados a sus grupos
- ✅ Usar AI Copilot en servidores permitidos
- ✅ Ejecutar comandos de solo lectura
- ✅ Ver su perfil y actualizarlo
- ❌ No puede crear/eliminar servidores
- ❌ No puede gestionar usuarios
- ❌ No puede cambiar configuraciones

**Casos de Uso**:
- Desarrolladores que necesitan consultar estados
- Soporte de nivel 1
- Monitoreo de servidores específicos

### Gestión de Usuarios

#### Crear Usuarios (Solo Admin/Superadmin)

1. **Admin Panel > Usuarios**
2. **Agregar Usuario**
3. **Completa el formulario**:
   - Email
   - Nombre completo
   - Rol
   - Grupos asignados (opcional)
4. **Envía invitación**: El usuario recibe un email para activar su cuenta

#### Asignar Grupos a Usuarios

Los usuarios pueden tener acceso limitado a grupos específicos:

1. **Edita el usuario**
2. **Selecciona "Grupos Permitidos"**
3. **Elige los grupos** a los que tendrá acceso
4. **Guarda cambios**

**Ejemplo**:
- Usuario "Juan" → Grupo "Desarrollo"
- Usuario "María" → Grupos "Producción" y "Staging"

### Autenticación

#### Métodos Soportados

**Contraseña + Email**:
- Método estándar
- Requiere email verificado
- Contraseña segura obligatoria

**Microsoft OAuth** (Opcional):
- Login con cuenta corporativa
- Single Sign-On (SSO)
- Configurado por administradores

#### Políticas de Contraseña

Las contraseñas deben cumplir:
- ✅ Mínimo 8 caracteres
- ✅ Al menos una mayúscula
- ✅ Al menos un número
- ✅ Al menos un carácter especial

#### Recuperación de Contraseña

1. Haz clic en "Olvidé mi contraseña"
2. Ingresa tu email
3. Recibirás un link de recuperación
4. Sigue las instrucciones del email

### Sesiones y Seguridad

**Duración de Sesión**:
- Las sesiones expiran después de 24 horas de inactividad
- Puedes cerrar sesión manualmente en cualquier momento

**Tokens de Acceso**:
- Generados con JWT (JSON Web Tokens)
- Firmados y verificados en cada request
- No almacenan información sensible

### Auditoría

Todas las acciones importantes quedan registradas:

**Registrado Automáticamente**:
- Login/Logout de usuarios
- Creación/modificación/eliminación de usuarios
- Cambios en servidores
- Ejecución de comandos
- Cambios de configuración

**Acceso a Logs**:
- **Admin/Superadmin**: Admin > Registros
- Filtrado por fecha, acción, usuario
- Exportable a CSV

## Mejores Prácticas de Seguridad

### ✅ Recomendaciones

**Para Administradores**:
1. **Principio de Mínimo Privilegio**: Asigna solo los permisos necesarios
2. **Rotar Credenciales**: Cambia contraseñas periódicamente
3. **Revisar Logs**: Monitorea actividad sospechosa regularmente
4. **Grupos Organizados**: Usa grupos para segregar acceso
5. **2FA Futuro**: Prepárate para autenticación de dos factores

**Para Usuarios**:
1. **Contraseña Fuerte**: Usa un gestor de contraseñas
2. **No Compartir Credenciales**: Cada persona debe tener su cuenta
3. **Cerrar Sesión**: Especialmente en computadoras compartidas
4. **Reportar Incidentes**: Informa actividad extraña de inmediato

### ❌ Evitar

- Usar la cuenta de superadmin para tareas diarias
- Compartir contraseñas entre usuarios
- Crear usuarios genéricos (ej: "equipo@" o "soporte@")
- Ignorar logs de auditoría
- Dar permisos de admin "por si acaso"

## Registro de Cambios de Seguridad

Ver [CHANGELOG.md](https://github.com/sentrait/ai_agent) para actualizaciones de seguridad en cada versión.
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
- Estado del servidor: 🔴 Error

**Soluciones**:

1. **Verifica la conectividad de red**:
   \`\`\`bash
   ping <IP_DEL_SERVIDOR>
   telnet <IP_DEL_SERVIDOR> 22
   \`\`\`

2. **Verifica que SSH esté corriendo** en el servidor:
   \`\`\`bash
   sudo systemctl status sshd
   sudo systemctl start sshd  # Si está detenido
   \`\`\`

3. **Confirma las credenciales**:
   - Usuario correcto
   - Contraseña/clave SSH válida
   - Permisos en el archivo de clave (\`chmod 600 key.pem\`)

4. **Revisa el firewall**:
   \`\`\`bash
   sudo ufw status
   sudo ufw allow 22/tcp  # Si está bloqueado
   \`\`\`

### El AI Copilot no responde

**Síntomas**:
- Mensaje "Error al procesar consulta"
- Timeout en las respuestas
- El AI dice "No tengo acceso a..."

**Soluciones**:

1. **Verifica que el servidor esté seleccionado**:
   - Debe haber un servidor activo en el contexto
   - Intenta seleccionar el servidor manualmente

2. **Revisa la configuración de IA** (Solo Admins):
   - Admin > Configuración > IA
   - Verifica que la API Key esté configurada
   - Prueba la conexión con el proveedor de IA

3. **Límites de uso alcanzados**:
   - Algunos proveedores tienen cuotas
   - Espera unos minutos y reintenta
   - Contacta al administrador

### No recibo notificaciones por email

**Síntomas**:
- No llegan emails de notificaciones
- No recibo invitaciones de usuario
- Informes programados no llegan

**Soluciones**:

1. **Revisa carpeta de SPAM**:
   - Los emails pueden estar filtrándose
   - Marca como "No es spam"
   - Agrega el dominio a lista blanca

2. **Verifica tu email en el perfil**:
   - Perfil > Email
   - Debe estar verificado (✅)

3. **Configuración SMTP** (Solo Admins):
   - Admin > Configuración > Comunicación
   - Verifica servidor SMTP y credenciales
   - Usa el botón "Test Connection"

### Problemas de Rendimiento

**Síntomas**:
- La aplicación está lenta
- Los comandos tardan mucho
- Timeout en operaciones

**Soluciones**:

1. **Recursos del servidor de AI Agent**:
   \`\`\`bash
   docker stats
   \`\`\`
   - Si uso de CPU/RAM es alto, considera más recursos

2. **Limpia datos antiguos**:
   - Los logs de auditoría pueden acumularse
   - Considera archivar logs antiguos

3. **Revisa la red**:
   - Latencia a servidores remotos
   - Ancho de banda disponible

### No puedo ver ciertos servidores

**Síntomas**:
- Algunos servidores no aparecen en la lista
- Error de permisos al intentar acceder

**Soluciones**:

1. **Verifica tus permisos**:
   - Los usuarios solo ven servidores en sus grupos asignados
   - Contacta al administrador para solicitar acceso

2. **Sistema de grupos**:
   - Verifica que el servidor esté en un grupo
   - Verifica que estés asignado a ese grupo

3. **Rol de usuario**:
   - Confirma tu rol: Perfil > Rol
   - Solo admins ven todos los servidores

### Error al ejecutar comandos

**Síntomas**:
- "Permission denied"
- "Command not found"
- Comandos no se ejecutan

**Soluciones**:

1. **Permisos del usuario SSH**:
   - El usuario debe tener permisos adecuados
   - Para comandos sudo, configurar sudoers:
     \`\`\`bash
     username ALL=(ALL) NOPASSWD: ALL
     \`\`\`

2. **Comando no existe en el servidor**:
   - Verifica que el comando esté instalado
   - Usa rutas absolutas: \`/usr/bin/comando\`

3. **Permisos en AI Agent**:
   - Tu rol puede limitar qué comandos ejecutas
   - Usuarios normales: solo lectura
   - Admins: todos los comandos

## Obtener Ayuda

### Recursos Disponibles

1. **Documentación**:
   - Esta Wiki
   - README del proyecto
   - Notas de versión

2. **Soporte Interno**:
   - Contacta a tu administrador del sistema
   - Consulta logs de auditoría para investigar

3. **Reportar Bugs**:
   - Describe el problema detalladamente
   - Incluye capturas de pantalla
   - Especifica versión del sistema
   - Proporciona pasos para reproducir

### Información Útil al Reportar

Cuando reportes un problema, incluye:

- ✅ Versión de AI Sysadmin Agent
- ✅ Navegador y versión
- ✅ Pasos exactos para reproducir
- ✅ Mensaje de error completo
- ✅ Capturas de pantalla
- ✅ Hora aproximada del incidente

**Ver Versión**:
- Footer de la aplicación
- Perfil > Acerca de
`
    }
];

export default function DocumentationPage() {
    const { t } = useI18n();
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedDoc, setSelectedDoc] = useState<string>(documentationSections[0].id);

    const filteredDocs = documentationSections.filter(doc =>
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.content.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const currentDoc = documentationSections.find(doc => doc.id === selectedDoc) || documentationSections[0];

    return (
        <div className="min-h-screen flex flex-col">
            {/* Header with back button */}
            <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex items-center justify-between h-16 px-6">
                    <Button
                        variant="ghost"
                        onClick={() => router.push('/dashboard')}
                        className="gap-2"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        {t.common?.back || "Volver al Dashboard"}
                    </Button>
                    <h1 className="text-xl font-semibold flex items-center gap-2">
                        <Book className="h-5 w-5" />
                        {t.sidebar?.documentation || "Documentación"}
                    </h1>
                    <div className="w-32" /> {/* Spacer for centering */}
                </div>
            </div>

            {/* Main content */}
            <div className="flex-1 flex h-[calc(100vh-4rem-4rem)] gap-4 p-6">
                {/* Sidebar with documentation sections */}
                <Card className="w-80 flex-shrink-0">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Book className="h-5 w-5" />
                            Documentación
                        </CardTitle>
                        <CardDescription>
                            Guías y tutoriales
                        </CardDescription>
                        <div className="relative mt-4">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar documentación..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ScrollArea className="h-[calc(100vh-16rem)]">
                            <div className="space-y-1 p-4">
                                {filteredDocs.map((doc) => {
                                    const Icon = doc.icon;
                                    return (
                                        <button
                                            key={doc.id}
                                            onClick={() => setSelectedDoc(doc.id)}
                                            className={`w-full text-left p-3 rounded-lg transition-colors ${selectedDoc === doc.id
                                                ? 'bg-primary text-primary-foreground'
                                                : 'hover:bg-muted'
                                                }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium">{doc.title}</div>
                                                    <div className={`text-xs mt-1 ${selectedDoc === doc.id
                                                        ? 'text-primary-foreground/80'
                                                        : 'text-muted-foreground'
                                                        }`}>
                                                        {doc.description}
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>

                {/* Main content area */}
                <Card className="flex-1">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            {(() => {
                                const Icon = currentDoc.icon;
                                return <Icon className="h-6 w-6" />;
                            })()}
                            <div>
                                <CardTitle>{currentDoc.title}</CardTitle>
                                <CardDescription>{currentDoc.description}</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[calc(100vh-14rem)]">
                            <div className="prose prose-slate dark:prose-invert max-w-none pr-4">
                                <ReactMarkdown
                                    components={{
                                        h1: ({ node, ...props }) => <h1 className="text-3xl font-bold mt-8 mb-4" {...props} />,
                                        h2: ({ node, ...props }) => <h2 className="text-2xl font-semibold mt-6 mb-3" {...props} />,
                                        h3: ({ node, ...props }) => <h3 className="text-xl font-semibold mt-4 mb-2" {...props} />,
                                        p: ({ node, ...props }) => <p className="mb-4 leading-7" {...props} />,
                                        ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-4 space-y-2" {...props} />,
                                        ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-4 space-y-2" {...props} />,
                                        code: ({ node, inline, ...props }: any) =>
                                            inline ? (
                                                <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props} />
                                            ) : (
                                                <code className="block bg-muted p-4 rounded-lg text-sm font-mono overflow-x-auto mb-4" {...props} />
                                            ),
                                        blockquote: ({ node, ...props }) => (
                                            <blockquote className="border-l-4 border-primary pl-4 italic my-4" {...props} />
                                        ),
                                    }}
                                >
                                    {currentDoc.content}
                                </ReactMarkdown>
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>

            {/* Footer */}
            <Footer />
        </div>
    );
}
