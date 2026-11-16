param([Parameter(Mandatory=$true)][string]$OutputPath)
. (Join-Path $PSScriptRoot 'common.ps1')
$destination = [IO.Path]::GetFullPath($OutputPath)
if (Test-Path -LiteralPath $destination) { throw 'Output path already exists; refusing to overwrite it.' }
$parent = Split-Path -Parent $destination
if (-not (Test-Path -LiteralPath $parent -PathType Container)) { throw 'Output directory does not exist.' }
$id = (& docker compose ps -q db | Select-Object -First 1)
Assert-NativeSuccess 'Finding database container'
if (-not $id) { throw 'Database container is not running; start the stack first.' }
$tmp = '/tmp/wincomputer-backup-' + [guid]::NewGuid().ToString('N') + '.sql'
$success = $false
try {
    # File is generated inside the container then copied as bytes, avoiding PS 5.1 redirection recoding.
    $cmd = 'umask 077; export MYSQL_PWD=$MYSQL_ROOT_PASSWORD; exec mysqldump -u root --single-transaction --quick --routines --events --triggers --set-gtid-purged=OFF wincomputer > {0}' -f $tmp
    & docker compose exec -T db sh -c $cmd
    Assert-NativeSuccess 'Database dump'
    & docker cp "${id}:$tmp" $destination
    Assert-NativeSuccess 'Copying backup'
    if ((Get-Item -LiteralPath $destination).Length -eq 0) { throw 'Backup is empty.' }
    $success = $true
    Write-Host "Backup created: $destination. Protect and verify it by restoring to a separate test system."
} finally {
    & docker compose exec -T db rm -f $tmp *> $null
    if (-not $success -and (Test-Path -LiteralPath $destination)) { Remove-Item -LiteralPath $destination -Force }
}
