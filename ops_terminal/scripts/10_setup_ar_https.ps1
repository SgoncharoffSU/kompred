$ErrorActionPreference = "Stop"

$keyPath = "$env:USERPROFILE\.ssh\codex_vps_beget"
$logPath = Join-Path $PSScriptRoot "10_setup_ar_https.log"

Start-Transcript -Path $logPath -Force
try {
    $remote = @'
set -e
DOMAIN=159-194-225-55.sslip.io
APP_ROOT=/var/www/bathhouse/public

apt-get update
apt-get install -y certbot python3-certbot-nginx

cat > /etc/nginx/sites-available/bathhouse-ar-sslip <<CONF
server {
  listen 80;
  server_name $DOMAIN;

  root $APP_ROOT;
  index index.php index.html;

  location / {
    try_files \$uri \$uri/ /index.php?\$query_string;
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

ln -sf /etc/nginx/sites-available/bathhouse-ar-sslip /etc/nginx/sites-enabled/bathhouse-ar-sslip
nginx -t
systemctl reload nginx

certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m goncharovsu@yandex.ru --redirect || true
nginx -t
systemctl reload nginx
curl -fsSI https://$DOMAIN/ar/ | head -n 5
'@

    ssh -i $keyPath -o StrictHostKeyChecking=accept-new root@159.194.225.55 $remote
}
finally {
    Stop-Transcript
}
