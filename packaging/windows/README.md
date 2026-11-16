# Win Computer — Windows WebView2 thin client (source only)

This directory contains the Windows desktop thin client for the existing online Web App. It does not implement business logic, authentication, a local database, JSON storage, offline mode, or a standalone local UI. The central web app and its database remain the source of truth; the desktop executable only hosts that web app in Microsoft Edge WebView2.

## Runtime behavior

- On first run, the client prompts for the public server **origin**, such as `https://app.example.com`.
- Only an `https://` URL with a host is accepted. Credentials, fragments, and non-HTTPS schemes are rejected.
- The normalized origin is the only configuration value written to `%LOCALAPPDATA%\WinComputer\server-url.txt`.
- WebView2 cookies and cache are preserved in `%LOCALAPPDATA%\WinComputer\WebView2Profile`; this is browser profile state, not a business database.
- Internet access and an available central server are required. There is no offline operation or local fallback.
- Navigation is restricted to HTTPS pages on the configured server origin. Non-HTTPS, cross-origin, and new-window navigation is blocked.
- WebView2 host objects are not exposed, and developer tools, default context menus, status bar, zoom controls, password autosave, and general autofill are disabled.
- `resources\win-logo.png` remains bundled as the supplied project resource; `win.ico` remains the application/installer icon.

The wrapper intentionally stores no receipts, users, prices, audit records, passwords, or other business data locally. Configure and manage those through the online Web App and central server/database.

## Windows prerequisites

- Windows x64-compatible machine
- .NET 8 SDK for building
- Microsoft Edge WebView2 Runtime installed on the target machine (Evergreen Runtime recommended)
- Internet access to the configured HTTPS server
- Inno Setup 6 only if creating an installer from `WinComputer.iss`

## Build and publish on Windows

Run these commands from `packaging\windows` in PowerShell:

```powershell
dotnet restore .\WinComputer.csproj
dotnet build .\WinComputer.csproj -c Release
dotnet publish .\WinComputer.csproj -c Release -r win-x64 --self-contained true -o .\publish
```

The published output can then be selected by `WinComputer.iss` (`publish\*`) when compiling with Inno Setup:

```powershell
iscc .\WinComputer.iss
```

The EXE and installer are **source-only deliverables in this environment**: no Windows OS, .NET SDK, WebView2 runtime, or Inno Setup is available here, so neither artifact was built or runtime-tested. Do not interpret the checked-in `.cs`, `.csproj`, or `.iss` files as a compiled or published binary.

## Configuration and security notes

The server URL file is deliberately limited to the normalized HTTPS origin. To change servers, remove `%LOCALAPPDATA%\WinComputer\server-url.txt` and restart the client; the first-run prompt will appear again. WebView2 profile cookies/cache may need to be cleared separately if the browser session should be reset.

The desktop client is not a replacement for server-side transport security, authentication, authorization, validation, or database controls. Use a valid public HTTPS deployment and keep the central Web App and database secured and maintained.
