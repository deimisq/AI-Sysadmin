# Prueba nativa de Configuración

En Windows, con WebView2 Runtime instalado, compilar primero la interfaz de escritorio y ejecutar desde la raíz del repositorio:

```powershell
dotnet run --project apps/windows.SmokeTests/PreferencesSmoke.csproj -c Release
```

La prueba crea una ventana principal con controlador de composición y abre Configuración compartiendo su entorno WebView2, como la aplicación real. Usa el contenido publicado en `wwwroot` mediante `appassets.local`, sin servidor de desarrollo.

Comprueba la apertura de IA, contexto y registros y copias de seguridad, el cierre y la reapertura sin recrear el navegador, y la limpieza del campo de clave. Usa un perfil nuevo bajo su directorio de compilación, respuestas ficticias y una URL de proveedor no operativa. No accede al inventario ni guarda preferencias del usuario. Cierra las ventanas al terminar y devuelve un código distinto de cero si falla.

Esta prueba reproduce la incompatibilidad entre el controlador de composición principal y el controlador de ventana que antes intentaba usar Configuración (`0x8007139F`), que las pruebas de navegador no detectaban.
