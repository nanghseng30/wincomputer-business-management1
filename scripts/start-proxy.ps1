param([Parameter(Mandatory=$true)][string]$LanIp)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
[Net.IPAddress]$parsed = $null
if (-not [Net.IPAddress]::TryParse($LanIp, [ref]$parsed) -or $parsed.AddressFamily -ne [Net.Sockets.AddressFamily]::InterNetwork) { throw 'LanIp must be an IPv4 address.' }
$b = $parsed.GetAddressBytes()
$private = ($b[0] -eq 10) -or ($b[0] -eq 172 -and $b[1] -ge 16 -and $b[1] -le 31) -or ($b[0] -eq 192 -and $b[1] -eq 168)
if (-not $private) { throw 'LanIp must be an RFC1918 private IPv4 address, not 0.0.0.0, a public address or loopback.' }
$LanIp = $parsed.ToString()
$local = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop | Where-Object { $_.IPAddress -eq $LanIp }
if (-not $local) { throw 'LanIp is not assigned to an interface on this host.' }
if (-not (Get-Command caddy.exe -ErrorAction SilentlyContinue)) { throw 'Caddy is not in PATH.' }
foreach ($file in @('C:\ProgramData\WinComputer\certs\server.crt', 'C:\ProgramData\WinComputer\certs\server.key')) {
    if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { throw "Missing TLS file: $file" }
}
$env:WIN_LAN_IP = $LanIp
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $root
& caddy.exe validate --config .\self-host\Caddyfile --adapter caddyfile
if ($LASTEXITCODE -ne 0) { throw 'Caddy config validation failed.' }
Write-Host "HTTPS proxy listening only on $LanIp`:443. Keep this window open; Ctrl+C stops it."
& caddy.exe run --config .\self-host\Caddyfile --adapter caddyfile
if ($LASTEXITCODE -ne 0) { throw 'Caddy failed.' }
