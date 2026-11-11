# Propuesta V3: producto, arquitectura y comercialización

**Fecha de investigación:** 24 de octubre de 2026. **Estado:** propuesta; las prestaciones futuras no están implementadas por este documento.

## 1. Recomendación ejecutiva

Convertir AI Sysadmin Agent en un espacio de trabajo para operaciones: **conectar → investigar → preparar una acción → aprobarla → comprobar el resultado**. Público inicial propuesto: técnicos independientes y MSP pequeños que administren Windows/Linux, con español e inglés desde el inicio. Es una hipótesis que debe validarse con entrevistas; todavía no se confirmó el segmento prioritario.

Nombre de trabajo posible: **Sentrait Ops**. No se verificaron marca ni dominios.

La promesa propuesta es: **“Tus conexiones y el contexto de cada cliente, con diagnósticos que podés revisar y comprobar.”** La diferencia debe demostrarse en tareas reales y en tiempo ahorrado. SSH, RDP e IA ya existen en competidores: combinarlos no constituye por sí solo una ventaja defendible.

Lanzar **Free permanente** para trabajo individual local y **Pro por técnico** para organización avanzada, diagnósticos guiados y automatización con consumo de IA controlado. Preparar la arquitectura para colaboración, pero habilitarla comercialmente cuando estén probados el vault compartido, la revocación y la sincronización.

## 2. Alcance y límites de la evaluación

Se revisaron estructura, frontends, shell Windows, inventario, sesiones, IA, monitoreo, informes, organizaciones y licencias. Se recorrieron el acceso real y la copia visual con datos de ejemplo: workspace, alta de servidor, informes, administración, perfil y documentación. Ajustes y conexiones se contrastaron también con el código.

La copia visual acredita presentación y navegación, no operaciones remotas. No se verificaron SSH/RDP contra servidores reales, PostgreSQL, Docker, pagos ni disposición a pagar. Las 63 pruebas de la reparación anterior cubren escenarios concretos; no constituyen una auditoría completa del producto.

Este trabajo propone la siguiente etapa; no modifica el código de producción ni activa campañas, cobros o despliegues.

## 3. Hallazgos de interfaz y funcionamiento

| Área | Estado observado | Refactorización propuesta |
|---|---|---|
| Acceso | La cuenta es el camino principal; falta onboarding local | Elegir trabajo local o conexión a organización; primera conexión guiada |
| Inicio | Centro vacío “Project Cockpit”; IA ocupa espacio sin contexto | Recientes, favoritos y tareas; inspector IA contextual y plegable |
| Navegación | Grandes ventanas superpuestas para las áreas principales | Rutas estables; detalles en panel lateral; diálogos para acciones breves |
| Identidad | Usuario fijo en la barra superior y datos distintos en perfil | Contexto único de sesión, rol, organización y capacidades |
| Inventario | Explorador, dashboard y administración tienen caminos duplicados | Una funcionalidad compartida: tabla/lista, filtros, etiquetas y formulario único |
| Alta | Campos SSH incluso para Windows; “ruta” de clave mezclada con PEM | Protocolo, puerto y credencial explícitos; prueba de conexión y guardado separados |
| Sesiones | Varios caminos y componentes heredados | Registro único de sesiones y estados; reconexión, divisiones y cierre consistente |
| Archivos | Panel SFTP deshabilitado en la terminal | Transferencias reales con progreso, cancelación e integridad |
| IA | Sin contexto devuelve un mensaje fijo; “ejecutar” copia al portapapeles | Separar explicar, recopilar, proponer y ejecutar; acción y resultado visibles |
| Informes | UI/backend de programación y PDF; aparece también en administración | Una sección de automatizaciones con historial de ejecuciones |
| Ajustes | Botones de tema/idioma sin manejadores en esa vista | Preferencias persistentes, inmediatas y coherentes |
| Administración | Muchas pestañas, incluidas opciones “Frontend/Backend” | Separar equipo, proveedores, políticas y facturación; opciones internas fuera del flujo diario |
| Documentación | Texto incrustado describe flujos que no coinciden con la navegación | Ayuda contextual versionada, separada de la documentación del cliente |
| Comercial | Plan solicitado por formulario y licencias con contadores globales | Suscripción, asientos, derechos y consumo verificados por cuenta/organización |

