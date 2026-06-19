$ErrorActionPreference = "Stop"

$keyPath = "$env:USERPROFILE\.ssh\codex_vps_beget"
$logPath = Join-Path $PSScriptRoot "11_setup_glb_mime.log"

Start-Transcript -Path $logPath -Force
try {
    $remote = @'
set -e
cat > /etc/nginx/conf.d/bathhouse-glb-mime.conf <<'CONF'
types {
  model/gltf-binary glb;
  model/gltf+json gltf;
  model/vnd.usdz+zip usdz;
}
CONF
nginx -t
systemctl reload nginx
'@

    ssh -i $keyPath -o StrictHostKeyChecking=accept-new root@159.194.225.55 $remote
}
finally {
    Stop-Transcript
}
