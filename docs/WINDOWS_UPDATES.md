# Versiones y actualizaciones de Windows

## Número de versión

La versión visible usa solo tres números: `MAYOR.MENOR.COMPILACIÓN`, por ejemplo `0.11.12`. La línea de desarrollo se define una sola vez en [AiSysadmin.csproj](../apps/windows/AiSysadmin.csproj), actualmente `0.11.0`. El workflow [windows-package.yml](../.github/workflows/windows-package.yml) toma MAYOR y MENOR de esa propiedad y usa `GITHUB_RUN_NUMBER` como COMPILACIÓN. MSBuild deriva los números de ensamblado y archivo del mismo valor; no se editan por separado.

No se añaden sufijos `preview`, `ci`, intento o hash. El commit se conserva como metadato separado y se muestra en Ayuda. Los reintentos usan la misma versión; un release publicado es inmutable. No reiniciar el contador ni recrear el workflow conservando la misma línea MAYOR.MENOR. Al cambiar de línea, aumentar MAYOR o MENOR. El versionado de componentes legacy es independiente.

Los pushes a `testing` publican releases del canal que consulta la app. Otras ramas publican prereleases, que el actualizador integrado ignora. Los releases anteriores `0.10.0-preview.*` se conservan como históricos y no se consideran candidatos. La primera instalación `0.11.N` requiere el instalador habitual porque las versiones anteriores no contienen el actualizador.

## Uso desde la app instalada

La barra inferior muestra la versión actual y avisa de una versión disponible, descarga o reinicio pendiente. **Ayuda → Acerca de AI Sysadmin Agent** muestra versión, commit, arquitectura, runtime, sistema, repositorio y ubicación de datos.

1. Al abrir la app se consulta GitHub; también se puede pulsar **Buscar actualizaciones**. Esta consulta solo lee metadatos.
2. El repositorio es privado. En **Acceso a GitHub privado**, guardar un token fine-grained con acceso solo a `deimisq/AI-Sysadmin` y permiso **Contents: read**. El token se protege con DPAPI de la cuenta Windows; nunca se incorpora al paquete, al backup de conexiones ni al contexto de IA. Puede eliminarse desde ese mismo panel. La clave del proveedor IA no sirve para GitHub.
3. **Descargar** solicita aprobación nativa. La app obtiene el instalador del asset de ese release, verifica tamaño y digest SHA256 publicado por GitHub y no lo ejecuta todavía. El token no se reenvía al almacenamiento de assets después de una redirección.
4. **Instalar actualización** solicita una segunda aprobación y prepara la instalación verificando el archivo. Todavía no ejecuta el instalador ni reemplaza archivos: la app y sus sesiones siguen disponibles.
5. **Reiniciar y aplicar** solicita una tercera aprobación. Después de cerrar las sesiones SSH/RDP y terminar el proceso actual, un auxiliar vuelve a comprobar tamaño/SHA256, ejecuta el instalador en la ruta fija y abre `AiSysadmin.exe` únicamente si la instalación termina correctamente. Se puede seguir trabajando mientras no se apruebe el reinicio. Cerrar manualmente sin aprobar ese paso no aplica la actualización.

No hay downgrade automático ni instalación sin aprobación. Los errores de red, autenticación o verificación anteriores al cierre mantienen la app abierta. Si falla el instalador después del cierre aprobado, el auxiliar muestra el error y deja `install.log` y `install.log.error.txt`; no abre silenciosamente un ejecutable que podría haber quedado sin actualizar. No se reinicia Windows. Se requiere una instalación registrada coincidente con la instancia: el modo portable/de desarrollo no instala sobre la app registrada de otra ubicación.

La instalación usa una única ruta de ejecutable y elimina la carpeta legacy `versions`. La primera migración desde el actualizador antiguo exige ejecutar el nuevo instalador una vez con la app cerrada: ese cliente espera un directorio por versión y no puede aplicar este cambio de estructura. El instalador rechaza su modo incompatible antes de modificar archivos. Las actualizaciones posteriores usan el flujo integrado descrito arriba.

El instalador evita el escaneo de miles de archivos por Restart Manager. Comprueba únicamente las instancias de su propia ruta y pide un cierre normal, con una espera máxima de 20 segundos. Si alguna no sale, muestra un error para cerrarla manualmente y reintentar; no termina procesos por la fuerza ni reemplaza sus archivos mientras siguen abiertos.

Los datos permanecen en `%LOCALAPPDATA%/AiSysadmin`. Descargas, token cifrado y registro `install.log` viven en su subcarpeta `Updates`. El auxiliar elimina el instalador que acaba de aplicar después de iniciar correctamente la app; conserva el registro para diagnóstico. Los paquetes actuales no están firmados: el hash comprueba correspondencia con el asset de GitHub y no sustituye una firma de código del publicador.

## Verificación

Las pruebas sintéticas [AppUpdateTests.cs](../apps/windows.Tests/AppUpdateTests.cs) comprueban versiones, hashes, credenciales, redirecciones y que preparar la instalación no ejecuta el instalador ni cambia archivos. [UpdateRestartScriptTests.cs](../apps/windows.Tests/UpdateRestartScriptTests.cs) valida el transporte de rutas como datos y la sintaxis del auxiliar sin ejecutarlo. El script [test-installer-upgrade.ps1](../scripts/test-installer-upgrade.ps1) usa una app ficticia, registro y anclajes aislados para probar migración, rechazo del modo antiguo, limpieza y actualización sobre la ruta fija; `-KeepOldRunning` simula el período previo a aprobar el cierre. No usar el inventario ni la instalación real del usuario como fixture. El acceso al repositorio privado y el recorrido completo de actualización de una instancia real requieren comprobación manual.
