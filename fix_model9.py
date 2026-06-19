import paramiko

HOST = '159.194.225.55'
USER = 'root'
PASS = '*ycJ8YTc97NX'
DB_USER = 'sgoncharof_base'
DB_PASS = '143430SeR!!'
DB_NAME = 'sgoncharof_base'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=30)

def q(sql):
    cmd = f'mysql -u {DB_USER} -p{DB_PASS} {DB_NAME} --skip-column-names -e "{sql}"'
    _, out, err = ssh.exec_command(cmd, timeout=30)
    o = out.read().decode('utf-8', errors='replace').strip()
    e = err.read().decode('utf-8', errors='replace').strip()
    if e and 'Warning' not in e:
        print('  ERR:', e)
    return o

print('options_catalog count:', q('SELECT COUNT(*) FROM options_catalog'))
print('Before: model 9 links:', q('SELECT COUNT(*) FROM option_model_availability WHERE model_id=9'))

q('INSERT IGNORE INTO option_model_availability (option_id, model_id) SELECT id, 9 FROM options_catalog')

print('After:  model 9 links:', q('SELECT COUNT(*) FROM option_model_availability WHERE model_id=9'))

ssh.close()
print('Done')
