import paramiko, tarfile, io, os, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

HOST = '159.194.225.55'
USER = 'root'
PASS = '*ycJ8YTc97NX'
REMOTE_DIR = '/var/www/bathhouse-next'
LOCAL_NEXT = r'd:\project\bathhouse\.next'
LOCAL_PUBLIC = r'd:\project\bathhouse\public'

print('Creating tar archive...')
buf = io.BytesIO()
with tarfile.open(fileobj=buf, mode='w:gz') as tar:
    tar.add(LOCAL_NEXT, arcname='.next')
buf.seek(0)
print(f'Archive size: {buf.getbuffer().nbytes // 1024} KB')

print('Connecting...')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=30)
print('Connected')

sftp = ssh.open_sftp()

# Upload .next archive
print('Uploading .next...')
sftp.putfo(buf, f'{REMOTE_DIR}/.next.tar.gz')

# Upload public/logo.png
logo_local = os.path.join(LOCAL_PUBLIC, 'logo.png')
if os.path.exists(logo_local):
    print('Uploading public/logo.png...')
    try:
        sftp.mkdir(f'{REMOTE_DIR}/public')
    except OSError:
        pass  # already exists
    sftp.put(logo_local, f'{REMOTE_DIR}/public/logo.png')
    print('logo.png uploaded')

sftp.close()
print('Upload done')

for cmd in [
    f'cd {REMOTE_DIR} && rm -rf .next && tar xzf .next.tar.gz && rm .next.tar.gz',
    'pm2 restart bathhouse-next',
]:
    print(f'$ {cmd}')
    _, out, err = ssh.exec_command(cmd, timeout=30)
    o = out.read().decode('utf-8', errors='replace').strip()
    e = err.read().decode('utf-8', errors='replace').strip()
    if o: print(o)
    if e: print(e)

ssh.close()
print('Done!')
