$ErrorActionPreference = "Stop"

$keyPath = "$env:USERPROFILE\.ssh\codex_vps_beget"
$baseUrl = "http://159.194.225.55:8080"
$logPath = Join-Path $PSScriptRoot "07_test_media_persistence.log"

Start-Transcript -Path $logPath -Force
try {
    $remoteCheck = @'
php -l /var/www/bathhouse/public/api/index.php
test -L /var/www/bathhouse/public/uploads
test "$(readlink -f /var/www/bathhouse/public/uploads)" = /var/www/bathhouse_data/uploads
'@
    ssh -i $keyPath root@159.194.225.55 $remoteCheck

    $media = Invoke-RestMethod "$baseUrl/api/index.php?action=media_list"
    if (-not $media.ok) { throw "media_list failed" }
    if ($media.media.Count -lt 1) { throw "No physical media returned" }

    $original = $media.media[0]
    $imageResponse = Invoke-WebRequest ($baseUrl + $original.file_url) -UseBasicParsing
    if ($imageResponse.StatusCode -ne 200 -or $imageResponse.RawContentLength -le 0) {
        throw "Original image is unavailable"
    }

    $copy = Invoke-RestMethod "$baseUrl/api/index.php?action=copy_media" -Method Post -Body @{ id = $original.id }
    if (-not $copy.ok) { throw "copy_media failed" }

    $afterCopy = Invoke-RestMethod "$baseUrl/api/index.php?action=media_list"
    $copied = $afterCopy.media | Where-Object { $_.id -eq [string]$copy.id } | Select-Object -First 1
    if (-not $copied) { throw "Copied media is absent from media_list" }
    if ($copied.file_url -eq $original.file_url) { throw "Copy points to the original physical file" }

    $copyResponse = Invoke-WebRequest ($baseUrl + $copied.file_url) -UseBasicParsing
    if ($copyResponse.StatusCode -ne 200 -or $copyResponse.RawContentLength -le 0) {
        throw "Copied image is unavailable"
    }

    Write-Host "MEDIA_PERSISTENCE_OK"
    Write-Host "Original: $($original.file_url)"
    Write-Host "Copy:     $($copied.file_url)"
}
finally {
    Stop-Transcript
}
