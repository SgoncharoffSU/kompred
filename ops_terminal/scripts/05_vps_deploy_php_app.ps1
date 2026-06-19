$ErrorActionPreference = "Stop"

$keyPath = "$env:USERPROFILE\.ssh\codex_vps_beget"
$hostName = "159.194.225.55"
$userName = "root"

$localRoot = "d:\project\bathhouse\php_hosting"
$localTar = "d:\project\bathhouse\ops_terminal\scripts\php_hosting_bundle.tar.gz"

if (Test-Path $localTar) { Remove-Item $localTar -Force }

node "d:\project\bathhouse\ops_terminal\scripts\check_encoding.mjs"

tar -czf $localTar -C $localRoot .

scp -i $keyPath -o StrictHostKeyChecking=accept-new $localTar "${userName}@${hostName}:/root/php_hosting_bundle.tar.gz"

$remote = @'
set -e
mkdir -p /var/www/bathhouse_data/uploads /var/www/bathhouse_data/backups

# Preserve uploads from older deployments before replacing the application.
if [ -d /var/www/bathhouse/public/uploads ]; then
  OLD_UPLOADS=$(readlink -f /var/www/bathhouse/public/uploads || true)
  DATA_UPLOADS=$(readlink -f /var/www/bathhouse_data/uploads || true)
  if [ -n "$OLD_UPLOADS" ] && [ "$OLD_UPLOADS" != "$DATA_UPLOADS" ]; then
    cp -aL /var/www/bathhouse/public/uploads/. /var/www/bathhouse_data/uploads/
  fi
fi

mysqldump -uroot sgoncharof_base > /var/www/bathhouse_data/backups/database_before_deploy.sql 2>/dev/null || true
rm -rf /var/www/bathhouse
mkdir -p /var/www/bathhouse
tar -xzf /root/php_hosting_bundle.tar.gz -C /var/www/bathhouse
rm -rf /var/www/bathhouse/public/uploads
ln -s /var/www/bathhouse_data/uploads /var/www/bathhouse/public/uploads
chown -R www-data:www-data /var/www/bathhouse
chown -R www-data:www-data /var/www/bathhouse_data

mysql -uroot <<SQL
CREATE DATABASE IF NOT EXISTS sgoncharof_base CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'sgoncharof_base'@'localhost' IDENTIFIED BY '143430SeR!!';
ALTER USER 'sgoncharof_base'@'localhost' IDENTIFIED BY '143430SeR!!';
GRANT ALL PRIVILEGES ON sgoncharof_base.* TO 'sgoncharof_base'@'localhost';
FLUSH PRIVILEGES;
SQL

mysql -uroot sgoncharof_base < /var/www/bathhouse/sql/schema.sql

test -L /var/www/bathhouse/public/uploads
test "$(readlink -f /var/www/bathhouse/public/uploads)" = "/var/www/bathhouse_data/uploads"
curl -fsS 'http://127.0.0.1:8080/api/index.php?action=media_list' >/dev/null
'@

ssh -i $keyPath -o StrictHostKeyChecking=accept-new "$userName@$hostName" $remote
