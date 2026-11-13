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
#ifndef PinnedShortcutsDir
  #define PinnedShortcutsDir "{userappdata}\Microsoft\Internet Explorer\Quick Launch\User Pinned\TaskBar"
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
UninstallDisplayIcon={app}\AiSysadmin.exe
; Restart Manager can stall scanning thousands of historical DLLs. Use our
; bounded, installation-scoped graceful close check in PrepareToInstall instead.
CloseApplications=no
CloseApplicationsFilterExcludes=*
RestartApplications=no
InfoBeforeFile=install-notes.txt
SetupLogging=yes
ShowLanguageDialog=yes

[Languages]
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"; InfoBeforeFile: "install-notes.txt"
Name: "english"; MessagesFile: "compiler:Default.isl"; InfoBeforeFile: "install-notes.en.txt"

[CustomMessages]
spanish.CloseCheck=No se pudo comprobar si la aplicación está abierta: %1. Ciérrala y vuelve a ejecutar el instalador.
english.CloseCheck=Could not check whether the application is running: %1. Close it and run the installer again.
spanish.WebViewRequired=Instala Microsoft Edge WebView2 Runtime (Evergreen) y vuelve a ejecutar este instalador: https://developer.microsoft.com/microsoft-edge/webview2/
english.WebViewRequired=Install Microsoft Edge WebView2 Runtime (Evergreen), then run this installer again: https://developer.microsoft.com/microsoft-edge/webview2/

spanish.CloseForFlatUpgrade=Para migrar a la instalación de ruta fija, cierra AI Sysadmin y ejecuta este instalador. El actualizador anterior no admite esta migración inicial.
english.CloseForFlatUpgrade=To migrate to the fixed installation path, close AI Sysadmin and run this installer. The previous updater does not support this initial migration.
spanish.CloseTimeout=No se pudo confirmar el cierre de AI Sysadmin. Cierra sus ventanas y reintenta. El detalle está en el registro del instalador.
english.CloseTimeout=Could not confirm that AI Sysadmin has closed. Close its windows and retry. Details are in the setup log.

[Registry]
Root: HKCU; Subkey: "{#InstallerSettingsKey}"; ValueType: string; ValueName: "Language"; ValueData: "{code:ApplicationLanguage}"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; Flags: unchecked

[Files]
Source: "close-installed-app.ps1"; Flags: dontcopy
Source: "{#PublishDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\Assets\app.ico"; DestDir: "{app}"; DestName: "app.ico"; Flags: ignoreversion

[Icons]
Name: "{autoprograms}\AI Sysadmin Agent"; Filename: "{app}\AiSysadmin.exe"; IconFilename: "{app}\app.ico"; AppUserModelID: "Sentrait.AiSysadminAgent.Desktop"; Check: not WizardNoIcons
Name: "{autodesktop}\AI Sysadmin Agent"; Filename: "{app}\AiSysadmin.exe"; IconFilename: "{app}\app.ico"; AppUserModelID: "Sentrait.AiSysadminAgent.Desktop"; Tasks: desktopicon; Check: not WizardNoIcons

[Run]
Filename: "{app}\AiSysadmin.exe"; Description: "{cm:LaunchProgram,AI Sysadmin Agent}"; Flags: nowait postinstall skipifsilent

[InstallDelete]
Type: filesandordirs; Name: "{app}\versions"
Type: filesandordirs; Name: "{app}\wwwroot"
Type: filesandordirs; Name: "{app}\ThirdParty"

[Code]
procedure UpdatePinnedShortcuts;
var
  Directory, VersionsRoot, Filename, Target, CurrentExecutable: String;
  Found: TFindRec;
  Shell, Shortcut: Variant;
begin
  Directory := ExpandConstant('{#PinnedShortcutsDir}');
  VersionsRoot := AddBackslash(ExpandConstant('{app}')) + 'versions\';
  CurrentExecutable := ExpandConstant('{app}\AiSysadmin.exe');
  if not FileExists(CurrentExecutable) then Exit;
  if not FindFirst(AddBackslash(Directory) + '*.lnk', Found) then Exit;
  try
    Shell := CreateOleObject('WScript.Shell');
    repeat
      if (Found.Attributes and FILE_ATTRIBUTE_DIRECTORY) = 0 then
      begin
        Filename := AddBackslash(Directory) + Found.Name;
        try
          Shortcut := Shell.CreateShortcut(Filename);
          Target := ExpandFileName(Shortcut.TargetPath);
          { Only retarget links belonging to this installation. Never create,
            unpin or change links for other apps or portable installations. }
          if (CompareText(Copy(Target, 1, Length(VersionsRoot)), VersionsRoot) = 0) and
             (CompareText(ExtractFileName(Target), 'AiSysadmin.exe') = 0) then
          begin
            Shortcut.TargetPath := CurrentExecutable;
            Shortcut.WorkingDirectory := ExtractFileDir(CurrentExecutable);
            Shortcut.IconLocation := ExpandConstant('{app}\app.ico') + ',0';
            Shortcut.Save;
            Log('Actualizado acceso anclado de esta instalacion.');
          end;
        except
          Log('No se pudo actualizar un acceso anclado: ' + GetExceptionMessage);
        end;
      end;
    until not FindNext(Found);
  finally
    FindClose(Found);
  end;
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
  begin
    try
      UpdatePinnedShortcuts;
    except
      Log('No se pudieron revisar los accesos anclados: ' + GetExceptionMessage);
    end;
  end;
end;

function ApplicationLanguage(Param: String): String;
begin
  if ActiveLanguage = 'english' then Result := 'en' else Result := 'es';
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
var
  Index: Integer;
  ResultCode: Integer;
  LogPath, Parameters: String;
  CloseDetails: AnsiString;
begin
  Result := '';
  for Index := 1 to ParamCount do
    if CompareText(ParamStr(Index), '/NOCLOSEAPPLICATIONS') = 0 then
    begin
      Result := CustomMessage('CloseForFlatUpgrade');
      Exit;
    end;
  if not HasWebView2 then
  begin
    Result := CustomMessage('WebViewRequired');
    Exit;
  end;
  ExtractTemporaryFile('close-installed-app.ps1');
  LogPath := ExpandConstant('{tmp}\ai-sysadmin-close.log');
  Parameters := '-NoProfile -NonInteractive -ExecutionPolicy Bypass -File ' +
    AddQuotes(ExpandConstant('{tmp}\close-installed-app.ps1')) + ' -InstallRoot ' +
    AddQuotes(ExpandConstant('{app}')) + ' -LogPath ' + AddQuotes(LogPath);
  Log('Comprobando cierre acotado de las instancias de esta instalacion.');
  if not Exec(ExpandConstant('{sys}\WindowsPowerShell\v1.0\powershell.exe'), Parameters,
    '', SW_HIDE, ewWaitUntilTerminated, ResultCode) or (ResultCode <> 0) then
  begin
    if LoadStringFromFile(LogPath, CloseDetails) then Log(String(CloseDetails));
    Result := CustomMessage('CloseTimeout');
  end;
end;
