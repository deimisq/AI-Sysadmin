[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Add-Type -AssemblyName System.Drawing
$source = Join-Path $root 'assets/brand/ai-sysadmin-icon-v1.png'
$native = Join-Path $root 'apps/windows/Assets'
$web = Join-Path $root 'frontend-desktop-ui/public/brand'
New-Item -ItemType Directory -Force -Path $native,$web | Out-Null
Copy-Item -LiteralPath $source -Destination (Join-Path $web 'icon.png')
Copy-Item -LiteralPath (Join-Path $root 'assets/brand/ai-sysadmin-logo-v1.png') -Destination (Join-Path $web 'logo.png')
Copy-Item -LiteralPath (Join-Path $web 'logo.png') -Destination (Join-Path $native 'logo.png')
$image = [Drawing.Image]::FromFile($source)
try {
    $frames = foreach ($size in @(16,24,32,48,64,128,256)) {
        $bitmap = [Drawing.Bitmap]::new($size,$size)
        $graphics = [Drawing.Graphics]::FromImage($bitmap)
        $stream = [IO.MemoryStream]::new()
        try {
            $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $graphics.DrawImage($image,0,0,$size,$size)
            $bitmap.Save($stream,[Drawing.Imaging.ImageFormat]::Png)
            [pscustomobject]@{ Size = $size; Bytes = $stream.ToArray() }
        } finally { $graphics.Dispose(); $bitmap.Dispose(); $stream.Dispose() }
    }
    $file = [IO.File]::Create((Join-Path $native 'app.ico'))
    $writer = [IO.BinaryWriter]::new($file)
    try {
        $writer.Write([uint16]0); $writer.Write([uint16]1); $writer.Write([uint16]$frames.Count)
        $offset = 6 + 16 * $frames.Count
        foreach ($frame in $frames) {
            $dimension = if ($frame.Size -eq 256) { 0 } else { $frame.Size }
            $writer.Write([byte]$dimension); $writer.Write([byte]$dimension)
            $writer.Write([byte]0); $writer.Write([byte]0)
            $writer.Write([uint16]1); $writer.Write([uint16]32)
            $writer.Write([uint32]$frame.Bytes.Length); $writer.Write([uint32]$offset)
            $offset += $frame.Bytes.Length
        }
        foreach ($frame in $frames) { $writer.Write([byte[]]$frame.Bytes) }
    } finally { $writer.Dispose() }
} finally { $image.Dispose() }
Write-Output 'Identidad preparada: PNG y ICO de 16 a 256 px.'
