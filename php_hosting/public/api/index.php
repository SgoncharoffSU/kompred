<?php
require __DIR__ . '/db.php';

$db = db_connect();
$action = isset($_GET['action']) ? $_GET['action'] : '';

function media_storage_dir() {
    return realpath(__DIR__ . '/../uploads') ?: (__DIR__ . '/../uploads');
}

function media_file_path($file_url) {
    $name = basename(parse_url($file_url, PHP_URL_PATH));
    return $name !== '' ? media_storage_dir() . DIRECTORY_SEPARATOR . $name : '';
}

function media_rows($db) {
    $rows = array();
    $res = $db->query('SELECT id,file_url,file_name,mime_type,file_size,IFNULL(folder_id,0) as folder_id,created_at FROM media_library ORDER BY id DESC LIMIT 500');
    while ($row = $res->fetch_assoc()) {
        $path = media_file_path($row['file_url']);
        if ($path === '' || !is_file($path)) continue;
        $row['file_url'] = '/uploads/' . basename($path);
        $rows[] = $row;
    }
    return $rows;
}

$db->query("CREATE TABLE IF NOT EXISTS media_library (
    id INT AUTO_INCREMENT PRIMARY KEY,
    file_url TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(120) DEFAULT '',
    file_size INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)");
$db->query("CREATE TABLE IF NOT EXISTS media_folders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(190) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)");
$col_check = $db->query("SHOW COLUMNS FROM media_library LIKE 'folder_id'");
if ($col_check && $col_check->num_rows === 0) {
    $db->query("ALTER TABLE media_library ADD COLUMN folder_id INT NULL");
}
$db->query("INSERT IGNORE INTO media_folders (id,name) VALUES (1,'Нераспределенные фото')");
$db->query("CREATE TABLE IF NOT EXISTS option_groups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(190) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)");
$db->query("CREATE TABLE IF NOT EXISTS models (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(160) NOT NULL,
    base_price DECIMAL(12,2) NOT NULL DEFAULT 300000,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)");
$col_check = $db->query("SHOW COLUMNS FROM models LIKE 'base_price'");
if ($col_check && $col_check->num_rows === 0) {
    $db->query("ALTER TABLE models ADD COLUMN base_price DECIMAL(12,2) NOT NULL DEFAULT 300000 AFTER name");
}
$db->query("CREATE TABLE IF NOT EXISTS options_catalog (
    id INT AUTO_INCREMENT PRIMARY KEY,
    group_id INT NULL,
    name VARCHAR(160) NOT NULL,
    image_url TEXT,
    price DECIMAL(12,2) NOT NULL DEFAULT 0,
    description TEXT,
    features_json TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)");
$db->query("CREATE TABLE IF NOT EXISTS option_model_availability (
    option_id INT NOT NULL,
    model_id INT NOT NULL,
    PRIMARY KEY(option_id, model_id),
    FOREIGN KEY (option_id) REFERENCES options_catalog(id) ON DELETE CASCADE,
    FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE CASCADE
)");
$col_check = $db->query("SHOW COLUMNS FROM models LIKE 'sort_order'");
if ($col_check && $col_check->num_rows === 0) {
    $db->query("ALTER TABLE models ADD COLUMN sort_order INT NOT NULL DEFAULT 0");
    $db->query("UPDATE models SET sort_order=id");
}
$col_check = $db->query("SHOW COLUMNS FROM options_catalog LIKE 'sort_order'");
if ($col_check && $col_check->num_rows === 0) {
    $db->query("ALTER TABLE options_catalog ADD COLUMN sort_order INT NOT NULL DEFAULT 0");
    $db->query("UPDATE options_catalog SET sort_order=id"); // initial stable order
}
$col_check = $db->query("SHOW COLUMNS FROM option_model_availability LIKE 'is_active'");
if ($col_check && $col_check->num_rows === 0) {
    $db->query("ALTER TABLE option_model_availability ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1");
}
$col_check = $db->query("SHOW COLUMNS FROM options_catalog LIKE 'group_id'");
if ($col_check && $col_check->num_rows === 0) {
    $db->query("ALTER TABLE options_catalog ADD COLUMN group_id INT NULL");
}
$col_check = $db->query("SHOW COLUMNS FROM option_groups LIKE 'selection_type'");
if ($col_check && $col_check->num_rows === 0) {
    $db->query("ALTER TABLE option_groups ADD COLUMN selection_type VARCHAR(20) NOT NULL DEFAULT 'multiple'");
}
$col_check = $db->query("SHOW COLUMNS FROM models LIKE 'image_url'");
if ($col_check && $col_check->num_rows === 0) {
    $db->query("ALTER TABLE models ADD COLUMN image_url VARCHAR(500) NOT NULL DEFAULT '' AFTER name");
}
$col_check = $db->query("SHOW COLUMNS FROM options_catalog LIKE 'image_crop'");
if ($col_check && $col_check->num_rows === 0) {
    $db->query("ALTER TABLE options_catalog ADD COLUMN image_crop VARCHAR(200) DEFAULT NULL");
}
$db->query("CREATE TABLE IF NOT EXISTS layouts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    model_id INT NOT NULL,
    name VARCHAR(200) NOT NULL,
    price_modifier DECIMAL(12,2) NOT NULL DEFAULT 0,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE CASCADE
)");
$db->query("CREATE TABLE IF NOT EXISTS calculations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    public_slug VARCHAR(64) NOT NULL UNIQUE,
    config_snapshot TEXT NOT NULL,
    total_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    fixed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)");
