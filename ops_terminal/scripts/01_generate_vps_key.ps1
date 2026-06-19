$ErrorActionPreference = "Stop"

$keyPath = "$env:USERPROFILE\.ssh\codex_vps_beget"
$pubPath = "$keyPath.pub"

if (Test-Path $keyPath) { Remove-Item $keyPath -Force }
if (Test-Path $pubPath) { Remove-Item $pubPath -Force }

# Use stop-parsing token to pass empty passphrase to ssh-keygen on Windows PowerShell.
ssh-keygen --% -t ed25519 -f C:\Users\sgonc\.ssh\codex_vps_beget -N "" -C codex-vps-beget

Write-Output "PUBLIC_KEY_BEGIN"
Get-Content $pubPath
Write-Output "PUBLIC_KEY_END"
