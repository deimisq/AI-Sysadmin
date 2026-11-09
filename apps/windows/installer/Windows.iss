#ifndef PublishDir
  #error PublishDir must point to the verified self-contained publish folder.
#endif
#ifndef OutputDir
  #error OutputDir is required.
#endif
#ifndef AppVersion
  #error AppVersion is required.
#endif

[Setup]
AppId={{4DFF87E7-6939-4591-910C-8BA873B15B32}
AppName=AI Sysadmin Agent
AppVersion={#AppVersion}
AppPublisher=AI Sysadmin Agent
DefaultDirName={localappdata}\Programs\AI Sysadmin Agent
DefaultGroupName=AI Sysadmin Agent
PrivilegesRequired=lowest
ArchitecturesAllowed=x64os
ArchitecturesInstallIn64BitMode=x64os
MinVersion=10.0.19045
OutputDir={#OutputDir}
OutputBaseFilename=AI-Sysadmin-Agent-{#AppVersion}-win-x64-setup
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
SetupIconFile=..\Assets\app.ico
DisableProgramGroupPage=yes
AllowNoIcons=yes
UninstallDisplayIcon={app}\versions\{#AppVersion}\AiSysadmin.exe
CloseApplications=yes
RestartApplications=no
InfoBeforeFile=install-notes.txt
SetupLogging=yes

[Languages]
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Crear un acceso directo en el escritorio"; Flags: unchecked

[Files]
Source: "{#PublishDir}\*"; DestDir: "{app}\versions\{#AppVersion}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\AI Sysadmin Agent"; Filename: "{app}\versions\{#AppVersion}\AiSysadmin.exe"; IconFilename: "{app}\versions\{#AppVersion}\AiSysadmin.exe"; IconIndex: 0; Check: not WizardNoIcons
Name: "{autodesktop}\AI Sysadmin Agent"; Filename: "{app}\versions\{#AppVersion}\AiSysadmin.exe"; IconFilename: "{app}\versions\{#AppVersion}\AiSysadmin.exe"; IconIndex: 0; Tasks: desktopicon; Check: not WizardNoIcons

[Run]
Filename: "{app}\versions\{#AppVersion}\AiSysadmin.exe"; Description: "Abrir AI Sysadmin Agent"; Flags: nowait postinstall skipifsilent

[Code]
function HasWebView2: Boolean;
var
  Version: String;
  Key: String;
begin
  Key := 'Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}';
  Result := (RegQueryStringValue(HKCU, Key, 'pv', Version) and (Version <> '') and (Version <> '0.0.0.0'))
    or (RegQueryStringValue(HKLM32, Key, 'pv', Version) and (Version <> '') and (Version <> '0.0.0.0'))
    or (RegQueryStringValue(HKLM64, Key, 'pv', Version) and (Version <> '') and (Version <> '0.0.0.0'));
end;

function PrepareToInstall(var NeedsRestart: Boolean): String;
begin
  Result := '';
  if not HasWebView2 then
    Result := 'Instalá Microsoft Edge WebView2 Runtime (Evergreen) y volvé a ejecutar este instalador: https://developer.microsoft.com/microsoft-edge/webview2/';
end;