$db->query("INSERT IGNORE INTO option_groups (id,name,sort_order) VALUES (1,'Кровля',1)");
$db->query("INSERT IGNORE INTO option_groups (id,name,sort_order) VALUES (2,'Цвет бани',2)");
$db->query("INSERT INTO option_groups (id,name,sort_order) VALUES (3,'Двери',3) ON DUPLICATE KEY UPDATE name='Двери', sort_order=3");
$db->query("INSERT IGNORE INTO option_groups (id,name,sort_order) VALUES (4,'Окна',4)");

if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'bootstrap') {
    $models = array();
    $options = array();
    $groups = array();
    $media = array();
    $folders = array();

    $res = $db->query('SELECT id,name,image_url,base_price,sort_order,created_at FROM models ORDER BY sort_order ASC, id ASC');
    while ($row = $res->fetch_assoc()) $models[] = $row;

    $availability = array();
    $active_avail = array();
    $ar = $db->query('SELECT option_id, model_id, is_active FROM option_model_availability');
    if ($ar) {
        while ($a = $ar->fetch_assoc()) {
            $oid = intval($a['option_id']);
            $mid = intval($a['model_id']);
            if (!isset($availability[$oid])) $availability[$oid] = array();
            $availability[$oid][] = $mid;
            if (intval($a['is_active']) === 1) {
                if (!isset($active_avail[$oid])) $active_avail[$oid] = array();
                $active_avail[$oid][] = $mid;
            }
        }
    }
    $res2 = $db->query('SELECT o.id,o.group_id,o.sort_order,IFNULL(g.name,\'??? ??????\') as group_name,o.name,o.image_url,o.image_crop,o.price,o.description,o.features_json,o.created_at FROM options_catalog o LEFT JOIN option_groups g ON g.id=o.group_id ORDER BY COALESCE(g.sort_order,9999), o.sort_order ASC, o.id ASC');
    while ($row = $res2->fetch_assoc()) {
        $row['features'] = $row['features_json'] ? json_decode($row['features_json'], true) : array();
        unset($row['features_json']);
        $oid = intval($row['id']);
        $row['model_ids'] = isset($availability[$oid]) ? $availability[$oid] : array();
        $row['active_model_ids'] = isset($active_avail[$oid]) ? $active_avail[$oid] : array();
        $options[] = $row;
    }
    $res3 = $db->query('SELECT id,name,sort_order,selection_type,created_at FROM option_groups ORDER BY sort_order ASC, id ASC');
    while ($row = $res3->fetch_assoc()) $groups[] = $row;

    $media = media_rows($db);
    $res4 = $db->query('SELECT id,name,created_at FROM media_folders ORDER BY id ASC');
    while ($row = $res4->fetch_assoc()) $folders[] = $row;

    json_out(array('ok' => true, 'models' => $models, 'options' => $options, 'groups' => $groups, 'media' => $media, 'folders' => $folders));
}

