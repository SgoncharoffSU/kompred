$ErrorActionPreference = "Stop"

$keyPath = "$env:USERPROFILE\.ssh\codex_vps_beget"
$logPath = Join-Path $PSScriptRoot "09_cleanup_orphan_media.log"

Start-Transcript -Path $logPath -Force
try {
    $remote = @'
set -e
mkdir -p /var/www/bathhouse_data/backups
mysqldump -uroot sgoncharof_base > /var/www/bathhouse_data/backups/database_before_orphan_cleanup.sql

mysql -uroot sgoncharof_base -e 'DELETE FROM media_library WHERE id BETWEEN 1 AND 9'
echo 'Removed the nine confirmed orphan media rows.'

db_count=$(mysql -N -uroot sgoncharof_base -e 'SELECT COUNT(*) FROM media_library')
file_count=$(find /var/www/bathhouse_data/uploads -maxdepth 1 -type f | wc -l)
echo "DB_MEDIA_COUNT=$db_count"
echo "STORED_FILE_COUNT=$file_count"
'@

    ssh -i $keyPath -o StrictHostKeyChecking=accept-new root@159.194.225.55 $remote
}
finally {
    Stop-Transcript
}
