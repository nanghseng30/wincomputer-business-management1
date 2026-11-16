; Win Computer is an online thin client. The web app and database remain on the central HTTPS server.
; The Microsoft Edge WebView2 Runtime must already be installed on the target Windows machine.
; This source-only installer definition is not built in the current non-Windows environment.
#define MyAppName "Win Computer"
#define MyAppVersion "1.0.0"
[Setup]
AppId={{740F17B9-82BE-45CE-977D-196F306F492C}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
DefaultDirName={localappdata}\Programs\WinComputer
DefaultGroupName=Win Computer
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
OutputDir=installer
OutputBaseFilename=WinComputer-Setup
SetupIconFile=win.ico
Compression=lzma2
SolidCompression=yes
[Files]
Source: "publish\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
[Icons]
Name: "{group}\Win Computer"; Filename: "{app}\WinComputer.exe"
Name: "{autodesktop}\Win Computer"; Filename: "{app}\WinComputer.exe"; Tasks: desktopicon
[Tasks]
Name: desktopicon; Description: "Create a desktop shortcut"; Flags: unchecked
