$ErrorActionPreference = "Stop"

$keyPath = "$env:USERPROFILE\.ssh\codex_vps_beget"
$hostName = "159.194.225.55"
$userName = "root"

$remote = @'
set -e
systemctl stop apache2 || true
systemctl disable apache2 || true
apt-get remove -y apache2 apache2-bin apache2-data apache2-utils libapache2-mod-php8.3 || true

mkdir -p /var/www/bathhouse
chown -R www-data:www-data /var/www/bathhouse

cat > /etc/nginx/sites-available/sgoncharof.beget.tech <<'CONF'
server {
  listen 80;
  server_name sgoncharof.beget.tech www.sgoncharof.beget.tech;

  root /var/www/bathhouse/public;
  index index.php index.html;

  location / {
    try_files $uri $uri/ /index.php?$query_string;
  }

  location ~ \.php$ {
    include snippets/fastcgi-php.conf;
    fastcgi_pass unix:/run/php/php8.3-fpm.sock;
  }

  location ~ /\.ht {
    deny all;
  }
}
CONF

ln -sf /etc/nginx/sites-available/sgoncharof.beget.tech /etc/nginx/sites-enabled/sgoncharof.beget.tech
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl restart php8.3-fpm
systemctl restart nginx
systemctl status nginx --no-pager -l | head -n 20
'@

ssh -i $keyPath -o StrictHostKeyChecking=accept-new "$userName@$hostName" $remote
