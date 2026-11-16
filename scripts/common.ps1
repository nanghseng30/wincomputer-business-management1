# Dot-source from the other scripts. Never print the loaded secret values.
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $ProjectRoot
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw 'Docker Desktop / docker CLI not found.' }
& docker compose version *> $null
if ($LASTEXITCODE -ne 0) { throw 'Docker Compose v2 is required.' }
$envPath = Join-Path $ProjectRoot '.env'
if (-not (Test-Path -LiteralPath $envPath -PathType Leaf)) { throw 'Create .env from .env.example first.' }
$values = @{}
foreach ($line in [IO.File]::ReadAllLines($envPath)) {
    if ($line -match '^\s*(?:#|$)') { continue }
    if ($line -match '^([A-Z_]+)=([^\s#"'']+)$') {
        $name = $Matches[1]
        $value = $Matches[2]
        if ($values.ContainsKey($name)) { throw "Duplicate .env key: $name" }
        $values[$name] = $value
    } else {
        throw 'Invalid .env line: use unquoted values and no spaces or comments on value lines.'
    }
}
foreach ($name in @('MYSQL_ROOT_PASSWORD','MYSQL_PASSWORD','APP_SESSION_SECRET')) {
    if (-not $values.ContainsKey($name) -or $values[$name] -notmatch '^[0-9a-fA-F]{64}$') { throw "$name must be 64 hexadecimal characters." }
}
if (-not $values.ContainsKey('WIN_APPROVAL_PASSWORD') -or $values['WIN_APPROVAL_PASSWORD'] -notmatch '^[a-zA-Z0-9_-]{20,128}$') { throw 'WIN_APPROVAL_PASSWORD must contain 20-128 ASCII letters, digits, _ or -.' }
$required = @('MYSQL_ROOT_PASSWORD','MYSQL_PASSWORD','APP_SESSION_SECRET','WIN_APPROVAL_PASSWORD')
if (@($required | ForEach-Object { $values[$_] } | Select-Object -Unique).Count -ne $required.Count) { throw 'All four secrets must be different.' }
# Explicitly override any stale shell variables, which otherwise take precedence
# over the .env file in Compose. Only the current PowerShell process is affected.
foreach ($name in $required) { [Environment]::SetEnvironmentVariable($name, $values[$name], 'Process') }
function Assert-NativeSuccess([string]$Step) {
    if ($LASTEXITCODE -ne 0) { throw "$Step failed (exit $LASTEXITCODE)." }
}
