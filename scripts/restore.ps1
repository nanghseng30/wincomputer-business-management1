param(
    [Parameter(Mandatory=$true)][string]$BackupPath,
    [Parameter(Mandatory=$true)][string]$ConfirmRestore
)
. (Join-Path $PSScriptRoot 'common.ps1')
if ($ConfirmRestore -cne 'ERASE-LAN-DATABASE') { throw 'Confirmation must be exactly ERASE-LAN-DATABASE.' }
$source = (Resolve-Path -LiteralPath $BackupPath).Path
if (-not (Test-Path -LiteralPath $source -PathType Leaf) -or (Get-Item -LiteralPath $source).Length -eq 0) { throw 'Backup must be a non-empty SQL file.' }
$id = (& docker compose ps -q db | Select-Object -First 1)
Assert-NativeSuccess 'Finding database container'
if (-not $id) { throw 'Database container is not running; start it first.' }
$tmp = '/tmp/wincomputer-restore-' + [guid]::NewGuid().ToString('N') + '.sql'
try {
    & docker cp $source "${id}:$tmp"
    Assert-NativeSuccess 'Copying backup into database container'
    & docker compose exec -T db chmod 600 $tmp
    Assert-NativeSuccess 'Restricting temporary backup permissions'
    & docker compose stop app
    Assert-NativeSuccess 'Stopping app'
    Write-Warning 'Replacing the complete wincomputer database. If import or migration fails the app remains stopped.'
    $drop = 'export MYSQL_PWD=$MYSQL_ROOT_PASSWORD; exec mysql -u root -e ''DROP DATABASE IF EXISTS wincomputer; CREATE DATABASE wincomputer CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;'''
    & docker compose exec -T db sh -c $drop
    Assert-NativeSuccess 'Replacing database'
    $load = 'export MYSQL_PWD=$MYSQL_ROOT_PASSWORD; exec mysql --binary-mode -u root wincomputer < {0}' -f $tmp
    & docker compose exec -T db sh -c $load
    Assert-NativeSuccess 'Importing database'
    & docker compose run --rm --no-deps migrate
    Assert-NativeSuccess 'Applying pending migrations'
    & docker compose up -d --no-deps app
    Assert-NativeSuccess 'Starting app'
    Write-Host 'Restore and migration completed; validate accounts, data, and LAN access before resuming work.'
} finally {
    & docker compose exec -T db rm -f $tmp *> $null
}
