# Binarios auxiliares de la implementación Tauri anterior

Esta carpeta corresponde a una distribución anterior. El cliente Windows vigente está en [apps/windows](../../../apps/windows) y no requiere un backend auxiliar. Consultar la [guía Windows](../../../docs/WINDOWS_DISTRIBUTION.md).

Tauri usa nombres de binarios auxiliares con el identificador de la plataforma, por ejemplo:

- Windows x64: ai-sysadmin-backend-x86_64-pc-windows-msvc.exe.
- Linux x64: ai-sysadmin-backend-x86_64-unknown-linux-gnu.
- macOS: ai-sysadmin-backend-x86_64-apple-darwin o ai-sysadmin-backend-aarch64-apple-darwin.

No versionar ejecutables en esta carpeta. Generarlos para la plataforma correspondiente, verificar sus dependencias y licencias y probarlos antes de distribuirlos. La presencia de un nombre de archivo en esta guía no significa que exista un binario compilado o una distribución soportada para esa plataforma.

Las instrucciones históricas deben contrastarse con la configuración y scripts reales del componente antes de intentar empaquetarlo. No utilizar estas instrucciones para instalar o actualizar la aplicación WPF vigente.