Evidencia: [barra superior](../frontend-desktop-ui/src/components/layout/TopBar.tsx), [navegación superpuesta](../frontend-desktop-ui/src/components/layout/OverlayContainer.tsx), [workspace](../frontend-desktop-ui/src/components/layout/WorkspaceArea.tsx), [formulario](../frontend-desktop-ui/src/components/servers/ServerFormDialog.tsx), [terminal](../frontend-desktop-ui/src/components/terminal.tsx), [asistente](../frontend-desktop-ui/src/components/ai/AIChatPanel.tsx), [ajustes](../frontend-desktop-ui/src/components/views/SettingsView.tsx), [documentación](../frontend-desktop-ui/src/components/views/DocsView.tsx) y [administración](../frontend-desktop-ui/src/components/views/AdminView.tsx).

### Bloqueos nuevos antes de comercializar

1. **Acceso en monitoreo/archivos:** [monitoring.py](../backend/routers/monitoring.py) obtiene el servidor por ID y descifra credenciales sin aplicar la política común de acceso. Incorporar ambas rutas a las pruebas entre organizaciones.
2. **Rutas interpoladas en shell:** el listado construye `ls` con validación parcial. Las comillas dobles no neutralizan todas las expansiones. Reemplazar por SFTP y probar nombres adversariales como datos.
3. **Salud desconocida representada como cero:** los fallos de parseo de monitoreo pueden devolver ceros. Distinguir desconocido, desactualizado, sin permisos y cero real.
4. **Derechos comerciales incompletos:** [el registro](../backend/routers/organizations.py) toma el plan del formulario; eso no debe conceder prestaciones pagas. [La licencia](../backend/services/license_service.py) cuenta recursos globalmente y [su activación](../backend/routers/license.py) no equivale a facturación integrada.
5. **IA simulada sin proveedor:** [el servicio](../backend/services/ai_service.py) puede usar un modo mock. Una release comercial debe indicar proveedor no configurado; las simulaciones requieren un modo demo explícito.
6. **Auditoría ampliada:** extender autorización y pruebas a informes, descargas, invitaciones, organizaciones y secretos; añadir controles de abuso, revocación y pruebas reales de PostgreSQL.

Estos hallazgos amplían la revisión anterior y **siguen pendientes**. El producto no debe anunciarse como listo para producción por compilar y superar la suite existente.

## 4. Experiencia de producto propuesta

### Navegación

Barra superior con workspace/cliente, entorno y usuario real. Áreas principales: **Conexiones, Sesiones, Casos y Automatizaciones**. Actividad, equipo, preferencias y plan como áreas secundarias, adaptadas al rol y al dispositivo.

Cada conexión presenta resumen, credencial, terminal/escritorio remoto, archivos y actividad. El inspector de IA utiliza contexto seleccionado explícitamente. Cambiar de cliente limpia selección y aprobaciones anteriores; no mezcla conversaciones, credenciales ni resultados.

El sistema operativo puede sugerir un protocolo; el usuario elige SSH, RDP u otra capacidad disponible. PowerShell/WinRM para diagnóstico Windows es desarrollo futuro, no una capacidad que deba asumirse por existir RDP.

### Recorridos prioritarios

**Primera conexión Free:** instalar → elegir local → agregar/importar → elegir credencial → verificar identidad → conectar → guardar favorito. La cuenta comercial y la IA son opcionales. Objetivo de usabilidad a probar: completar el recorrido en menos de diez minutos con datos válidos.

**Incidente Pro:** seleccionar cliente/servidor → describir problema → revisar contexto a compartir → aprobar consultas → inspeccionar evidencias → revisar propuesta → autorizar acción concreta → verificar resultado → guardar caso/runbook.

**Operación MSP:** elegir cliente → abrir recientes → ejecutar runbook parametrizado en un destino de prueba → verificar → ampliar a un lote aprobado → exportar resumen. Una consulta o aprobación nunca se reutiliza silenciosamente en otro cliente.

### Criterios de diseño

- Tokens compartidos de color, densidad, espaciado y tipografía; tema claro/oscuro reales.
- Contraste y teclado comprobados; foco visible y acciones esenciales disponibles sin hover.
- Estados claros de carga, vacío, error, desconexión y capacidad no disponible.
- Formularios con validación por campo, protocolo/puerto y referencia a credencial; evitar copiar secretos entre formularios.
- Ningún botón promete ejecutar si solo copia; ningún éxito aparece antes de comprobar una condición relevante.
- Restaurar pestañas no reconecta automáticamente con privilegios. Cerrar una sesión activa muestra impacto.
- Vocabulario consistente para conexión, credencial, sesión, cliente, organización, caso y ejecución.

## 5. Arquitectura de destino

### Migración gradual

Mantener un **monolito modular FastAPI** y el shell Windows durante el primer lanzamiento. Extraer y sustituir flujos por módulos con contratos y pruebas. La estructura propuesta es futura; renombrar carpetas no debe ser el primer trabajo.

