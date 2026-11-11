#ifndef PublishDir
  #error PublishDir must point to the verified self-contained publish folder.
#endif
#ifndef InstallerAppId
  #define InstallerAppId "{{4DFF87E7-6939-4591-910C-8BA873B15B32}"
#endif
#ifndef OutputDir
  #error OutputDir is required.
#endif
#ifndef InstallerSettingsKey
  #define InstallerSettingsKey "Software\Sentrait\AiSysadminAgent"
#endif
#ifndef AppVersion
  #error AppVersion is required.
#endif

[Setup]
AppId={#InstallerAppId}
AppName=AI Sysadmin Agent
AppVersion={#AppVersion}
AppPublisher=AI Sysadmin Agent
AppPublisherURL=https://sentrait.com.uy/
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
ShowLanguageDialog=yes

[Languages]
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"; InfoBeforeFile: "install-notes.txt"
Name: "english"; MessagesFile: "compiler:Default.isl"; InfoBeforeFile: "install-notes.en.txt"

[CustomMessages]
spanish.CloseCheck=No se pudo comprobar si la aplicación está abierta: %1. Cerrala y volvé a ejecutar el instalador.
english.CloseCheck=Could not check whether the application is running: %1. Close it and run the installer again.
spanish.WebViewRequired=Instalá Microsoft Edge WebView2 Runtime (Evergreen) y volvé a ejecutar este instalador: https://developer.microsoft.com/microsoft-edge/webview2/
english.WebViewRequired=Install Microsoft Edge WebView2 Runtime (Evergreen), then run this installer again: https://developer.microsoft.com/microsoft-edge/webview2/

[Registry]
Root: HKCU; Subkey: "{#InstallerSettingsKey}"; ValueType: string; ValueName: "Language"; ValueData: "{code:ApplicationLanguage}"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; Flags: unchecked

[Files]
Source: "{#PublishDir}\*"; DestDir: "{app}\versions\{#AppVersion}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\Assets\app.ico"; DestDir: "{app}"; DestName: "app.ico"; Flags: ignoreversion

[Icons]
Name: "{autoprograms}\AI Sysadmin Agent"; Filename: "{app}\versions\{#AppVersion}\AiSysadmin.exe"; IconFilename: "{app}\app.ico"; AppUserModelID: "Sentrait.AiSysadminAgent.Desktop"; Check: not WizardNoIcons
Name: "{autodesktop}\AI Sysadmin Agent"; Filename: "{app}\versions\{#AppVersion}\AiSysadmin.exe"; IconFilename: "{app}\app.ico"; AppUserModelID: "Sentrait.AiSysadminAgent.Desktop"; Tasks: desktopicon; Check: not WizardNoIcons

[Run]
Filename: "{app}\versions\{#AppVersion}\AiSysadmin.exe"; Description: "{cm:LaunchProgram,AI Sysadmin Agent}"; Flags: nowait postinstall skipifsilent

[Code]
function ApplicationLanguage(Param: String): String;
begin
  if ActiveLanguage = 'english' then Result := 'en' else Result := 'es';
end;

procedure RegisterInstalledExecutable(const Filename: String);
begin
  if FileExists(Filename) then
    if not RegisterExtraCloseApplicationsResource(False, Filename) then
      RaiseException(FmtMessage(CustomMessage('CloseCheck'), [Filename]));
end;

procedure RegisterExtraCloseApplicationsResources;
var
  Versions: String;
  Found: TFindRec;
begin
  { Updates use a new directory. Register older executables explicitly so
    Restart Manager closes those instances before installing the next version. }
  RegisterInstalledExecutable(ExpandConstant('{app}\AiSysadmin.exe'));
  Versions := ExpandConstant('{app}\versions\');
  if FindFirst(Versions + '*', Found) then
  begin
    try
      repeat
        if ((Found.Attributes and FILE_ATTRIBUTE_DIRECTORY) <> 0) and
           (Found.Name <> '.') and (Found.Name <> '..') then
          RegisterInstalledExecutable(Versions + Found.Name + '\AiSysadmin.exe');
      until not FindNext(Found);
    finally
      FindClose(Found);
    end;
  end;
end;

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
    Result := CustomMessage('WebViewRequired');
end;