if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'media_list') {
    $media = media_rows($db);
    $folders = array();
    $res2 = $db->query('SELECT id,name,created_at FROM media_folders ORDER BY id ASC');
    while ($row = $res2->fetch_assoc()) $folders[] = $row;
    json_out(array('ok' => true, 'media' => $media, 'folders' => $folders));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'create_media_folder') {
    $name = isset($_POST['name']) ? trim($_POST['name']) : '';
    if ($name === '') json_out(array('ok' => false, 'error' => 'name required'));
    $stmt = $db->prepare('INSERT INTO media_folders (name) VALUES (?)');
    $stmt->bind_param('s', $name);
    $stmt->execute();
    json_out(array('ok' => true, 'id' => $db->insert_id));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'update_media_folder') {
    $id = intval(isset($_POST['id']) ? $_POST['id'] : 0);
    $name = isset($_POST['name']) ? trim($_POST['name']) : '';
    if ($id <= 0 || $name === '') json_out(array('ok' => false, 'error' => 'id/name required'));
    $stmt = $db->prepare('UPDATE media_folders SET name=? WHERE id=?');
    $stmt->bind_param('si', $name, $id);
    $stmt->execute();
    json_out(array('ok' => true));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'copy_media_folder') {
    $id = intval(isset($_POST['id']) ? $_POST['id'] : 0);
    if ($id <= 0) json_out(array('ok' => false, 'error' => 'id required'));
    $stmt = $db->prepare('SELECT name FROM media_folders WHERE id=?');
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    if (!$row) json_out(array('ok' => false, 'error' => 'not found'));
    $new_name = $row['name'] . ' копия';
    $stmt2 = $db->prepare('INSERT INTO media_folders (name) VALUES (?)');
    $stmt2->bind_param('s', $new_name);
    $stmt2->execute();
    json_out(array('ok' => true, 'id' => $db->insert_id));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'delete_media_folder') {
    $id = intval(isset($_POST['id']) ? $_POST['id'] : 0);
    if ($id <= 0) json_out(array('ok' => false, 'error' => 'id required'));
    $stmt = $db->prepare('SELECT COUNT(*) c FROM media_library WHERE folder_id=?');
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    if ($row && intval($row['c']) > 0) {
        json_out(array('ok' => false, 'error' => 'Папка не пуста'));
    }
    $stmt2 = $db->prepare('DELETE FROM media_folders WHERE id=?');
    $stmt2->bind_param('i', $id);
    $stmt2->execute();
    json_out(array('ok' => true));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'move_media') {
    $id = intval(isset($_POST['id']) ? $_POST['id'] : 0);
    $folder_raw = isset($_POST['folder_id']) ? trim($_POST['folder_id']) : '';
    if ($id <= 0) json_out(array('ok' => false, 'error' => 'id required'));
    if ($folder_raw === '' || $folder_raw === '0') {
        $stmt = $db->prepare('UPDATE media_library SET folder_id=NULL WHERE id=?');
        $stmt->bind_param('i', $id);
        $stmt->execute();
    } else {
        $folder_id = intval($folder_raw);
        $stmt = $db->prepare('UPDATE media_library SET folder_id=? WHERE id=?');
        $stmt->bind_param('ii', $folder_id, $id);
        $stmt->execute();
    }
    json_out(array('ok' => true));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'delete_media') {
    $jd = json_decode(file_get_contents('php://input'), true);
    $id = intval(isset($jd['id']) ? $jd['id'] : (isset($_POST['id']) ? $_POST['id'] : 0));
    if ($id <= 0) json_out(array('ok' => false, 'error' => 'id required'));

    $stmt = $db->prepare('SELECT file_url FROM media_library WHERE id=?');
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    if (!$row) json_out(array('ok' => false, 'error' => 'not found'));

    $file_url = $row['file_url'];
    $file_path = media_file_path($file_url);

    $stmt2 = $db->prepare('DELETE FROM media_library WHERE id=?');
    $stmt2->bind_param('i', $id);
    $stmt2->execute();

    $same_url = 0;
    $stmt3 = $db->prepare('SELECT COUNT(*) c FROM media_library WHERE file_url=?');
    $stmt3->bind_param('s', $file_url);
    $stmt3->execute();
    $count_row = $stmt3->get_result()->fetch_assoc();
    if ($count_row) $same_url = intval($count_row['c']);

    if ($same_url === 0 && $file_path !== '' && is_file($file_path)) {
        @unlink($file_path);
    }

    json_out(array('ok' => true));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'update_media') {
    $id = intval(isset($_POST['id']) ? $_POST['id'] : 0);
    $name = isset($_POST['name']) ? trim($_POST['name']) : '';
    if ($id <= 0 || $name === '') json_out(array('ok' => false, 'error' => 'id/name required'));
    $stmt = $db->prepare('UPDATE media_library SET file_name=? WHERE id=?');
    $stmt->bind_param('si', $name, $id);
    $stmt->execute();
    json_out(array('ok' => true));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'copy_media') {
    $id = intval(isset($_POST['id']) ? $_POST['id'] : 0);
    if ($id <= 0) json_out(array('ok' => false, 'error' => 'id required'));
    $stmt = $db->prepare('SELECT file_url,file_name,mime_type,file_size,folder_id FROM media_library WHERE id=?');
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    if (!$row) json_out(array('ok' => false, 'error' => 'not found'));
    $source_path = media_file_path($row['file_url']);
    if ($source_path === '' || !is_file($source_path)) json_out(array('ok' => false, 'error' => 'file missing'));
    $ext = pathinfo($source_path, PATHINFO_EXTENSION);
    $stored_name = 'img_' . date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . ($ext !== '' ? '.' . strtolower($ext) : '');
    $target_path = media_storage_dir() . DIRECTORY_SEPARATOR . $stored_name;
    if (!copy($source_path, $target_path) || !is_file($target_path)) {
        json_out(array('ok' => false, 'error' => 'copy failed'));
    }
    $new_name = preg_replace('/(\.[a-z0-9]+)$/i', ' копия$1', $row['file_name']);
    if ($new_name === $row['file_name']) $new_name = $row['file_name'] . ' копия';
    $new_url = '/uploads/' . $stored_name;
    $new_size = intval(filesize($target_path));
    $stmt2 = $db->prepare('INSERT INTO media_library (file_url,file_name,mime_type,file_size,folder_id) VALUES (?,?,?,?,?)');
    $folder = isset($row['folder_id']) ? intval($row['folder_id']) : null;
    $stmt2->bind_param('sssii', $new_url, $new_name, $row['mime_type'], $new_size, $folder);
    if (!$stmt2->execute()) {
        @unlink($target_path);
        json_out(array('ok' => false, 'error' => 'database write failed'));
    }
    json_out(array('ok' => true, 'id' => $db->insert_id));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'create_model') {
    $raw = file_get_contents('php://input');
    $jd = $raw ? json_decode($raw, true) : null;
    $d = (is_array($jd) && !empty($jd)) ? $jd : $_POST;
    $name = isset($d['name']) ? trim($d['name']) : '';
    $image_url = isset($d['image_url']) ? trim($d['image_url']) : '';
    $base_price = floatval(isset($d['base_price']) ? $d['base_price'] : 300000);
    if ($name === '') json_out(array('ok' => false, 'error' => 'Model name required'));
    $stmt = $db->prepare('INSERT INTO models (name, image_url, base_price) VALUES (?, ?, ?)');
    $stmt->bind_param('ssd', $name, $image_url, $base_price);
    $stmt->execute();
    json_out(array('ok' => true, 'id' => $db->insert_id));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'update_model') {
    $raw = file_get_contents('php://input');
    $jd = $raw ? json_decode($raw, true) : null;
    $d = (is_array($jd) && !empty($jd)) ? $jd : $_POST;
    $id = intval(isset($d['id']) ? $d['id'] : 0);
    $name = isset($d['name']) ? trim($d['name']) : '';
    $image_url = isset($d['image_url']) ? trim($d['image_url']) : '';
    $base_price = floatval(isset($d['base_price']) ? $d['base_price'] : 300000);
    if ($id <= 0 || $name === '') json_out(array('ok' => false, 'error' => 'id/name required'));
    $stmt = $db->prepare('UPDATE models SET name=?, image_url=?, base_price=? WHERE id=?');
    $stmt->bind_param('ssdi', $name, $image_url, $base_price, $id);
    $stmt->execute();
    json_out(array('ok' => true));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'update_model_image') {
    $d = json_decode(file_get_contents('php://input'), true);
    $id = intval(isset($d['id']) ? $d['id'] : 0);
    $image_url = isset($d['image_url']) ? trim($d['image_url']) : '';
    if ($id <= 0) json_out(array('ok' => false, 'error' => 'id required'));
    $stmt = $db->prepare('UPDATE models SET image_url=? WHERE id=?');
    $stmt->bind_param('si', $image_url, $id);
    $stmt->execute();
    json_out(array('ok' => true));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'update_option_image') {
    $d = json_decode(file_get_contents('php://input'), true);
    $id = intval(isset($d['id']) ? $d['id'] : 0);
    $image_url = isset($d['image_url']) ? trim($d['image_url']) : '';
    $image_crop = isset($d['image_crop']) ? $d['image_crop'] : null;
    if ($id <= 0) json_out(array('ok' => false, 'error' => 'id required'));
    $stmt = $db->prepare('UPDATE options_catalog SET image_url=?, image_crop=? WHERE id=?');
    $stmt->bind_param('ssi', $image_url, $image_crop, $id);
    $stmt->execute();
    json_out(array('ok' => true));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'duplicate_model') {
    $d = json_decode(file_get_contents('php://input'), true);
    $src_id = intval(isset($d['id']) ? $d['id'] : 0);
    if ($src_id <= 0) json_out(array('ok' => false, 'error' => 'id required'));

    $db->begin_transaction();
    try {
        $r = $db->query("SELECT * FROM models WHERE id=$src_id LIMIT 1");
        $src = $r ? $r->fetch_assoc() : null;
        if (!$src) throw new Exception('source not found');

        $new_name = substr($src['name'], 0, 140) . ' — копия';
        $stmt = $db->prepare('INSERT INTO models (name,image_url,base_price) VALUES (?,?,?)');
        $stmt->bind_param('ssd', $new_name, $src['image_url'], $src['base_price']);
        $stmt->execute();
        $new_id = $db->insert_id;

        // layouts (one-to-many)
        $lr = $db->query("SELECT * FROM layouts WHERE model_id=$src_id ORDER BY sort_order ASC");
        if ($lr) {
            $ls = $db->prepare('INSERT INTO layouts (model_id,name,price_modifier,sort_order) VALUES (?,?,?,?)');
            while ($l = $lr->fetch_assoc()) {
                $ls->bind_param('isdi', $new_id, $l['name'], $l['price_modifier'], $l['sort_order']);
                $ls->execute();
            }
        }

        // option availability (many-to-many)
        $ar = $db->query("SELECT option_id, is_active FROM option_model_availability WHERE model_id=$src_id");
        if ($ar) {
            $as = $db->prepare('INSERT IGNORE INTO option_model_availability (option_id,model_id,is_active) VALUES (?,?,?)');
            while ($a = $ar->fetch_assoc()) {
                $as->bind_param('iii', $a['option_id'], $new_id, $a['is_active']);
                $as->execute();
            }
        }

        // model page (optional one-to-one)
        $pr = $db->query("SELECT page_json FROM model_pages WHERE model_id=$src_id LIMIT 1");
        if ($pr && $pr->num_rows > 0) {
            $pj = $pr->fetch_assoc()['page_json'];
            $ps = $db->prepare('INSERT INTO model_pages (model_id,page_json) VALUES (?,?)');
            $ps->bind_param('is', $new_id, $pj);
            $ps->execute();
        }

        $db->commit();
        json_out(array('ok' => true, 'id' => $new_id, 'name' => $new_name));
    } catch (Exception $e) {
        $db->rollback();
        json_out(array('ok' => false, 'error' => $e->getMessage()));
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'delete_model') {
    $raw = file_get_contents('php://input');
    $jd = $raw ? json_decode($raw, true) : null;
    $d = (is_array($jd) && !empty($jd)) ? $jd : $_POST;
    $id = intval(isset($d['id']) ? $d['id'] : 0);
    if ($id <= 0) json_out(array('ok' => false, 'error' => 'id required'));
    $stmt = $db->prepare('DELETE FROM models WHERE id=?');
    $stmt->bind_param('i', $id);
    $stmt->execute();
    json_out(array('ok' => true));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'copy_model') {
    $source_id = intval(isset($_POST['source_id']) ? $_POST['source_id'] : 0);
    if ($source_id <= 0) json_out(array('ok' => false, 'error' => 'source_id required'));

    $stmt = $db->prepare('SELECT name, image_url, base_price FROM models WHERE id=?');
    $stmt->bind_param('i', $source_id);
    $stmt->execute();
    $res = $stmt->get_result();
    $model = $res->fetch_assoc();
    if (!$model) json_out(array('ok' => false, 'error' => 'Model not found'));

    $new_name = $model['name'] . ' копия';
    $image_url = isset($model['image_url']) ? $model['image_url'] : '';
    $base_price = isset($model['base_price']) ? floatval($model['base_price']) : 300000;
    $stmt2 = $db->prepare('INSERT INTO models (name, image_url, base_price) VALUES (?, ?, ?)');
    $stmt2->bind_param('ssd', $new_name, $image_url, $base_price);
    $stmt2->execute();
    $new_id = $db->insert_id;

    $stmt3 = $db->prepare('SELECT page_json FROM model_pages WHERE model_id=?');
    $stmt3->bind_param('i', $source_id);
    $stmt3->execute();
    $res3 = $stmt3->get_result();
    $page = $res3->fetch_assoc();
    if ($page && isset($page['page_json'])) {
        $stmt4 = $db->prepare('INSERT INTO model_pages (model_id,page_json) VALUES (?,?)');
        $stmt4->bind_param('is', $new_id, $page['page_json']);
        $stmt4->execute();
    }
    json_out(array('ok' => true, 'id' => $new_id));
}

function save_option_models($db, $option_id) {
    $raw = isset($_POST['model_ids']) ? trim($_POST['model_ids']) : '';
    $db->query('DELETE FROM option_model_availability WHERE option_id=' . intval($option_id));
    if ($raw === '') return;
    $ids = json_decode($raw, true);
    if (!is_array($ids)) $ids = explode(',', $raw);
    $stmt = $db->prepare('INSERT IGNORE INTO option_model_availability (option_id, model_id) VALUES (?, ?)');
    foreach ($ids as $id) {
        $model_id = intval($id);
        if ($model_id <= 0) continue;
        $stmt->bind_param('ii', $option_id, $model_id);
        $stmt->execute();
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'create_option') {
    $group_id = isset($_POST['group_id']) ? intval($_POST['group_id']) : 0;
    $name = isset($_POST['name']) ? trim($_POST['name']) : '';
    $image_url = isset($_POST['image_url']) ? trim($_POST['image_url']) : '';
    $price = isset($_POST['price']) ? floatval($_POST['price']) : 0;
    $description = isset($_POST['description']) ? trim($_POST['description']) : '';
    $features = isset($_POST['features']) ? $_POST['features'] : '[]';
    if ($name === '') json_out(array('ok' => false, 'error' => 'Option name required'));
    if ($group_id <= 0) $group_id = null;
    $stmt = $db->prepare('INSERT INTO options_catalog (group_id,name,image_url,price,description,features_json) VALUES (?,?,?,?,?,?)');
    $stmt->bind_param('issdss', $group_id, $name, $image_url, $price, $description, $features);
    $stmt->execute();
    $new_id = $db->insert_id;
    save_option_models($db, $new_id);
    json_out(array('ok' => true, 'id' => $new_id));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'update_option') {
    $id = intval(isset($_POST['id']) ? $_POST['id'] : 0);
    $group_id = isset($_POST['group_id']) ? intval($_POST['group_id']) : 0;
    $name = isset($_POST['name']) ? trim($_POST['name']) : '';
    $image_url = isset($_POST['image_url']) ? trim($_POST['image_url']) : '';
    $price = isset($_POST['price']) ? floatval($_POST['price']) : 0;
    $description = isset($_POST['description']) ? trim($_POST['description']) : '';
    $features = isset($_POST['features']) ? $_POST['features'] : '[]';
    if ($id <= 0 || $name === '') json_out(array('ok' => false, 'error' => 'id/name required'));
    if ($group_id <= 0) $group_id = null;
    $stmt = $db->prepare('UPDATE options_catalog SET group_id=?, name=?, image_url=?, price=?, description=?, features_json=? WHERE id=?');
    $stmt->bind_param('issdssi', $group_id, $name, $image_url, $price, $description, $features, $id);
    $stmt->execute();
    save_option_models($db, $id);
    json_out(array('ok' => true));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'delete_option') {
    $id = intval(isset($_POST['id']) ? $_POST['id'] : 0);
    if ($id <= 0) json_out(array('ok' => false, 'error' => 'id required'));
    $stmt = $db->prepare('DELETE FROM options_catalog WHERE id=?');
    $stmt->bind_param('i', $id);
    $stmt->execute();
    json_out(array('ok' => true));
}

if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'get_page') {
    $model_id = intval(isset($_GET['model_id']) ? $_GET['model_id'] : 0);
    if ($model_id <= 0) json_out(array('ok' => false, 'error' => 'model_id required'));
    $stmt = $db->prepare('SELECT page_json FROM model_pages WHERE model_id=?');
    $stmt->bind_param('i', $model_id);
    $stmt->execute();
    $res = $stmt->get_result();
    $row = $res->fetch_assoc();
    json_out(array('ok' => true, 'page_json' => $row ? $row['page_json'] : ''));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'save_page') {
    $model_id = intval(isset($_POST['model_id']) ? $_POST['model_id'] : 0);
    $page_json = isset($_POST['page_json']) ? $_POST['page_json'] : '';
    if ($model_id <= 0) json_out(array('ok' => false, 'error' => 'model_id required'));

    $stmt = $db->prepare('SELECT model_id FROM model_pages WHERE model_id=?');
    $stmt->bind_param('i', $model_id);
    $stmt->execute();
    $exists = $stmt->get_result()->fetch_assoc();

    if ($exists) {
        $stmt2 = $db->prepare('UPDATE model_pages SET page_json=? WHERE model_id=?');
        $stmt2->bind_param('si', $page_json, $model_id);
        $stmt2->execute();
    } else {
        $stmt3 = $db->prepare('INSERT INTO model_pages (model_id,page_json) VALUES (?,?)');
        $stmt3->bind_param('is', $model_id, $page_json);
        $stmt3->execute();
    }
    json_out(array('ok' => true));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'upload_image') {
    if (!isset($_FILES['file']) || !is_uploaded_file($_FILES['file']['tmp_name'])) {
        json_out(array('ok' => false, 'error' => 'Файл не получен'));
    }

    $file = $_FILES['file'];
    if ($file['error'] !== UPLOAD_ERR_OK) {
        $map = array(
            UPLOAD_ERR_INI_SIZE => 'Файл слишком большой для сервера',
            UPLOAD_ERR_FORM_SIZE => 'Файл слишком большой',
            UPLOAD_ERR_PARTIAL => 'Файл загружен частично',
            UPLOAD_ERR_NO_FILE => 'Файл не выбран',
            UPLOAD_ERR_NO_TMP_DIR => 'На сервере нет временной папки',
            UPLOAD_ERR_CANT_WRITE => 'Сервер не может записать файл',
            UPLOAD_ERR_EXTENSION => 'Загрузка остановлена расширением PHP'
        );
        $msg = isset($map[$file['error']]) ? $map[$file['error']] : 'Ошибка загрузки';
        json_out(array('ok' => false, 'error' => $msg));
    }

    $allowed = array('image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'image/gif' => 'gif');
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);
    if (!isset($allowed[$mime])) {
        json_out(array('ok' => false, 'error' => 'Разрешены только изображения'));
    }

    $uploads_dir = __DIR__ . '/../uploads';
    if (!is_dir($uploads_dir)) {
        mkdir($uploads_dir, 0755, true);
    }

    $ext = $allowed[$mime];
    $name = 'img_' . date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
    $target = $uploads_dir . '/' . $name;
    if (!move_uploaded_file($file['tmp_name'], $target) || !is_file($target) || filesize($target) <= 0) {
        json_out(array('ok' => false, 'error' => 'Не удалось сохранить файл'));
    }

    $file_url = '/uploads/' . $name;
    $folder_raw = isset($_POST['folder_id']) ? trim($_POST['folder_id']) : '';
    $size = intval(filesize($target));
    if ($folder_raw === '' || $folder_raw === '0') {
        $stmtm = $db->prepare('INSERT INTO media_library (file_url,file_name,mime_type,file_size,folder_id) VALUES (?,?,?, ?, NULL)');
        $stmtm->bind_param('sssi', $file_url, $name, $mime, $size);
        if (!$stmtm->execute()) {
            @unlink($target);
            json_out(array('ok' => false, 'error' => 'database write failed'));
        }
    } else {
        $folder_id = intval($folder_raw);
        $stmtm = $db->prepare('INSERT INTO media_library (file_url,file_name,mime_type,file_size,folder_id) VALUES (?,?,?,?,?)');
        $stmtm->bind_param('sssii', $file_url, $name, $mime, $size, $folder_id);
        if (!$stmtm->execute()) {
            @unlink($target);
            json_out(array('ok' => false, 'error' => 'database write failed'));
        }
    }

    json_out(array('ok' => true, 'url' => $file_url));
}

// ── Layouts CRUD ──────────────────────────────────────────────────────────────

if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'get_layouts') {
    $model_id = intval(isset($_GET['model_id']) ? $_GET['model_id'] : 0);
    if ($model_id <= 0) json_out(array('ok' => false, 'error' => 'model_id required'));
    $stmt = $db->prepare('SELECT id, model_id, name, price_modifier, sort_order FROM layouts WHERE model_id=? ORDER BY sort_order ASC, id ASC');
    $stmt->bind_param('i', $model_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $rows = array();
    while ($row = $result->fetch_assoc()) $rows[] = $row;
    json_out(array('ok' => true, 'layouts' => $rows));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'create_layout') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) { parse_str(file_get_contents('php://input'), $data); }
    if (!$data) $data = $_POST;
    $model_id = intval(isset($data['model_id']) ? $data['model_id'] : 0);
    $name = isset($data['name']) ? trim($data['name']) : '';
    $price_modifier = floatval(isset($data['price_modifier']) ? $data['price_modifier'] : 0);
    $sort_order = intval(isset($data['sort_order']) ? $data['sort_order'] : 0);
    if ($model_id <= 0 || $name === '') json_out(array('ok' => false, 'error' => 'model_id and name required'));
    $stmt = $db->prepare('INSERT INTO layouts (model_id, name, price_modifier, sort_order) VALUES (?, ?, ?, ?)');
    $stmt->bind_param('isdi', $model_id, $name, $price_modifier, $sort_order);
    $stmt->execute();
    json_out(array('ok' => true, 'id' => $db->insert_id));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'update_layout') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) { parse_str(file_get_contents('php://input'), $data); }
    if (!$data) $data = $_POST;
    $id = intval(isset($data['id']) ? $data['id'] : 0);
    $name = isset($data['name']) ? trim($data['name']) : '';
    $price_modifier = floatval(isset($data['price_modifier']) ? $data['price_modifier'] : 0);
    if ($id <= 0 || $name === '') json_out(array('ok' => false, 'error' => 'id and name required'));
    $stmt = $db->prepare('UPDATE layouts SET name=?, price_modifier=? WHERE id=?');
    $stmt->bind_param('sdi', $name, $price_modifier, $id);
    $stmt->execute();
    json_out(array('ok' => true));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'delete_layout') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) { parse_str(file_get_contents('php://input'), $data); }
    if (!$data) $data = $_POST;
    $id = intval(isset($data['id']) ? $data['id'] : 0);
    if ($id <= 0) json_out(array('ok' => false, 'error' => 'id required'));
    $stmt = $db->prepare('DELETE FROM layouts WHERE id=?');
    $stmt->bind_param('i', $id);
    $stmt->execute();
    json_out(array('ok' => true));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'update_group_selection') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) { parse_str(file_get_contents('php://input'), $data); }
    if (!$data) $data = $_POST;
    $id = intval(isset($data['id']) ? $data['id'] : 0);
    $selection_type = isset($data['selection_type']) ? trim($data['selection_type']) : 'multiple';
    if (!in_array($selection_type, array('single', 'multiple'))) $selection_type = 'multiple';
    if ($id <= 0) json_out(array('ok' => false, 'error' => 'id required'));
    $stmt = $db->prepare('UPDATE option_groups SET selection_type=? WHERE id=?');
    $stmt->bind_param('si', $selection_type, $id);
    $stmt->execute();
    json_out(array('ok' => true));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'reorder_models') {
    $data = json_decode(file_get_contents('php://input'), true);
    $items = isset($data['items']) ? $data['items'] : array();
    if (!is_array($items) || count($items) === 0) json_out(array('ok' => false, 'error' => 'items required'));
    $db->begin_transaction();
    try {
        $stmt = $db->prepare('UPDATE models SET sort_order=? WHERE id=?');
        foreach ($items as $item) {
            $ord = intval($item['sort_order']); $id = intval($item['id']);
            $stmt->bind_param('ii', $ord, $id); $stmt->execute();
        }
        $db->commit();
        json_out(array('ok' => true));
    } catch (Exception $e) { $db->rollback(); json_out(array('ok' => false, 'error' => $e->getMessage())); }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'reorder_groups') {
    $data = json_decode(file_get_contents('php://input'), true);
    $items = isset($data['items']) ? $data['items'] : array();
    if (!is_array($items) || count($items) === 0) json_out(array('ok' => false, 'error' => 'items required'));
    $db->begin_transaction();
    try {
        $stmt = $db->prepare('UPDATE option_groups SET sort_order=? WHERE id=?');
        foreach ($items as $item) {
            $ord = intval($item['sort_order']); $id = intval($item['id']);
            $stmt->bind_param('ii', $ord, $id); $stmt->execute();
        }
        $db->commit();
        json_out(array('ok' => true));
    } catch (Exception $e) { $db->rollback(); json_out(array('ok' => false, 'error' => $e->getMessage())); }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'reorder_options') {
    $data = json_decode(file_get_contents('php://input'), true);
    $items = isset($data['items']) ? $data['items'] : array();
    if (!is_array($items) || count($items) === 0) json_out(array('ok' => false, 'error' => 'items required'));
    $db->begin_transaction();
    try {
        $stmt = $db->prepare('UPDATE options_catalog SET sort_order=? WHERE id=?');
        foreach ($items as $item) {
            $id = intval($item['id']);
            $ord = intval($item['sort_order']);
            if ($id <= 0) continue;
            $stmt->bind_param('ii', $ord, $id);
            $stmt->execute();
        }
        $db->commit();
        json_out(array('ok' => true));
    } catch (Exception $e) {
        $db->rollback();
        json_out(array('ok' => false, 'error' => $e->getMessage()));
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'create_group') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) $data = $_POST;
    $name = isset($data['name']) ? trim($data['name']) : '';
    if ($name === '') json_out(array('ok' => false, 'error' => 'name required'));
    $sort = isset($data['sort_order']) ? intval($data['sort_order']) : 100;
    $stmt = $db->prepare('INSERT INTO option_groups (name, sort_order) VALUES (?, ?)');
    $stmt->bind_param('si', $name, $sort);
    $stmt->execute();
    json_out(array('ok' => true, 'id' => $db->insert_id));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'delete_group') {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = intval(isset($data['id']) ? $data['id'] : 0);
    if ($id <= 0) json_out(array('ok' => false, 'error' => 'id required'));
    $stmt = $db->prepare('DELETE FROM option_groups WHERE id=?');
    $stmt->bind_param('i', $id);
    $stmt->execute();
    json_out(array('ok' => true));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'create_option_json') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) json_out(array('ok' => false, 'error' => 'invalid json'));
    $group_id = intval(isset($data['group_id']) ? $data['group_id'] : 0);
    $model_id  = intval(isset($data['model_id'])  ? $data['model_id']  : 0);
    $name      = isset($data['name'])  ? trim($data['name'])  : '';
    $price     = floatval(isset($data['price']) ? $data['price'] : 0);
    $image_url = isset($data['image_url']) ? trim($data['image_url']) : '';
    if ($name === '') json_out(array('ok' => false, 'error' => 'name required'));
    if ($group_id <= 0) json_out(array('ok' => false, 'error' => 'group_id required'));
    $stmt = $db->prepare('INSERT INTO options_catalog (group_id,name,image_url,price,description,features_json) VALUES (?,?,?,?,?,?)');
    $empty = ''; $features = '[]';
    $stmt->bind_param('issdss', $group_id, $name, $image_url, $price, $empty, $features);
    $stmt->execute();
    $new_id = $db->insert_id;
    if ($model_id > 0) {
        $stmt2 = $db->prepare('INSERT IGNORE INTO option_model_availability (option_id, model_id, is_active) VALUES (?, ?, 1)');
        $stmt2->bind_param('ii', $new_id, $model_id);
        $stmt2->execute();
    }
    json_out(array('ok' => true, 'id' => $new_id));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'update_option_json') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) json_out(array('ok' => false, 'error' => 'invalid json'));
    $id    = intval(isset($data['id'])    ? $data['id']    : 0);
    $name  = isset($data['name'])  ? trim($data['name'])  : '';
    $price = floatval(isset($data['price']) ? $data['price'] : 0);
    if ($id <= 0 || $name === '') json_out(array('ok' => false, 'error' => 'id/name required'));
    $stmt = $db->prepare('UPDATE options_catalog SET name=?, price=? WHERE id=?');
    $stmt->bind_param('sdi', $name, $price, $id);
    $stmt->execute();
    json_out(array('ok' => true));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'delete_option_json') {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = intval(isset($data['id']) ? $data['id'] : 0);
    if ($id <= 0) json_out(array('ok' => false, 'error' => 'id required'));
    $stmt = $db->prepare('DELETE FROM options_catalog WHERE id=?');
    $stmt->bind_param('i', $id);
    $stmt->execute();
    json_out(array('ok' => true));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'toggle_option_active') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) $data = $_POST;
    $option_id = intval(isset($data['option_id']) ? $data['option_id'] : 0);
    $model_id  = intval(isset($data['model_id'])  ? $data['model_id']  : 0);
    $is_active = intval(isset($data['is_active'])  ? $data['is_active']  : 1) ? 1 : 0;
    if ($option_id <= 0 || $model_id <= 0) json_out(array('ok' => false, 'error' => 'option_id and model_id required'));
    $stmt = $db->prepare('UPDATE option_model_availability SET is_active=? WHERE option_id=? AND model_id=?');
    $stmt->bind_param('iii', $is_active, $option_id, $model_id);
    $stmt->execute();
    json_out(array('ok' => true, 'affected' => $db->affected_rows));
}