```text
apps/
  web/                 # Shell web, rutas y acceso a organizaciones
  desktop-ui/          # Shell Vite para escritorio
  windows/             # WPF/WebView2 y servicios nativos
packages/
  ui/                  # Tokens y componentes accesibles
  features/            # Conexiones, sesiones, casos, automatización
  api-client/          # Cliente/tipos generados desde OpenAPI
  platform/            # Capacidades y protocolo de bridge
backend/
  app/
    identity/ inventory/ sessions/ automation/
    diagnostics/ ai/ billing/ audit/
  migrations/
  tests/
```

### Frontend

Compartir pantallas de dominio, formularios, validación y políticas entre web y escritorio. Next.js conserva las rutas y funciones web necesarias; Vite empaqueta el mismo núcleo funcional para escritorio. Usar adaptadores de navegación/capacidades en lugar de duplicar lógica.

Generar cliente y tipos desde OpenAPI. Centralizar autenticación, errores y configuración de URL. Separar caché/datos remotos del estado de UI; Zustand puede seguir gestionando pestañas y paneles. Reducir `any`, cadenas de roles dispersas y llamadas `fetch` independientes por componente.

### Windows, credenciales y sesiones

Dividir [MainWindow.xaml.cs](../apps/windows/MainWindow.xaml.cs) en host WebView, dispatcher, administrador SSH, host RDP, proxy y almacén seguro. Interfaces de capacidad: `CredentialStore`, `SessionTransport`, `FileTransfer`, `ExecutionRunner` y `EntitlementProvider`.

El bridge necesita versión de protocolo, validación, IDs de solicitud/sesión, cancelación, timeout y límites de tamaño. Las sesiones tienen estados explícitos y pruebas de foco, DPI, reconexión, cierre y recuperación.

Free local: SQLite para metadatos y almacén de secretos del sistema operativo. **SQLite por sí solo no cifra la base.** DPAPI protege secretos locales Windows, pero su cifrado no es un formato de sincronización entre equipos. Diseñar exportación cifrada portable y recuperación verificable.

La sincronización agrega conflictos, borrados, dispositivos perdidos y gestión de claves. No anunciar “zero knowledge” si un servicio necesita descifrar credenciales para ejecutar. Documentar por separado confianza local, gateway y ejecución gestionada.

### Backend y trabajos

Una capa común aplica autorización antes de leer recursos o usar secretos, también en importaciones y tareas. RLS de PostgreSQL puede agregarse como defensa adicional con identidades y pruebas apropiadas; no reemplaza la autorización de aplicación.

Cuotas y reservas de presupuesto atómicas, idempotencia y trabajos persistentes. Tareas largas en workers con límites de tiempo, privilegios y concurrencia. APScheduler puede comenzar con un scheduler controlado; varias réplicas requieren liderazgo/bloqueos para no duplicar ejecuciones.

Proveedores IA configurados por cuenta/organización, con registro de capacidades, salud y versiones. Separar modelos de conversación y embeddings; dimensionar y versionar índices sin asumir vectores de 1536 dimensiones para todos los proveedores.

### Soporte de plataforma

La política oficial consultada fija fin de soporte de **.NET 8 el 10/11/2026** y mantiene **.NET 10 LTS hasta noviembre de 2028**. Planificar .NET 10 antes de vender una release mantenida. La reparación actual en .NET 8 es una base de transición. [Fuente Microsoft](https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core).

