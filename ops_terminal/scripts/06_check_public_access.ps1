$ErrorActionPreference = "Stop"

$ip = "159.194.225.55"
$domain = "sgoncharof.beget.tech"

Write-Output "Checking IP..."
try {
  $r1 = Invoke-WebRequest -Uri "http://$ip/" -UseBasicParsing -TimeoutSec 15
  Write-Output "IP_STATUS=$($r1.StatusCode)"
} catch {
  Write-Output "IP_FAIL=$($_.Exception.Message)"
}

Write-Output "Checking domain..."
try {
  $r2 = Invoke-WebRequest -Uri "http://$domain/" -UseBasicParsing -TimeoutSec 15
  Write-Output "DOMAIN_STATUS=$($r2.StatusCode)"
} catch {
  Write-Output "DOMAIN_FAIL=$($_.Exception.Message)"
}
