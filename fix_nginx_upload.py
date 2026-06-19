import paramiko

HOST = '159.194.225.55'
USER = 'root'
PASS = '*ycJ8YTc97NX'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=30)

def run(cmd):
    _, out, err = ssh.exec_command(cmd, timeout=15)
    o = out.read().decode('utf-8', errors='replace').strip()
    e = err.read().decode('utf-8', errors='replace').strip()
    if e: print('  >', e)
    return o

# Find PHP ini for CLI/FPM
print('PHP ini:', run('php -r "echo php_ini_loaded_file();"'))
print('FPM pool:', run('ls /etc/php/8.3/fpm/pool.d/'))
print('Current limits:', run('php -r "echo upload_max_filesize . \\" / \\" . post_max_size;"'))

# Update limits in PHP-FPM pool config
pool = run('cat /etc/php/8.3/fpm/pool.d/www.conf | grep upload_max')
print('Pool upload setting:', pool)

# Set via php.ini override in pool
run(r"sed -i '/php_value\[upload_max_filesize\]/d' /etc/php/8.3/fpm/pool.d/www.conf")
run(r"sed -i '/php_value\[post_max_size\]/d' /etc/php/8.3/fpm/pool.d/www.conf")
run(r"echo 'php_value[upload_max_filesize] = 20M' >> /etc/php/8.3/fpm/pool.d/www.conf")
run(r"echo 'php_value[post_max_size] = 25M' >> /etc/php/8.3/fpm/pool.d/www.conf")

# Reload PHP-FPM
print(run('systemctl reload php8.3-fpm'))
print('Reloaded PHP-FPM')
print('New limits:', run('php -r "echo ini_get(\'upload_max_filesize\') . \\" / \\" . ini_get(\'post_max_size\');"'))

ssh.close()