La propuesta original evaluó Next.js 14.2.3; la revisión actual migró la interfaz web independiente a Next.js 16.4.6/React 19. La política consultada lista 14.x sin soporte y 16.x como Active LTS. Migrar a una rama soportada y probar auth/renderizado por separado del rediseño completo. [Fuente Next.js](https://nextjs.org/support-policy).

## 6. IA avanzada y ejecución controlada

Pro debe aportar diagnósticos guiados, contexto de varias fuentes, evidencias fechadas, propuestas revisables, postchecks y casos reutilizables. El valor no se reduce a usar un modelo más caro.

```text
Solicitud → contexto autorizado → consultas → evidencias → propuesta
→ revisión de riesgo → aprobación específica → ejecución limitada
→ comprobación posterior → caso y auditoría
```

La aprobación se vincula a usuario, organización, destinos, operación normalizada, versión, caducidad y un identificador de un solo uso. El servidor revalida permisos y presupuesto al ejecutar. Modificar el destino o el plan invalida la aprobación.

Logs y archivos remotos son datos no confiables: pueden contener instrucciones maliciosas para el modelo. El modelo solicita herramientas estructuradas a un motor de políticas; no recibe acceso directo a SSH ni secretos. Clasificar comandos por regex no garantiza seguridad. Incluso una lectura puede exfiltrar información o tener impacto.

Mostrar comando/diff, destinos, privilegios, impacto esperado y condiciones de detención. No existe rollback universal para shell: señalar las acciones sin recuperación fiable y bloquearlas según política.

Controles de IA:

- Selección/consentimiento del contexto y redacción de secretos, también en auditoría y exportaciones.
- Retención configurable y condiciones de proveedor comprobadas; no prometer retención cero o exclusión de entrenamiento sin respaldo contractual/configuración.
- Presupuesto por solicitud, usuario y organización; reservas concurrentes, límites de tokens/tiempo y circuit breaker.
- BYOK y routing por tarea. BYOK significa que el cliente utiliza su clave y paga la inferencia a su proveedor.
- Evaluaciones con incidentes de laboratorio, incluyendo inyección desde logs, propuestas peligrosas, fallos de herramientas y exposición de secretos.
- Indicadores de evidencia correcta y verificación final, además de satisfacción del chat.

## 7. Comparativa de mercado

Precios y características de páginas oficiales consultadas el 24/10/2026. No se verificaron compras. Alcances y formas de facturación difieren.

| Producto | Oferta verificada | Lección para el producto |
|---|---|---|
| [Termius](https://termius.com/) | SSH, vault, SFTP, snippets, port forwarding y plataformas de escritorio/móvil. No se pudo verificar de forma fiable la tabla de precios | Conexiones y credenciales deben sentirse rápidas y coherentes; no inventar comparativas de precio |
| [MobaXterm](https://mobaxterm.mobatek.net/download.html) | Home gratis: 12 sesiones guardadas, 2 túneles y 4 macros. Pro publicado desde US$69/usuario, uso perpetuo y 12 meses de actualizaciones, sin impuestos | Una suscripción debe justificar valor recurrente frente a herramientas completas y económicas |
| [Devolutions RDM](https://devolutions.net/remote-desktop-manager/) | Free individual incluso comercial; vault compartido para colaboración. Ya anuncia asistente IA y MCP. Precio comparable no verificado | “SSH/RDP con IA” no es exclusivo; diferenciar el recorrido, facilidad y resultados |
| [Warp](https://www.warp.dev/pricing) | Free; Build mensual US$20 con US$20 de consumo de agente incluido según la página; Business mensual US$50/usuario | Transparencia de consumo y límites de gasto son parte de la experiencia |
| [Teleport](https://goteleport.com/docs/feature-matrix/) | Acceso/identidad, gobierno y trazabilidad; enterprise con precio a consultar | Referencia de controles; no vender equivalencia de seguridad empresarial antes de validarla |
| [RustDesk](https://rustdesk.com/pricing/) | Control remoto y servidor autohospedado Free; Pro Individual US$11,88/mes facturado anualmente, 1 usuario y 20 dispositivos | Referencia de distribución propia; soporte remoto es un trabajo adyacente, no idéntico al diagnóstico |

Los precios de licencias autohospedadas no incluyen necesariamente infraestructura; no equivalen al coste total de SaaS. Español ayuda a la adopción, pero competidores también ofrecen localizaciones.

**Diferencia a validar:** un caso operacional por cliente que reúna contexto, evidencias, acción aprobada y comprobación final, dentro de la conexión habitual del técnico. Empezar con dos problemas frecuentes, medir ahorro frente al método actual y registrar también dónde la IA no ayuda.

## 8. Ediciones y precios propuestos

| Prestación futura | Free | Pro |
|---|---|---|
| Uso individual personal/comercial | Permanente, local | Sí |
| Cuenta obligatoria para conectar localmente | No | Cuenta para servicios comerciales |
| Conexiones guardadas/sesiones locales | Sin límite artificial inicial | Sí |
| SSH, RDP Windows, SFTP | Sí, tras estabilización | Sí |
| Seguridad básica, exportación y recuperación | Completas | Completas |
| Snippets y organización básica | Sí | Sí |
| IA básica con clave propia | Explicar comando/texto seleccionado | Sí |
| Diagnóstico guiado, casos y postchecks | No inicialmente | Sí |
| Runbooks parametrizados y automatización | Manual básico | Sí; lotes después de validar políticas |
| IA alojada | Ensayo opcional acotado | Presupuesto incluido + recargas opcionales |
| Workspaces avanzados de clientes | Básicos locales | Sí |
| Sync/backup gestionado | No | Cuando recuperación y conflictos estén probados |
| Colaboración de equipo | No | Modalidad posterior con asientos, permisos y vault compartido |

Hipótesis de lanzamiento: **US$19 por técnico/mes o US$190/año**, antes de impuestos aplicables. Validar sensibilidad entre US$12 y US$29 con usuarios objetivo. No es una tarifa validada ni una proyección de ventas.

Free no caduca; una prueba Pro de 14 días es otro estado. Al vencer Pro se mantienen datos, exportación y acceso local Free. No interrumpir sesiones activas por fallo de licenciamiento. Pausar futuras funciones premium con mensajes claros, sin eliminar datos.

Derechos locales mediante licencias firmadas y caché con tolerancia offline. En SaaS, suscripción/asientos/derechos/presupuesto son entidades distintas verificadas en servidor. Un plan enviado por el navegador nunca habilita acceso. Webhooks autenticados e idempotentes, conciliación y pruebas de eventos repetidos o fuera de orden.

Antes de integrar pagos: confirmar país y entidad vendedora, disponibilidad del proveedor, moneda, impuestos y soporte de renovaciones/reembolsos. No dar por disponible un procesador a partir de la ubicación del usuario.

[La licencia actual](../LICENSE) contiene `[Your Company Name]` y prueba de 30 días; el código genera 180 días. Unificar titular, términos Free/Pro y revisión de redistribución/dependencias antes de vender. Es un pendiente comercial que requiere revisión especializada, no un dictamen legal de este documento.

## 9. Economía de IA

No ofrecer inferencia avanzada ilimitada a precio fijo. Presupuesto interno inicial propuesto: **hasta US$2 de coste de inferencia por asiento/mes**, ajustable con mediciones. Mostrar consumo/previsión, cortes de gasto y condiciones de recarga. BYOK permite continuar pagando al proveedor directamente.

Ejemplo del plan mensual: todos los costes son **supuestos**, no tarifas verificadas.

| Concepto por asiento/mes | Supuesto |
|---|---:|
| Ingreso | US$19,00 |
| Cobro/fricción de pago | US$0,90 |
| Infraestructura/almacenamiento | US$1,50 |
| Soporte variable | US$1,00 |
| Inferencia incluida | US$2,00 |
| Contribución antes de costes fijos/adquisición | US$13,60: 71,6% |

Con inferencia promedio de US$6, la contribución cae a US$9,60: 50,5%. El plan anual tiene menor ingreso mensual equivalente y necesita un cálculo propio; no conserva automáticamente el 71,6%.

Con costes fijos hipotéticos de US$4.000/mes y contribución de US$13,60, se necesitarían aproximadamente 295 asientos mensuales para cubrirlos, antes de adquisición, impuestos y variación de costes. **No es una previsión de ventas.** Medir percentiles de coste por caso, abuso, almacenamiento y asistencia necesaria, además de promedios.

## 10. Estrategia comercial

### Descubrimiento y piloto

Entrevistar a 10–15 técnicos/MSP de 1–10 operadores: último incidente, frecuencia, herramientas actuales, importación, privacidad y quién autoriza compras. Validar problemas antes de listas de funciones.

Cinco pilotos con tareas repetibles de laboratorio. Tres participantes que repitan semanalmente y acepten pagar serían una señal inicial, no prueba de product-market fit. Dos demostraciones: disco/servicio Linux y, cuando exista su runner, servicio/eventos Windows. Medir tiempo, errores y evidencia frente al método habitual.

### Adquisición y conversión

1. Free mediante instalador firmado, release notes, documentación breve y modo local sin registro.
2. Importadores OpenSSH/CSV y luego formatos demandados; vista previa de conflictos antes de importar secretos.
3. Contenido técnico en español/inglés con casos de laboratorio, aprobación y postcheck. Nunca publicar logs de clientes.
4. Comunidades, formación e integradores pequeños; participación útil, sin campañas ejecutadas desde este plan.
5. Prueba Pro contextual al intentar diagnóstico/runbooks; precio y consumo visibles. Email opt-in y anuncios pagos después de comprobar retención y coste de adquisición.

No limitar exportación, recuperación o seguridad esencial para forzar pago. Publicar soporte, privacidad, proceso de vulnerabilidades, changelog y limitaciones reales. No anunciar certificaciones o autonomía segura inexistentes.

### Métricas de experimento

Activación: primera conexión; retención: segundo uso y técnicos activos semanales; valor: casos con evidencia y postcheck; negocio: conversión, cancelación, coste de IA/soporte por asiento. Telemetría opcional y agregada, sin IPs, comandos ni secretos por defecto. Ausencia de telemetría no equivale a inactividad.

Objetivos iniciales a validar, no benchmarks: éxito en 95% de escenarios soportados con datos válidos; activación de 50% del piloto; retención D7 de 30%; conversión de 3% de activos elegibles a 30 días. Con muestras pequeñas priman entrevistas, tareas completas y repetición. No aumentar adquisición si el producto requiere asistencia manual constante o no retiene usuarios.

## 11. Hoja de ruta

Estimación orientativa: **20 semanas con dos desarrolladores a tiempo completo, UX parcial y revisión de seguridad**. Un desarrollador podría necesitar 6–9 meses para alcance comparable. Las integraciones y criterios de salida gobiernan las fechas; sincronización y equipos pueden ampliar el plazo.

| Fase | Ventana | Criterio de salida |
|---|---|---|
| Seguridad/contratos | Semanas 1–2 | Todas las rutas inventariadas; aislamiento de monitoreo/archivos; plan de runtimes y arquitectura aprobado |
| Núcleo UX compartido | Semanas 3–6 | Usuario/workspace reales; navegación y formulario únicos; cliente API y recorridos automatizados |
| Free local | Semanas 7–10 | Vault/recuperación, SSH/RDP/SFTP reales, importación y exportación; instalador firmado y actualización reversible |
| Diagnóstico Pro | Semanas 11–14 | Contexto consentido, herramientas/políticas, aprobaciones y postchecks; incidentes de laboratorio y coste medido |
| Pago/pilotos | Semanas 15–18 | Derechos y presupuestos por cuenta; webhooks/trial/degradación; pilotos pagos y soporte |
| Lanzamiento condicionado | Semanas 19–20 | Cierre de bloqueos; Windows/Linux/PostgreSQL reales; restauración y cobros probados; términos revisados |

Descubrimiento comercial y usabilidad comienzan en la primera semana, no al terminar el desarrollo.

### Backlog inicial

| ID | Prioridad | Trabajo y aceptación |
|---|---|---|
| SEC-01 | P0 | Monitoreo/archivos autorizados: un tenant ajeno no obtiene datos ni provoca conexiones |
| SEC-02 | P0 | SFTP: espacios, comillas, Unicode y `$()` se tratan como datos |
| SEC-03 | P0 | Matriz de todo el API: anónimo, inactivo, propio, grupo, ajeno, admin y global |
| REL-01 | P0 | Runtimes soportados y build/instalación desde checkout limpio sin pérdida de datos |
| UX-01 | P1 | Barra, perfil, permisos y API comparten identidad/workspace |
| UX-02 | P1 | Navegación/formulario compartidos; deep links, volver y teclado funcionan |
| UX-03 | P1 | Preferencias persistentes y estados desconocidos honestos |
| LOC-01 | P1 | Secretos fuera de logs/SQLite plano; exportación/restauración cifrada probada |
| SES-01 | P1 | Reconectar/cancelar/cerrar no deja sesiones o handlers huérfanos |
| SES-02 | P1 | RDP DPI/foco/cierre y SFTP cancelación/integridad en pruebas reales |
| AI-01 | P1 | Sin proveedor se informa indisponibilidad; no diagnóstico simulado implícito |
| AI-02 | P1 | Cambiar destino/acción/caducidad invalida aprobación; políticas no eludibles por el modelo |
| AI-03 | P1 | Reservas concurrentes de presupuesto y evaluación de incidentes/secretos |
| BILL-01 | P1 | Cambiar el plan en el cliente no desbloquea funciones; downgrade preserva datos/sesiones |
| BILL-02 | P1 | Eventos duplicados/fuera de orden, reembolso e impago no duplican saldo/asientos |
| OPS-01 | P1 | Reinicios de workers no duplican trabajos ni pierden resultados |
| GTM-01 | P1 | Cinco pilotos con repetición y disposición de pago documentada |
| TEAM-01 | P2 | Vault/sync: conflictos, revocación y separación entre clientes probados |
| INT-01 | P2 | Alertas/tickets crean casos sin secretos ni ejecución implícita |
| FUT-01 | P3 | Otros sistemas operativos/protocolos basados en demanda y coste de mantenimiento |

P0 bloquea publicación comercial; P1 construye el primer producto vendible. P2/P3 no son promesas incluidas en el precio inicial.

## 12. Decisiones pendientes

Confirmar público principal, dos problemas iniciales, Windows primero, presupuesto/capacidad del equipo, país de la entidad vendedora, política de datos/IA y prioridad de Pro individual frente a colaboración MSP.

La primera implementación recomendada es **SEC-01 a SEC-03 y UX-01/UX-02**: autorización completa, contexto correcto y navegación compartida. El concepto visual acompaña la discusión de estos recorridos; no sustituye sus criterios técnicos.

## 13. Dirección acordada: conexiones locales e IA privada

**Actualización: 25 de octubre de 2026.** Esta sección prevalece sobre las hipótesis anteriores que entren en conflicto. Registra requisitos; no describe funciones ya implementadas.

- La experiencia principal es un cliente de escritorio fluido con árbol de carpetas anidadas, servidores SSH/RDP, búsqueda y sesiones en pestañas. Las carpetas pueden representar clientes, sedes o grupos de servidores.
- Las conexiones locales se originan en el equipo del técnico. El inventario local y las funciones esenciales no dependen de un servidor nuestro. Enterprise añade espacios administrados, portal web, incorporación de clientes y gateway opcional; puede coexistir con espacios locales y acceso directo por VPN.
- La IA es una capacidad central en todas las ediciones: comprender evidencia, guiar diagnósticos, preparar acciones revisables y comprobar resultados. Free permite configurar proveedores compatibles mediante una clave de API propia. Pro mejora los procedimientos y la automatización; Enterprise añade políticas y administración. La protección de datos es común a todas las ediciones.

### Dos modos explícitos de privacidad

**Local estricto:** inferencia en el equipo del técnico o en un servicio privado autorizado por la empresa. Un servicio privado en otro equipo no es «inferencia en este equipo». El modo estricto no permite destinos públicos de inferencia ni cambia automáticamente a un proveedor cloud si el motor local falla. La disponibilidad y calidad dependen del modelo y del hardware.

**API externa con contexto mínimo:** el cliente llama directamente al proveedor configurado, sin pasar por nuestra nube. Esto sí envía contenido a un tercero y nunca debe etiquetarse como completamente local. Por defecto no se adjuntan salidas de terminal, archivos, inventario ni transcripciones; el usuario puede utilizar consultas genéricas. Para diagnóstico contextual externo, un proceso local genera únicamente hechos permitidos y abstraídos, muestra el contenido exacto y solicita autorización antes del envío. Si no puede construir un contexto permitido, bloquea el envío y ofrece inferencia local.

No se envían credenciales de infraestructura, claves privadas, tokens, archivos de configuración, identificadores reales de clientes/hosts, direcciones internas ni registros crudos. La clave del proveedor constituye una excepción necesaria: se transmite únicamente al proveedor elegido para autenticar su API, con TLS y sin registrarla. Un análisis con anonimización no garantiza ausencia total de información sensible; se debe minimizar el contenido por esquema permitido, bloquear campos desconocidos y evaluar posibles filtraciones. Los textos introducidos por el usuario también requieren revisión.

### Frontera local de confianza

1. Un ejecutor local recoge evidencia mediante herramientas acotadas, con límites de tiempo, salida y permisos.
2. La evidencia original permanece local, protegida y con retención configurable. No se incorpora a telemetría, registros de errores externos ni historiales cloud.
3. Un constructor de contexto local aplica una lista de campos permitidos, elimina secretos y sustituye identificadores por alias. El mapa entre alias y recursos reales permanece local.
4. La política de salida se aplica a cada petición, incluidos reintentos, herramientas, adjuntos, embeddings y respuestas intermedias. El texto remoto se trata como datos no confiables.
5. El modelo devuelve una propuesta estructurada. No recibe acceso directo a SSH/RDP, al vault ni al sistema de archivos. La aplicación valida herramientas, parámetros y destinos; la aprobación queda vinculada a la acción concreta antes de ejecutarla localmente.
6. Se comprueba el resultado con evidencia local. El proveedor no puede provocar nuevas salidas de datos ni ampliar permisos mediante instrucciones en su respuesta.

Las claves se guardan en el almacén seguro del sistema operativo, fuera del inventario exportable y de la configuración de interfaz. Las API de proveedores, sus capacidades y sus condiciones se validarán al implementar cada adaptador. No se promete compatibilidad universal ni se asume retención cero por usar una clave propia.

### Criterios obligatorios antes del lanzamiento

- Pruebas de tráfico demuestran que el modo local estricto no realiza solicitudes a proveedores públicos, tampoco ante fallos o reintentos.
- Pruebas de secretos sintéticos verifican que credenciales, identificadores y evidencia cruda no aparecen en peticiones externas, telemetría, errores o exportaciones.
- El usuario puede inspeccionar el contexto externo; cambiarlo invalida la autorización anterior. Cada espacio muestra el modo de privacidad activo y Enterprise puede bloquear proveedores externos por política.
- El gateway Enterprise es un transporte de sesiones autorizado, no un proveedor cloud de contexto. Compartir evidencia con el servidor de la empresa requiere una política explícita separada.
- La aceptación incluye una evaluación adversarial de filtración y de instrucciones maliciosas en logs; redactar con expresiones regulares por sí solo no satisface este requisito.

## 14. Decisión actualizada: IA cloud con aceptación informada

**25 de octubre de 2026, aclaración del usuario.** Esta decisión sustituye las restricciones de la sección 13 que impedían enviar contexto real de infraestructura o exigían aprobar cada petición cloud. Se mantiene la arquitectura de conexiones locales y la IA como función central. Es una especificación pendiente de implementación.

### Configuración y consentimiento

El usuario puede conectar un proveedor de IA mediante su propia clave API. Se permite enviar contexto real relevante de infraestructura —incluidos nombres de equipos, direcciones, comandos, salidas y fragmentos seleccionados— tras aceptar expresamente el aviso al configurar la conexión cloud, antes del primer envío. No es necesario interrumpir cada turno con una nueva confirmación dentro del alcance aceptado.

El asistente utiliza el contexto de la sesión o los recursos seleccionados, no recopila indiscriminadamente todos los clientes o archivos. La interfaz muestra proveedor, modelo y alcance del contexto, y permite consultar lo enviado, desconectar y retirar la autorización para futuros envíos. Cambiar de proveedor o ampliar materialmente el alcance requiere nueva aceptación. Enterprise puede restringir esta configuración según la política de la empresa.

El consentimiento se registra con versión del aviso, fecha, proveedor y alcance; la casilla no viene marcada. Instalar el cliente sin configurar IA cloud no debe forzar esa autorización. La retirada detiene nuevos envíos; no garantiza borrar datos ya recibidos por el proveedor. Las condiciones de tratamiento y retención dependen del proveedor y del servicio contratado.

**Texto inicial propuesto para la configuración:**

> Al activar la IA en la nube, autorizo el envío al proveedor seleccionado del contexto utilizado por el asistente, que puede incluir nombres y direcciones de servidores, comandos, registros y otra información sensible de infraestructura. Confirmo que tengo autorización para compartir estos datos. Entiendo que su tratamiento y retención dependen de las condiciones del proveedor y que el uso de su API puede generar cargos en mi cuenta. Puedo desactivar la integración para detener futuros envíos.

Acción afirmativa: **«Acepto y habilitar IA en la nube»**. Alternativas: **«Usar IA local»** o **«Configurar después»**. Este es texto de producto inicial, no una garantía de cumplimiento legal.

La aceptación no convierte el tráfico en local ni sustituye la autorización de la empresa propietaria de los datos. Se conservan protecciones prácticas: claves en el almacén seguro del sistema, TLS, exclusión de secretos del vault y credenciales de autenticación del contexto, filtrado de secretos evidentes en salidas y ausencia de credenciales en telemetría. No se promete detección perfecta de secretos en texto libre.

### Conexión oficial de cuentas

La clave API es el mecanismo base. Se añadirá inicio de sesión en el navegador únicamente cuando el proveedor ofrezca un flujo oficial permitido para aplicaciones de terceros con acceso a la inferencia requerida. No se reutilizan cookies ni tokens extraídos de aplicaciones ajenas. Autenticar una cuenta no implica que su suscripción de chat incluya uso de API.

Verificación documental inicial:

- [Gemini documenta autenticación OAuth para su API](https://ai.google.dev/gemini-api/docs/oauth), con proyecto y configuración de autorización. La experiencia de producción y los permisos/verificaciones necesarios deben validarse antes de prometer el botón de conexión.
- [Anthropic indica que los productos construidos para terceros deben utilizar claves API de Claude Console o un proveedor cloud compatible](https://support.claude.com/en/articles/13189465-log-in-to-your-claude-account). No se promete inicio de sesión con una suscripción Claude para nuestra app.
- Otros proveedores se evaluarán individualmente con sus interfaces oficiales antes de implementar sus adaptadores.

### Criterios de aceptación revisados

No se envía contexto cloud antes de la aceptación; la revocación bloquea nuevas solicitudes y reintentos pendientes. La autorización de compartir contexto y la aprobación de ejecutar comandos son independientes: consentir el uso de IA no permite ejecutar cambios arbitrarios. El modo local estricto continúa disponible sin fallback automático a cloud. Las pruebas cubren consentimiento, aislamiento de sesiones/clientes, exclusión de credenciales y retirada de autorización.
