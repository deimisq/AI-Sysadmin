# Script to build RdpHost.exe (The C# Sidecar)
Write-Host "🏗️ Preparing to build RdpHost..." -ForegroundColor Cyan

$srcDir = "$PSScriptRoot\src-rdp"
$binDir = "$PSScriptRoot\binaries"
$interopUrl = "https://github.com/mRemoteNG/mRemoteNG/raw/v1.77.3-dev/mRemoteNG/Resources" 
# Note: Reuse URL logic from before or finding reliable source for standard interops.
# Actually, let's assume we can generate them or download standard ones.

# Ensure directories
if (!(Test-Path $binDir)) { New-Item -ItemType Directory -Force -Path $binDir | Out-Null }

# Setup Compiler
$csc = "$env:WindowsMicrosoft.NET\Framework64\v4.0.30319\csc.exe"
if (!(Test-Path $csc)) {
    $csc = "$env:WindowsMicrosoft.NET\Framework\v4.0.30319\csc.exe"
}

if (!(Test-Path $csc)) {
    Write-Host "❌ C# Compiler (csc.exe) not found!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Found compiler: $csc" -ForegroundColor Green

# We need AxInterop.MSTSCLib.dll and Interop.MSTSCLib.dll
# Start simpler: Try to find aximp to generate them from mstscax.dll
$mstscax = "$env:SystemRoot\System32\mstscax.dll"
$aximp = Get-ChildItem -Path "C:\Program Files (x86)\Microsoft SDKs" -Recurse -Filter "aximp.exe" -ErrorAction SilentlyContinue | Select-Object -First 1

if ($aximp) {
    Write-Host "Generating Interop DLLs using aximp..." -ForegroundColor Yellow
    & $aximp.FullName $mstscax /out:"$srcDir\AxMSTSCLib.dll" /source
    # This usually generates both
} else {
    Write-Host "⚠️ aximp.exe not found (no SDK installed)." -ForegroundColor Yellow
    Write-Host "⬇️ Downloading pre-generated Interop DLLs..." -ForegroundColor Cyan
    
    # Download from a reliable generic source (e.g. a gist or repo that hosts these standard wrappers)
    # Using a known gist raw url for these standard Microsoft wrappers would be ideal.
    # For now, let's use a dummy check or ask user.
    # PRO TIP: We can use PowerShell to compile a small stub that uses dynamic!
    
    # Let's try to download them from mRemoteNG repo (they are small)
    # https://github.com/mRemoteNG/mRemoteNG/blob/v1.77.3-dev/mRemoteNG/References/AxInterop.MSTSCLib.dll?raw=true
    
    try {
        Invoke-WebRequest "https://github.com/mRemoteNG/mRemoteNG/blob/v1.77.3-dev/mRemoteNG/References/AxInterop.MSTSCLib.dll?raw=true" -OutFile "$srcDir\AxInterop.MSTSCLib.dll"
        Invoke-WebRequest "https://github.com/mRemoteNG/mRemoteNG/blob/v1.77.3-dev/mRemoteNG/References/Interop.MSTSCLib.dll?raw=true" -OutFile "$srcDir\Interop.MSTSCLib.dll"
    } catch {
        Write-Host "❌ Failed to download Interop DLLs." -ForegroundColor Red
        exit 1
    }
}

# Compile
Write-Host "🔨 Compiling RdpHost.exe..." -ForegroundColor Cyan
$cmd = "& `"$csc`" /target:winexe /out:`"$binDir\RdpHost.exe`" /reference:`"$srcDir\AxInterop.MSTSCLib.dll`" /reference:`"$srcDir\Interop.MSTSCLib.dll`" `"$srcDir\RdpHost.cs`""
Invoke-Expression $cmd

if (Test-Path "$binDir\RdpHost.exe") {
    # Copy DLLs to bin
    Copy-Item "$srcDir\AxInterop.MSTSCLib.dll" "$binDir\" -Force
    Copy-Item "$srcDir\Interop.MSTSCLib.dll" "$binDir\" -Force
    
    Write-Host ""
    Write-Host "✅ BUILD SUCCESS!" -ForegroundColor Green
    Write-Host "Output: $binDir\RdpHost.exe"
} else {
    Write-Host "❌ Build failed." -ForegroundColor Red
}
