$ErrorActionPreference = "Stop"

$keyPath = "$env:USERPROFILE\.ssh\codex_vps_beget"
$hostName = "159.194.225.55"
$userName = "root"

ssh -i $keyPath -o BatchMode=yes -o StrictHostKeyChecking=accept-new "$userName@$hostName" "echo CONNECTED && uname -a && whoami"
