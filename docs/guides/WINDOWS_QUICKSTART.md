# 🚀 Quick Start - Windows (5 minutos)

Para usuarios que ya tienen experiencia con desarrollo.

## 📥 Requisitos

1. **Visual Studio Build Tools**: <https://visualstudio.microsoft.com/downloads/>
   - Seleccionar: "Desktop development with C++"

2. **Rust**: <https://rustup.rs/>
   - Ejecutar: `rustup-init.exe` → Opción 1

3. **Node.js**: <https://nodejs.org/> (si no lo tienes)

## ⚡ Comandos

```powershell
# 1. Clonar
git clone https://github.com/sentrait/ai_agent.git
cd ai_agent
git checkout testing

# 2. Instalar
cd frontend
npm install

# 3. Ejecutar
npm run tauri-dev
```

## ⏱️ Tiempos Esperados

- Primera ejecución: ~15 minutos (compila Rust)
- Siguientes: ~30 segundos

## ✅ Resultado

Se abre una ventana nativa de Windows (1400x900) con la aplicación.

## 🐛 Error Común

**"link.exe not found"** → Instalar Visual Studio Build Tools correctamente

---

Ver [WINDOWS_TESTING_GUIDE.md](WINDOWS_TESTING_GUIDE.md) para guía completa.
