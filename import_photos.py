"""
Кладёшь фото в папку import_photos/ → запускаешь скрипт → фото появляются в галерее.

Использование:
    python import_photos.py
    python import_photos.py --folder "Квадро Хаус 6х6"   # поместить в папку галереи
"""
import os, sys, mimetypes, argparse, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
import urllib.request, urllib.parse
import json

API = 'http://159.194.225.55:8080/api/index.php'
PHOTOS_DIR = os.path.join(os.path.dirname(__file__), 'import_photos')

ALLOWED_EXT = {'.jpg', '.jpeg', '.png', '.webp', '.gif'}

def api_post_multipart(action, filepath, folder_id=0):
    """Upload a file via multipart/form-data using only stdlib."""
    filename = os.path.basename(filepath)
    mime = mimetypes.guess_type(filename)[0] or 'image/jpeg'

    boundary = '----PythonBoundary7f3a9b'
    with open(filepath, 'rb') as f:
        file_data = f.read()

    body_parts = []
    # folder_id field
    body_parts.append(
        f'--{boundary}\r\nContent-Disposition: form-data; name="folder_id"\r\n\r\n{folder_id}'.encode()
    )
    # file field
    body_parts.append(
        f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="{filename}"\r\nContent-Type: {mime}\r\n\r\n'.encode()
        + file_data
    )
    body_parts.append(f'--{boundary}--'.encode())
    body = b'\r\n'.join(body_parts)

    url = f'{API}?action={action}'
    req = urllib.request.Request(
        url,
        data=body,
        headers={'Content-Type': f'multipart/form-data; boundary={boundary}'},
        method='POST',
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode())

def create_folder(name):
    """Create a gallery folder and return its id."""
    data = urllib.parse.urlencode({'name': name}).encode()
    req = urllib.request.Request(f'{API}?action=create_media_folder', data=data, method='POST')
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode())

def get_folders():
    """Return list of existing gallery folders."""
    with urllib.request.urlopen(f'{API}?action=media_list', timeout=15) as resp:
        return json.loads(resp.read().decode()).get('folders', [])

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--folder', default='', help='Название папки в галерее (необязательно)')
    args = parser.parse_args()

    if not os.path.isdir(PHOTOS_DIR):
        print(f'Папка {PHOTOS_DIR} не найдена.')
        sys.exit(1)

    photos = [
        f for f in sorted(os.listdir(PHOTOS_DIR))
        if os.path.splitext(f.lower())[1] in ALLOWED_EXT
    ]

    if not photos:
        print(f'Нет фото в папке import_photos/  (поддерживаются: jpg, png, webp, gif)')
        sys.exit(0)

    print(f'Найдено фото: {len(photos)}')

    # Resolve folder_id
    folder_id = 0
    if args.folder:
        folders = get_folders()
        existing = next((f for f in folders if f['name'] == args.folder), None)
        if existing:
            folder_id = existing['id']
            print(f'Папка галереи: «{args.folder}» (id={folder_id})')
        else:
            res = create_folder(args.folder)
            if res.get('ok'):
                folder_id = res['id']
                print(f'Создана папка галереи: «{args.folder}» (id={folder_id})')
            else:
                print(f'Не удалось создать папку: {res}')

    ok_count = 0
    for filename in photos:
        filepath = os.path.join(PHOTOS_DIR, filename)
        sys.stdout.write(f'  {filename} ... ')
        sys.stdout.flush()
        try:
            res = api_post_multipart('upload_image', filepath, folder_id)
            if res.get('ok'):
                print(f'OK → {res.get("url", "")}')
                ok_count += 1
            else:
                print(f'ОШИБКА: {res.get("error")}')
        except Exception as e:
            print(f'ОШИБКА: {e}')

    print(f'\nГотово: {ok_count}/{len(photos)} загружено.')
    if ok_count:
        print('Фото появятся в галерее при следующем открытии админ-панели.')

if __name__ == '__main__':
    main()
