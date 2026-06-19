$ErrorActionPreference = "Stop"

$baseUrl = "http://159.194.225.55:8080"
$originalUrl = "/uploads/img_20260601_063857_0bcdd1a1.jpg"
$copyUrl = "/uploads/img_20260605_072837_f17a3967.jpg"
$logPath = Join-Path $PSScriptRoot "08_verify_media_after_deploy.log"

Start-Transcript -Path $logPath -Force
try {
    foreach ($url in @($originalUrl, $copyUrl)) {
        $response = Invoke-WebRequest ($baseUrl + $url) -UseBasicParsing
        if ($response.StatusCode -ne 200 -or $response.RawContentLength -le 0) {
            throw "Image unavailable after deployment: $url"
        }
    }

    $media = Invoke-RestMethod "$baseUrl/api/index.php?action=media_list"
    $copy = $media.media | Where-Object { $_.file_url -eq $copyUrl } | Select-Object -First 1
    if (-not $copy) { throw "Copied image missing from media library after deployment" }

    $deleted = Invoke-RestMethod "$baseUrl/api/index.php?action=delete_media" -Method Post -Body @{ id = $copy.id }
    if (-not $deleted.ok) { throw "Could not remove test copy" }

    $originalResponse = Invoke-WebRequest ($baseUrl + $originalUrl) -UseBasicParsing
    if ($originalResponse.StatusCode -ne 200 -or $originalResponse.RawContentLength -le 0) {
        throw "Deleting the copy damaged the original"
    }

    Write-Host "MEDIA_SURVIVED_DEPLOY_AND_INDEPENDENT_DELETE_OK"
}
finally {
    Stop-Transcript
}
