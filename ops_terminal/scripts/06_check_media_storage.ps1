$ErrorActionPreference = "Stop"

$keyPath = "$env:USERPROFILE\.ssh\codex_vps_beget"
$logPath = Join-Path $PSScriptRoot "06_check_media_storage.log"

Start-Transcript -Path $logPath -Force
try {
    $remote = @'
set -e
echo '--- links ---'
ls -ld /var/www/bathhouse/public/uploads /var/www/bathhouse_data/uploads
echo '--- files ---'
find /var/www/bathhouse_data/uploads -maxdepth 1 -type f -printf '%f %s bytes\n' | sort
echo '--- db ---'
mysql -N -uroot sgoncharof_base -e 'SELECT id,file_url,file_size,IFNULL(folder_id,0) FROM media_library ORDER BY id;'
echo '--- nginx ---'
grep -R -E 'bathhouse|8080|root ' -n /etc/nginx/sites-enabled /etc/nginx/conf.d 2>/dev/null || true
'@

    ssh -i $keyPath -o StrictHostKeyChecking=accept-new root@159.194.225.55 $remote
}
finally {
    Stop-Transcript
}
