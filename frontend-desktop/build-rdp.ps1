# Script to build RdpHost.exe (Zero Dependency Version)
Write-Host "Compiling RdpHost.exe..." -ForegroundColor Cyan

$srcDir = "$PSScriptRoot\src-rdp"
$binDir = "$PSScriptRoot\binaries"

# Ensure directories
if (!(Test-Path $binDir)) { New-Item -ItemType Directory -Force -Path $binDir | Out-Null }

# Setup Compiler
$cscPaths = @(
    "$env:SystemRoot\Microsoft.NET\Framework64\v4.0.30319\csc.exe",
    "$env:SystemRoot\Microsoft.NET\Framework\v4.0.30319\csc.exe",
    "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe",
    "C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe"
)

$csc = $null
foreach ($path in $cscPaths) {
    if (Test-Path $path) { $csc = $path; break }
}

if (!$csc) {
    Write-Host "C# Compiler (csc.exe) not found!" -ForegroundColor Red
    exit 1
}

Write-Host "Found compiler: $csc" -ForegroundColor Green

# Compile - No references needed! dynamic handles it.
$compilerArgs = @(
    "/target:winexe",
    "/out:$binDir\RdpHost.exe",
    "/reference:System.Windows.Forms.dll",
    "/reference:System.Drawing.dll",
    "/reference:Microsoft.CSharp.dll", 
    "$srcDir\RdpHost.cs"
)

# Reference Microsoft.CSharp.dll is needed for 'dynamic' keyword usage

& $csc $compilerArgs

if (Test-Path "$binDir\RdpHost.exe") {
    Write-Host ""
    Write-Host "BUILD SUCCESS!" -ForegroundColor Green
    Write-Host "Output: $binDir\RdpHost.exe"
} else {
    Write-Host "Build failed." -ForegroundColor Red
}
