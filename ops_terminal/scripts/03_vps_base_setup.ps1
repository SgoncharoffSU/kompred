$ErrorActionPreference = "Stop"

$keyPath = "$env:USERPROFILE\.ssh\codex_vps_beget"
$hostName = "159.194.225.55"
$userName = "root"

$remote = @'
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y nginx mysql-server php php-fpm php-mysql php-cli unzip curl git
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
npm install -g pm2
systemctl enable nginx
systemctl start nginx
node -v
npm -v
php -v | head -n 1
mysql --version
'@

ssh -i $keyPath -o StrictHostKeyChecking=accept-new "$userName@$hostName" $remote
