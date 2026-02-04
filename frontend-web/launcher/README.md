# Simple Launcher for AI Sysadmin Agent

Este es un ejecutable minimalista (~100KB) que simplemente abre el navegador en `https://testing.sentrait.com.uy`.

## ¿Por qué este enfoque?

Después de varios intentos con Tauri:

- ❌ Iframe bloqueado por X-Frame-Options
- ❌ Rutas relativas de API no funcionan desde tauri://
- ❌ Complejidad innecesaria

**Solución simple:**

- ✅ Abre el navegador predeterminado
- ✅ Todo funciona (es el sitio web normal)
- ✅ Ejecutable pequeño (~100KB)
- ✅ Sin problemas de compatibilidad

## Build

```bash
cd frontend/launcher
cargo build --release
```

El ejecutable estará en `target/release/AI-Sysadmin-Agent.exe`

## Distribuir

Simplemente distribuye el `.exe`. Cuando el usuario lo ejecute:

1. Se abre su navegador predeterminado
2. Carga testing.sentrait.com.uy
3. Listo!

Es lo que hacen muchas "apps" - simplemente shortcuts glorificados.
