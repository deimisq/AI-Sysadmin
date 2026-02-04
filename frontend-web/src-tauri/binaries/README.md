# Backend Binary Directory

This directory contains the backend executable that will be bundled with the Tauri application.

## 📦 How to Place the Backend Executable

### For Windows

1. **Build the backend executable:**

   ```bash
   cd ../../backend
   python build_desktop.py
   ```

2. **Copy the executable here:**

   ```bash
   # From backend/dist/
   copy dist\ai-sysadmin-backend.exe ..\frontend\src-tauri\binaries\ai-sysadmin-backend-x86_64-pc-windows-msvc.exe
   ```

3. **Important:** The filename must match the Tauri naming convention:
   - `ai-sysadmin-backend-x86_64-pc-windows-msvc.exe`

### For Linux

```bash
cp ../../backend/dist/ai-sysadmin-backend ./ai-sysadmin-backend-x86_64-unknown-linux-gnu
```

### For macOS

```bash
cp ../../backend/dist/ai-sysadmin-backend ./ai-sysadmin-backend-x86_64-apple-darwin
```

## 🎯 Tauri Naming Convention

Tauri expects sidecar binaries to follow this pattern:

```
{binary-name}-{arch}-{platform}
```

Examples:

- Windows x64: `ai-sysadmin-backend-x86_64-pc-windows-msvc.exe`
- Linux x64: `ai-sysadmin-backend-x86_64-unknown-linux-gnu`
- macOS x64: `ai-sysadmin-backend-x86_64-apple-darwin`
- macOS ARM: `ai-sysadmin-backend-aarch64-apple-darwin`

## ⚠️ Important Notes

1. **Don't commit the binaries to git** (they're in .gitignore)
2. **Build on target platform** - Cross-compilation is complex with PyInstaller
3. **Test the binary** before bundling - run it manually first
4. **Size matters** - Keep the binary under 200MB if possible

## 🔄 Build Script

You can automate this with a script. See `../../../scripts/prepare-desktop-build.sh` (to be created).

## ✅ Verification

After placing the binary, verify:

```bash
# Windows
dir binaries\ai-sysadmin-backend-x86_64-pc-windows-msvc.exe

# Should show the file with size ~80-150MB
```

Then when you run `npm run tauri-build`, Tauri will:

1. Include this binary in the bundle
2. Extract it at runtime
3. Allow you to spawn it as a sidecar process
