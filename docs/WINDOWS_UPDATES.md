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
4. **Instalar actualización** solicita una segunda aprobación. La app ejecuta el instalador en segundo plano sobre su ubicación registrada, sin cerrar todavía la versión actual ni reiniciar Windows. Durante esa instalación se bloquea el cierre normal de la ventana.
5. Al terminar, aparece **Reiniciar y aplicar**. Una tercera confirmación avisa que se cerrarán las sesiones SSH/RDP. El proceso nuevo se inicia después de salir el antiguo. Se puede seguir usando la versión actual y reiniciar más tarde; si se cierra manualmente, los accesos directos ya apuntan a la nueva versión instalada.

No hay downgrade automático ni instalación silenciosa sin aprobación. Si falla la red, la autenticación, el hash o la instalación se informa el error; la versión actual permanece abierta. Se requiere una instalación registrada coincidente con la instancia en ejecución: el modo portable/de desarrollo no instala sobre la app registrada de otra ubicación.

Los datos permanecen en `%LOCALAPPDATA%/AiSysadmin`. Descargas, token cifrado y registro `install.log` viven en su subcarpeta `Updates`. Los paquetes actuales no están firmados: el hash comprueba correspondencia con el asset de GitHub y no sustituye una firma de código del publicador.

## Verificación

Las pruebas sintéticas [AppUpdateTests.cs](../apps/windows.Tests/AppUpdateTests.cs) comprueban comparación numérica, ausencia de descarga al buscar, hashes, credenciales y redirecciones. El script [test-installer-upgrade.ps1](../scripts/test-installer-upgrade.ps1) usa una app ficticia y AppId aleatorio; `-KeepOldRunning` verifica la instalación antes de aprobar el cierre. No usar el inventario ni la instalación real del usuario como fixture. El acceso al repositorio privado y el reinicio desde una instancia instalada requieren comprobación manual en el equipo de destino.