// ── Calculations ───────────────────────────────────────────────────────────────

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'create_calculation') {
    $body = json_decode(file_get_contents('php://input'), true);
    if (!$body) json_out(array('ok' => false, 'error' => 'invalid json'));
    $model_id = intval(isset($body['model_id']) ? $body['model_id'] : 0);
    $layout_id = intval(isset($body['layout_id']) ? $body['layout_id'] : 0);
    $selected_option_ids = isset($body['selected_option_ids']) ? array_map('intval', (array)$body['selected_option_ids']) : array();
    $total_price = floatval(isset($body['total_price']) ? $body['total_price'] : 0);
    if ($model_id <= 0) json_out(array('ok' => false, 'error' => 'model_id required'));
    $slug = bin2hex(random_bytes(12));
    $snapshot = json_encode(array('model_id' => $model_id, 'layout_id' => $layout_id, 'selected_option_ids' => $selected_option_ids));
    $stmt = $db->prepare('INSERT INTO calculations (public_slug, config_snapshot, total_price) VALUES (?, ?, ?)');
    $stmt->bind_param('ssd', $slug, $snapshot, $total_price);
    $stmt->execute();
    json_out(array('ok' => true, 'id' => $db->insert_id, 'public_slug' => $slug));
}

if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'get_calculation') {
    $slug = isset($_GET['slug']) ? trim($_GET['slug']) : '';
    if (!$slug) json_out(array('ok' => false, 'error' => 'slug required'));
    $stmt = $db->prepare('SELECT * FROM calculations WHERE public_slug=? LIMIT 1');
    $stmt->bind_param('s', $slug);
    $stmt->execute();
    $calc = $stmt->get_result()->fetch_assoc();
    if (!$calc) json_out(array('ok' => false, 'error' => 'not found'));
    $snapshot = json_decode($calc['config_snapshot'], true);
    $model_id = intval($snapshot['model_id']);
    $layout_id = intval($snapshot['layout_id']);
    $option_ids = isset($snapshot['selected_option_ids']) ? array_map('intval', (array)$snapshot['selected_option_ids']) : array();
    $stmt2 = $db->prepare('SELECT id, name, image_url FROM models WHERE id=? LIMIT 1');
    $stmt2->bind_param('i', $model_id);
    $stmt2->execute();
    $model = $stmt2->get_result()->fetch_assoc();
    $stmt3 = $db->prepare('SELECT id, name FROM layouts WHERE id=? LIMIT 1');
    $stmt3->bind_param('i', $layout_id);
    $stmt3->execute();
    $layout = $stmt3->get_result()->fetch_assoc();
    $selected_options = array();
    if (count($option_ids) > 0) {
        $placeholders = implode(',', array_fill(0, count($option_ids), '?'));
        $types = str_repeat('i', count($option_ids));
        $stmt4 = $db->prepare("SELECT o.id, o.name, o.price, o.image_url, IFNULL(g.name,'Опция') as group_name FROM options_catalog o LEFT JOIN option_groups g ON g.id=o.group_id WHERE o.id IN ($placeholders)");
        $stmt4->bind_param($types, ...$option_ids);
        $stmt4->execute();
        $res = $stmt4->get_result();
        while ($row = $res->fetch_assoc()) $selected_options[] = $row;
    }
    $model_image = $model ? ($model['image_url'] ?? '') : '';
    json_out(array(
        'ok' => true,
        'id' => $calc['id'],
        'public_slug' => $calc['public_slug'],
        'total_price' => floatval($calc['total_price']),
        'fixed_at' => $calc['fixed_at'],
        'model_name' => $model ? $model['name'] : 'Модель',
        'model_image_url' => $model_image,
        'layout_name' => $layout ? $layout['name'] : 'Планировка',
        'selected_options' => $selected_options,
    ));
}

http_response_code(404);
json_out(array('ok' => false, 'error' => 'Unknown route'));


