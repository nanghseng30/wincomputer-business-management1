# Build, wait for MySQL, stop the old app, apply pending migrations, then start.
. (Join-Path $PSScriptRoot 'common.ps1')
& docker compose build app
Assert-NativeSuccess 'Image build'
& docker compose up -d --wait db
Assert-NativeSuccess 'Waiting for database'
& docker compose stop app
Assert-NativeSuccess 'Stopping old app'
& docker compose run --rm --no-deps migrate
Assert-NativeSuccess 'Database migration; app remains stopped'
& docker compose up -d --no-deps app
Assert-NativeSuccess 'Starting app'
Write-Host 'App started on 127.0.0.1:3000. Start the separate local TLS proxy as described in self-host/README.md.'
