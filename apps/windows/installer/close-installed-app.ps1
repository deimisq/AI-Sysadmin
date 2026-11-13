param(
    [Parameter(Mandatory=$true)][string]$InstallRoot,
    [Parameter(Mandatory=$true)][string]$LogPath,
    [ValidateRange(1,60)][int]$TimeoutSeconds=20
)
$ErrorActionPreference='Stop'
try {
    $root=[IO.Path]::GetFullPath($InstallRoot).TrimEnd('\')
    $current=Join-Path $root 'AiSysadmin.exe'
    $legacy=(Join-Path $root 'versions')+'\'
    $owned=@()
    foreach($process in [Diagnostics.Process]::GetProcessesByName('AiSysadmin')) {
        try {
            if($process.HasExited){continue}
            $path=[IO.Path]::GetFullPath($process.MainModule.FileName)
            if($path.Equals($current,[StringComparison]::OrdinalIgnoreCase) -or $path.StartsWith($legacy,[StringComparison]::OrdinalIgnoreCase)) {
                $owned+=$process
            }
        } catch [InvalidOperationException] { if(-not $process.HasExited){throw} }
    }
    $clock=[Diagnostics.Stopwatch]::StartNew()
    if($owned.Count) {
        Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class AiSysadminCloseWindows {
    private delegate bool Callback(IntPtr handle, IntPtr state);
    [DllImport("user32.dll")] private static extern bool EnumWindows(Callback callback, IntPtr state);
    [DllImport("user32.dll")] private static extern uint GetWindowThreadProcessId(IntPtr handle, out uint processId);
    [DllImport("user32.dll", CharSet=CharSet.Unicode)] private static extern int GetWindowTextLength(IntPtr handle);
    [DllImport("user32.dll")] private static extern bool PostMessage(IntPtr handle, uint message, IntPtr wParam, IntPtr lParam);
    public static void RequestClose(int processId) {
        EnumWindows(delegate(IntPtr handle, IntPtr state) {
            uint owner; GetWindowThreadProcessId(handle, out owner);
            if(owner == processId && GetWindowTextLength(handle) > 0) PostMessage(handle, 0x0010, IntPtr.Zero, IntPtr.Zero);
            return true;
        }, IntPtr.Zero);
    }
}
'@
    }
    foreach($process in $owned) {
        if(-not $process.HasExited){[AiSysadminCloseWindows]::RequestClose($process.Id)}
    }
    foreach($process in $owned) {
        $remaining=[Math]::Max(0,[int]($TimeoutSeconds*1000-$clock.ElapsedMilliseconds))
        if(-not $process.HasExited -and -not $process.WaitForExit($remaining)) {
            throw 'La instancia de AI Sysadmin no termino dentro del tiempo limite. Cierra la ventana manualmente y reintenta.'
        }
    }
    [IO.File]::WriteAllText($LogPath, "Cierre comprobado. Instancias de esta instalacion: $($owned.Count).")
    exit 0
} catch {
    try {[IO.File]::WriteAllText($LogPath,$_.Exception.Message)}catch{}
    exit 2
}
