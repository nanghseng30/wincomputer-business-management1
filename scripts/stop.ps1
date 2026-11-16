# Stops and removes containers/network, but retains the MySQL named volume.
. (Join-Path $PSScriptRoot 'common.ps1')
& docker compose down
Assert-NativeSuccess 'Stopping Compose'
Write-Host 'Compose stopped; database volume retained. Stop the separately running TLS proxy too.'
