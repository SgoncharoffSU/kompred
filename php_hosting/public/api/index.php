<?php
require __DIR__ . '/db.php';
require __DIR__ . '/telegram_config.php';

$db = db_connect();
$action = isset($_GET['action']) ? $_GET['action'] : '';

// Every request must be scoped to a tenant workspace. The Next.js proxy in front of
// this API resolves the caller's workspace (from their session, or from ?wid= for the
// public client-facing configurator) and forwards it as X-Workspace-ID — never trust a
// request that arrives without one. get_calculation is the one exception: it's looked
// up by an unguessable public_slug token and derives its own workspace from the stored
// calculation row, so it can't use the header (the fixed-offer page fetches PHP directly,
// without going through the proxy).
$WORKSPACE_ID = isset($_SERVER['HTTP_X_WORKSPACE_ID']) ? intval($_SERVER['HTTP_X_WORKSPACE_ID']) : 0;
if ($WORKSPACE_ID <= 0 && $action !== 'get_calculation') {
    json_out(array('ok' => false, 'error' => 'workspace required'));
}

function media_storage_dir() {
    return realpath(__DIR__ . '/../uploads') ?: (__DIR__ . '/../uploads');
}

// The VPS this runs on has no working outbound IPv6 route, and curl tries it first and
// hangs unless forced to IPv4 (same root cause as the Telegram bot's polling_error fix).
function telegram_notify_managers($text) {
    if (!defined('TELEGRAM_BOT_TOKEN') || !defined('TELEGRAM_MANAGER_GROUP_ID')) return false;
    $ch = curl_init('https://api.telegram.org/bot' . TELEGRAM_BOT_TOKEN . '/sendMessage');
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(array('chat_id' => TELEGRAM_MANAGER_GROUP_ID, 'text' => $text)));
    curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json'));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 8);
    curl_setopt($ch, CURLOPT_IPRESOLVE, CURL_IPRESOLVE_V4);
    curl_exec($ch);
    curl_close($ch);
    return true;
}

// mysqlnd returns native int/float types for prepared-statement results (get_result()) but
// strings for plain query() — the whole frontend was built against the old query()-everywhere
// behavior (ids compared with ===), so every prepared-statement row handed back to the client
// needs its scalar columns restored to strings before any computed array/object fields are
// layered on top.
function stringify_row($row) {
    foreach ($row as $k => $v) {
        if ($v !== null && !is_array($v)) $row[$k] = strval($v);
    }
    return $row;
}

function media_file_path($file_url) {
    $name = basename(parse_url($file_url, PHP_URL_PATH));
    return $name !== '' ? media_storage_dir() . DIRECTORY_SEPARATOR . $name : '';
}

// Strips scripts, event-handler attributes and javascript:/data: URIs from an
// uploaded SVG before it's saved to /uploads — SVGs are XML and can otherwise
// carry an XSS payload that executes if the file is opened directly.
function sanitize_svg($content) {
    if (stripos($content, '<svg') === false) return false;
    libxml_use_internal_errors(true);
    $doc = new DOMDocument();
    $loaded = $doc->loadXML($content, LIBXML_NONET);
    libxml_clear_errors();
    if (!$loaded || !$doc->documentElement || strtolower($doc->documentElement->nodeName) !== 'svg') return false;

    $dangerous_tags = array('script', 'foreignobject', 'iframe', 'object', 'embed', 'link', 'meta', 'style');
    foreach ($dangerous_tags as $tag) {
        $nodes = $doc->getElementsByTagName($tag);
        for ($i = $nodes->length - 1; $i >= 0; $i--) {
            $node = $nodes->item($i);
            $node->parentNode->removeChild($node);
        }
    }

    $all = $doc->getElementsByTagName('*');
    foreach ($all as $el) {
        if (!($el instanceof DOMElement)) continue;
        $to_remove = array();
        foreach ($el->attributes as $attr) {
            $attr_name = strtolower($attr->nodeName);
            $attr_value = trim($attr->nodeValue);
            if (strpos($attr_name, 'on') === 0) { $to_remove[] = $attr->nodeName; continue; }
            if (($attr_name === 'href' || $attr_name === 'xlink:href') && preg_match('/^\s*(javascript|data):/i', $attr_value)) {
                $to_remove[] = $attr->nodeName;
            }
        }
        foreach ($to_remove as $name) $el->removeAttribute($name);
    }

    return $doc->saveXML($doc->documentElement);
}

function media_rows($db, $workspace_id) {
    $rows = array();
    $stmt = $db->prepare('SELECT id,file_url,file_name,mime_type,file_size,IFNULL(folder_id,0) as folder_id,created_at FROM media_library WHERE workspace_id=? ORDER BY id DESC LIMIT 500');
    $stmt->bind_param('i', $workspace_id);
    $stmt->execute();
    $res = $stmt->get_result();
    while ($row = $res->fetch_assoc()) {
        $path = media_file_path($row['file_url']);
        if ($path === '' || !is_file($path)) continue;
        $row['file_url'] = '/uploads/' . basename($path);
        $rows[] = stringify_row($row);
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
$col_check = $db->query("SHOW COLUMNS FROM option_model_availability LIKE 'image_url'");
if ($col_check && $col_check->num_rows === 0) {
    $db->query("ALTER TABLE option_model_availability ADD COLUMN image_url TEXT NULL");
    $db->query("ALTER TABLE option_model_availability ADD COLUMN image_crop VARCHAR(200) NULL");
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
$col_check = $db->query("SHOW COLUMNS FROM models LIKE 'image_crop'");
if ($col_check && $col_check->num_rows === 0) {
    $db->query("ALTER TABLE models ADD COLUMN image_crop VARCHAR(200) DEFAULT NULL");
}
$col_check = $db->query("SHOW COLUMNS FROM models LIKE 'offer_image_crop'");
if ($col_check && $col_check->num_rows === 0) {
    // Independent crop used only by the fixed/generated offer page (calc/[slug]) — the
    // interactive configurator keeps using image_crop, since the two show the photo at very
    // different aspect ratios (square vs wide) and one crop can't look right in both.
    $db->query("ALTER TABLE models ADD COLUMN offer_image_crop VARCHAR(200) DEFAULT NULL");
}
$col_check = $db->query("SHOW COLUMNS FROM option_groups LIKE 'parent_group_id'");
if ($col_check && $col_check->num_rows === 0) {
    $db->query("ALTER TABLE option_groups ADD COLUMN parent_group_id INT NULL");
}
$col_check = $db->query("SHOW COLUMNS FROM option_groups LIKE 'required'");
if ($col_check && $col_check->num_rows === 0) {
    $db->query("ALTER TABLE option_groups ADD COLUMN required TINYINT(1) NOT NULL DEFAULT 1");
}
$col_check = $db->query("SHOW COLUMNS FROM option_groups LIKE 'enlarge_photo'");
if ($col_check && $col_check->num_rows === 0) {
    $db->query("ALTER TABLE option_groups ADD COLUMN enlarge_photo TINYINT(1) NOT NULL DEFAULT 0");
}
$col_check = $db->query("SHOW COLUMNS FROM option_groups LIKE 'block_type'");
if ($col_check && $col_check->num_rows === 0) {
    $db->query("ALTER TABLE option_groups ADD COLUMN block_type VARCHAR(30) NOT NULL DEFAULT 'options'");
}
$col_check = $db->query("SHOW COLUMNS FROM options_catalog LIKE 'max_quantity'");
if ($col_check && $col_check->num_rows === 0) {
    $db->query("ALTER TABLE options_catalog ADD COLUMN max_quantity INT NOT NULL DEFAULT 1");
}
$col_check = $db->query("SHOW COLUMNS FROM options_catalog LIKE 'base_price'");
if ($col_check && $col_check->num_rows === 0) {
    $db->query("ALTER TABLE options_catalog ADD COLUMN base_price DECIMAL(12,2) NOT NULL DEFAULT 0");
}
$col_check = $db->query("SHOW COLUMNS FROM options_catalog LIKE 'is_default'");
if ($col_check && $col_check->num_rows === 0) {
    $db->query("ALTER TABLE options_catalog ADD COLUMN is_default TINYINT(1) NOT NULL DEFAULT 0");
}
$col_check = $db->query("SHOW COLUMNS FROM options_catalog LIKE 'description'");
if ($col_check && $col_check->num_rows === 0) {
    $db->query("ALTER TABLE options_catalog ADD COLUMN description TEXT DEFAULT NULL");
}
$col_check = $db->query("SHOW COLUMNS FROM options_catalog LIKE 'popup_options'");
if ($col_check && $col_check->num_rows === 0) {
    $db->query("ALTER TABLE options_catalog ADD COLUMN popup_options TEXT DEFAULT NULL");
}
$col_check = $db->query("SHOW COLUMNS FROM option_groups LIKE 'block_type'");
if ($col_check && $col_check->num_rows === 0) {
    $db->query("ALTER TABLE option_groups ADD COLUMN block_type VARCHAR(30) NOT NULL DEFAULT 'options'");
}
$db->query("CREATE TABLE IF NOT EXISTS exclusion_rules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    a_type ENUM('group','option') NOT NULL,
    a_id INT NOT NULL,
    b_type ENUM('group','option') NOT NULL,
    b_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_pair (a_type,a_id,b_type,b_id)
)");
$db->query("CREATE TABLE IF NOT EXISTS visibility_rules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    trigger_type ENUM('group','option') NOT NULL,
    trigger_id INT NOT NULL,
    target_type ENUM('group','option') NOT NULL,
    target_id INT NOT NULL,
    effect ENUM('show','hide') NOT NULL DEFAULT 'hide',
    workspace_id INT NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_rule (trigger_type,trigger_id,target_type,target_id)
)");
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
$col_check = $db->query("SHOW COLUMNS FROM option_groups LIKE 'model_ids'");
if ($col_check && $col_check->num_rows === 0) {
    $db->query("ALTER TABLE option_groups ADD COLUMN model_ids TEXT DEFAULT NULL");
}
$col_check = $db->query("SHOW COLUMNS FROM option_groups LIKE 'layout_ids'");
if ($col_check && $col_check->num_rows === 0) {
    $db->query("ALTER TABLE option_groups ADD COLUMN layout_ids TEXT DEFAULT NULL");
}
$col_check = $db->query("SHOW COLUMNS FROM options_catalog LIKE 'max_length'");
if ($col_check && $col_check->num_rows === 0) {
    $db->query("ALTER TABLE options_catalog ADD COLUMN max_length INT NOT NULL DEFAULT 0");
}
$col_check = $db->query("SHOW COLUMNS FROM options_catalog LIKE 'max_width'");
if ($col_check && $col_check->num_rows === 0) {
    $db->query("ALTER TABLE options_catalog ADD COLUMN max_width INT NOT NULL DEFAULT 0");
}
$col_check = $db->query("SHOW COLUMNS FROM options_catalog LIKE 'unit'");
if ($col_check && $col_check->num_rows === 0) {
    $db->query("ALTER TABLE options_catalog ADD COLUMN unit VARCHAR(20) NOT NULL DEFAULT 'шт'");
}
// Tenant scoping: models/option_groups/options_catalog/calculations/media_library already
// had a workspace_id column that the API never actually filtered by. exclusion_rules,
// layouts and media_folders never had one at all. Add it here and backfill every existing
// unscoped row to workspace_id=1 (Сибирия) — the one real tenant all of today's data
// belongs to; the column is nullable so any row we can't attribute just stays invisible
// to every workspace rather than guessing wrong.
$col_check = $db->query("SHOW COLUMNS FROM exclusion_rules LIKE 'workspace_id'");
if ($col_check && $col_check->num_rows === 0) {
    $db->query("ALTER TABLE exclusion_rules ADD COLUMN workspace_id INT NULL DEFAULT NULL");
    $db->query("UPDATE exclusion_rules SET workspace_id=1 WHERE workspace_id IS NULL");
}
$col_check = $db->query("SHOW COLUMNS FROM layouts LIKE 'workspace_id'");
if ($col_check && $col_check->num_rows === 0) {
    $db->query("ALTER TABLE layouts ADD COLUMN workspace_id INT NULL DEFAULT NULL");
    $db->query("UPDATE layouts SET workspace_id=1 WHERE workspace_id IS NULL");
}
$col_check = $db->query("SHOW COLUMNS FROM media_folders LIKE 'workspace_id'");
if ($col_check && $col_check->num_rows === 0) {
    $db->query("ALTER TABLE media_folders ADD COLUMN workspace_id INT NULL DEFAULT NULL");
    $db->query("UPDATE media_folders SET workspace_id=1 WHERE workspace_id IS NULL");
}
// NOTE: models/option_groups/options_catalog/media_library already had a workspace_id
// column before this change. Their existing rows are deliberately NOT auto-backfilled
// here — a handful of `models` rows are still NULL and we don't yet know which tenant
// they belong to; leaving them NULL just makes them invisible to every workspace (safe)
// rather than silently guessing and attaching stray rows to Сибирия's real catalog.
$seed_check = $db->query("SELECT COUNT(*) c FROM option_groups");
if ($seed_check && intval($seed_check->fetch_assoc()['c']) === 0) {
    $db->query("INSERT INTO option_groups (id,name,sort_order) VALUES (1,'Кровля',1),(2,'Цвет бани',2),(3,'Двери',3),(4,'Окна',4)");
}

if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'bootstrap') {
    $models = array();
    $options = array();
    $groups = array();
    $media = array();
    $folders = array();

    $stmt = $db->prepare('SELECT id,name,image_url,image_crop,offer_image_crop,base_price,sort_order,created_at FROM models WHERE workspace_id=? ORDER BY sort_order ASC, id ASC');
    $stmt->bind_param('i', $WORKSPACE_ID);
    $stmt->execute();
    $res = $stmt->get_result();
    while ($row = $res->fetch_assoc()) $models[] = stringify_row($row);

    $availability = array();
    $active_avail = array();
    $photo_overrides = array();
    $ar_stmt = $db->prepare('SELECT oma.option_id, oma.model_id, oma.is_active, oma.image_url, oma.image_crop FROM option_model_availability oma INNER JOIN options_catalog o ON o.id=oma.option_id WHERE o.workspace_id=?');
    $ar_stmt->bind_param('i', $WORKSPACE_ID);
    $ar_stmt->execute();
    $ar = $ar_stmt->get_result();
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
            if (!empty($a['image_url'])) {
                if (!isset($photo_overrides[$oid])) $photo_overrides[$oid] = array();
                $photo_overrides[$oid][$mid] = array('image_url' => $a['image_url'], 'image_crop' => $a['image_crop']);
            }
        }
    }
    $stmt2 = $db->prepare('SELECT o.id,o.group_id,o.sort_order,IFNULL(g.name,\'??? ??????\') as group_name,o.name,o.image_url,o.image_crop,o.price,o.base_price,o.is_default,o.description,o.popup_options,o.features_json,o.max_quantity,o.max_length,o.max_width,o.unit,o.created_at FROM options_catalog o LEFT JOIN option_groups g ON g.id=o.group_id WHERE o.workspace_id=? ORDER BY COALESCE(g.sort_order,9999), o.sort_order ASC, o.id ASC');
    $stmt2->bind_param('i', $WORKSPACE_ID);
    $stmt2->execute();
    $res2 = $stmt2->get_result();
    while ($row = $res2->fetch_assoc()) {
        $row = stringify_row($row);
        $row['features'] = $row['features_json'] ? json_decode($row['features_json'], true) : array();
        unset($row['features_json']);
        $row['popup_options'] = $row['popup_options'] ? json_decode($row['popup_options'], true) : array();
        $row['is_default'] = (int)$row['is_default'];
        $oid = intval($row['id']);
        $row['model_ids'] = isset($availability[$oid]) ? $availability[$oid] : array();
        $row['active_model_ids'] = isset($active_avail[$oid]) ? $active_avail[$oid] : array();
        $row['model_photos'] = isset($photo_overrides[$oid]) ? $photo_overrides[$oid] : new stdClass();
        $options[] = $row;
    }
    $stmt3 = $db->prepare('SELECT id,name,sort_order,selection_type,parent_group_id,required,enlarge_photo,block_type,model_ids,layout_ids,created_at FROM option_groups WHERE workspace_id=? ORDER BY sort_order ASC, id ASC');
    $stmt3->bind_param('i', $WORKSPACE_ID);
    $stmt3->execute();
    $res3 = $stmt3->get_result();
    while ($row = $res3->fetch_assoc()) {
        $row = stringify_row($row);
        $row['model_ids'] = $row['model_ids'] ? json_decode($row['model_ids'], true) : null;
        $row['layout_ids'] = $row['layout_ids'] ? json_decode($row['layout_ids'], true) : null;
        $groups[] = $row;
    }

    $exclusions = array();
    $stmt5 = $db->prepare('SELECT id,a_type,a_id,b_type,b_id FROM exclusion_rules WHERE workspace_id=?');
    $stmt5->bind_param('i', $WORKSPACE_ID);
    $stmt5->execute();
    $res5 = $stmt5->get_result();
    while ($row = $res5->fetch_assoc()) $exclusions[] = stringify_row($row);

    $visibility_rules = array();
    $stmt6 = $db->prepare('SELECT id,trigger_type,trigger_id,target_type,target_id,effect FROM visibility_rules WHERE workspace_id=?');
    $stmt6->bind_param('i', $WORKSPACE_ID);
    $stmt6->execute();
    $res6 = $stmt6->get_result();
    while ($row = $res6->fetch_assoc()) $visibility_rules[] = stringify_row($row);

    $media = media_rows($db, $WORKSPACE_ID);
    $stmt4 = $db->prepare('SELECT id,name,created_at FROM media_folders WHERE workspace_id=? ORDER BY id ASC');
    $stmt4->bind_param('i', $WORKSPACE_ID);
    $stmt4->execute();
    $res4 = $stmt4->get_result();
    while ($row = $res4->fetch_assoc()) $folders[] = stringify_row($row);

    json_out(array('ok' => true, 'models' => $models, 'options' => $options, 'groups' => $groups, 'exclusions' => $exclusions, 'visibility_rules' => $visibility_rules, 'media' => $media, 'folders' => $folders));
}

if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'media_list') {
    $media = media_rows($db, $WORKSPACE_ID);
    $folders = array();
    $stmt2 = $db->prepare('SELECT id,name,created_at FROM media_folders WHERE workspace_id=? ORDER BY id ASC');
    $stmt2->bind_param('i', $WORKSPACE_ID);
    $stmt2->execute();
    $res2 = $stmt2->get_result();
    while ($row = $res2->fetch_assoc()) $folders[] = stringify_row($row);
    json_out(array('ok' => true, 'media' => $media, 'folders' => $folders));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'create_media_folder') {
    $name = isset($_POST['name']) ? trim($_POST['name']) : '';
    if ($name === '') json_out(array('ok' => false, 'error' => 'name required'));
    $stmt = $db->prepare('INSERT INTO media_folders (name, workspace_id) VALUES (?, ?)');
    $stmt->bind_param('si', $name, $WORKSPACE_ID);
    $stmt->execute();
    json_out(array('ok' => true, 'id' => $db->insert_id));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'update_media_folder') {
    $id = intval(isset($_POST['id']) ? $_POST['id'] : 0);
    $name = isset($_POST['name']) ? trim($_POST['name']) : '';
    if ($id <= 0 || $name === '') json_out(array('ok' => false, 'error' => 'id/name required'));
    $stmt = $db->prepare('UPDATE media_folders SET name=? WHERE id=? AND workspace_id=?');
    $stmt->bind_param('sii', $name, $id, $WORKSPACE_ID);
    $stmt->execute();
    json_out(array('ok' => true));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'copy_media_folder') {
    $id = intval(isset($_POST['id']) ? $_POST['id'] : 0);
    if ($id <= 0) json_out(array('ok' => false, 'error' => 'id required'));
    $stmt = $db->prepare('SELECT name FROM media_folders WHERE id=? AND workspace_id=?');
    $stmt->bind_param('ii', $id, $WORKSPACE_ID);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    if (!$row) json_out(array('ok' => false, 'error' => 'not found'));
    $new_name = $row['name'] . ' копия';
    $stmt2 = $db->prepare('INSERT INTO media_folders (name, workspace_id) VALUES (?, ?)');
    $stmt2->bind_param('si', $new_name, $WORKSPACE_ID);
    $stmt2->execute();
    json_out(array('ok' => true, 'id' => $db->insert_id));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'delete_media_folder') {
    $id = intval(isset($_POST['id']) ? $_POST['id'] : 0);
    if ($id <= 0) json_out(array('ok' => false, 'error' => 'id required'));
    $stmt = $db->prepare('SELECT COUNT(*) c FROM media_library WHERE folder_id=? AND workspace_id=?');
    $stmt->bind_param('ii', $id, $WORKSPACE_ID);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    if ($row && intval($row['c']) > 0) {
        json_out(array('ok' => false, 'error' => 'Папка не пуста'));
    }
    $stmt2 = $db->prepare('DELETE FROM media_folders WHERE id=? AND workspace_id=?');
    $stmt2->bind_param('ii', $id, $WORKSPACE_ID);
    $stmt2->execute();
    json_out(array('ok' => true));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'move_media') {
    $id = intval(isset($_POST['id']) ? $_POST['id'] : 0);
    $folder_raw = isset($_POST['folder_id']) ? trim($_POST['folder_id']) : '';
    if ($id <= 0) json_out(array('ok' => false, 'error' => 'id required'));
    if ($folder_raw === '' || $folder_raw === '0') {
        $stmt = $db->prepare('UPDATE media_library SET folder_id=NULL WHERE id=? AND workspace_id=?');
        $stmt->bind_param('ii', $id, $WORKSPACE_ID);
        $stmt->execute();
    } else {
        $folder_id = intval($folder_raw);
        if (!folder_owned_by_workspace($db, $folder_id, $WORKSPACE_ID)) json_out(array('ok' => false, 'error' => 'folder not found'));
        $stmt = $db->prepare('UPDATE media_library SET folder_id=? WHERE id=? AND workspace_id=?');
        $stmt->bind_param('iii', $folder_id, $id, $WORKSPACE_ID);
        $stmt->execute();
    }
    json_out(array('ok' => true));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'delete_media') {
    $jd = json_decode(file_get_contents('php://input'), true);
    $id = intval(isset($jd['id']) ? $jd['id'] : (isset($_POST['id']) ? $_POST['id'] : 0));
    if ($id <= 0) json_out(array('ok' => false, 'error' => 'id required'));

    $stmt = $db->prepare('SELECT file_url FROM media_library WHERE id=? AND workspace_id=?');
    $stmt->bind_param('ii', $id, $WORKSPACE_ID);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    if (!$row) json_out(array('ok' => false, 'error' => 'not found'));

    $file_url = $row['file_url'];
    $file_path = media_file_path($file_url);

    $stmt2 = $db->prepare('DELETE FROM media_library WHERE id=? AND workspace_id=?');
    $stmt2->bind_param('ii', $id, $WORKSPACE_ID);
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
    $stmt = $db->prepare('UPDATE media_library SET file_name=? WHERE id=? AND workspace_id=?');
    $stmt->bind_param('sii', $name, $id, $WORKSPACE_ID);
    $stmt->execute();
    json_out(array('ok' => true));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'copy_media') {
    $id = intval(isset($_POST['id']) ? $_POST['id'] : 0);
    if ($id <= 0) json_out(array('ok' => false, 'error' => 'id required'));
    $stmt = $db->prepare('SELECT file_url,file_name,mime_type,file_size,folder_id FROM media_library WHERE id=? AND workspace_id=?');
    $stmt->bind_param('ii', $id, $WORKSPACE_ID);
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
    $stmt2 = $db->prepare('INSERT INTO media_library (file_url,file_name,mime_type,file_size,folder_id,workspace_id) VALUES (?,?,?,?,?,?)');
    $folder = isset($row['folder_id']) ? intval($row['folder_id']) : null;
    $stmt2->bind_param('sssiii', $new_url, $new_name, $row['mime_type'], $new_size, $folder, $WORKSPACE_ID);
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
    $stmt = $db->prepare('INSERT INTO models (name, image_url, base_price, workspace_id) VALUES (?, ?, ?, ?)');
    $stmt->bind_param('ssdi', $name, $image_url, $base_price, $WORKSPACE_ID);
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
    $stmt = $db->prepare('UPDATE models SET name=?, image_url=?, base_price=? WHERE id=? AND workspace_id=?');
    $stmt->bind_param('ssdii', $name, $image_url, $base_price, $id, $WORKSPACE_ID);
    $stmt->execute();
    json_out(array('ok' => true));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'update_model_image') {
    $d = json_decode(file_get_contents('php://input'), true);
    $id = intval(isset($d['id']) ? $d['id'] : 0);
    $image_url = isset($d['image_url']) ? trim($d['image_url']) : '';
    $image_crop = isset($d['image_crop']) ? $d['image_crop'] : null;
    if ($id <= 0) json_out(array('ok' => false, 'error' => 'id required'));
    $stmt = $db->prepare('UPDATE models SET image_url=?, image_crop=? WHERE id=? AND workspace_id=?');
    $stmt->bind_param('ssii', $image_url, $image_crop, $id, $WORKSPACE_ID);
    $stmt->execute();
    json_out(array('ok' => true));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'update_model_offer_crop') {
    $d = json_decode(file_get_contents('php://input'), true);
    $id = intval(isset($d['id']) ? $d['id'] : 0);
    $image_crop = isset($d['image_crop']) ? $d['image_crop'] : null;
    if ($id <= 0) json_out(array('ok' => false, 'error' => 'id required'));
    $stmt = $db->prepare('UPDATE models SET offer_image_crop=? WHERE id=? AND workspace_id=?');
    $stmt->bind_param('sii', $image_crop, $id, $WORKSPACE_ID);
    $stmt->execute();
    json_out(array('ok' => true));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'update_option_image') {
    $d = json_decode(file_get_contents('php://input'), true);
    $id = intval(isset($d['id']) ? $d['id'] : 0);
    $image_url = isset($d['image_url']) ? trim($d['image_url']) : '';
    $image_crop = isset($d['image_crop']) ? $d['image_crop'] : null;
    if ($id <= 0) json_out(array('ok' => false, 'error' => 'id required'));
    $stmt = $db->prepare('UPDATE options_catalog SET image_url=?, image_crop=? WHERE id=? AND workspace_id=?');
    $stmt->bind_param('ssii', $image_url, $image_crop, $id, $WORKSPACE_ID);
    $stmt->execute();
    json_out(array('ok' => true));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'duplicate_model') {
    $d = json_decode(file_get_contents('php://input'), true);
    $src_id = intval(isset($d['id']) ? $d['id'] : 0);
    if ($src_id <= 0) json_out(array('ok' => false, 'error' => 'id required'));

    $db->begin_transaction();
    try {
        $r = $db->query("SELECT * FROM models WHERE id=$src_id AND workspace_id=$WORKSPACE_ID LIMIT 1");
        $src = $r ? $r->fetch_assoc() : null;
        if (!$src) throw new Exception('source not found');

        $new_name = substr($src['name'], 0, 140) . ' — копия';
        $stmt = $db->prepare('INSERT INTO models (name,image_url,image_crop,offer_image_crop,base_price,workspace_id) VALUES (?,?,?,?,?,?)');
        $stmt->bind_param('ssssdi', $new_name, $src['image_url'], $src['image_crop'], $src['offer_image_crop'], $src['base_price'], $WORKSPACE_ID);
        $stmt->execute();
        $new_id = $db->insert_id;

        // layouts (one-to-many)
        $lr = $db->query("SELECT * FROM layouts WHERE model_id=$src_id AND workspace_id=$WORKSPACE_ID ORDER BY sort_order ASC");
        if ($lr) {
            $ls = $db->prepare('INSERT INTO layouts (model_id,name,price_modifier,sort_order,workspace_id) VALUES (?,?,?,?,?)');
            while ($l = $lr->fetch_assoc()) {
                $ls->bind_param('isdii', $new_id, $l['name'], $l['price_modifier'], $l['sort_order'], $WORKSPACE_ID);
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
    $stmt = $db->prepare('DELETE FROM models WHERE id=? AND workspace_id=?');
    $stmt->bind_param('ii', $id, $WORKSPACE_ID);
    if (!$stmt->execute()) json_out(array('ok' => false, 'error' => $db->error));
    json_out(array('ok' => true));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'copy_model') {
    $source_id = intval(isset($_POST['source_id']) ? $_POST['source_id'] : 0);
    if ($source_id <= 0) json_out(array('ok' => false, 'error' => 'source_id required'));

    $stmt = $db->prepare('SELECT name, image_url, base_price FROM models WHERE id=? AND workspace_id=?');
    $stmt->bind_param('ii', $source_id, $WORKSPACE_ID);
    $stmt->execute();
    $res = $stmt->get_result();
    $model = $res->fetch_assoc();
    if (!$model) json_out(array('ok' => false, 'error' => 'Model not found'));

    $new_name = $model['name'] . ' копия';
    $image_url = isset($model['image_url']) ? $model['image_url'] : '';
    $base_price = isset($model['base_price']) ? floatval($model['base_price']) : 300000;
    $stmt2 = $db->prepare('INSERT INTO models (name, image_url, base_price, workspace_id) VALUES (?, ?, ?, ?)');
    $stmt2->bind_param('ssdi', $new_name, $image_url, $base_price, $WORKSPACE_ID);
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

// Ownership guards: every place that attaches a new row to a request-supplied
// group_id/model_id/parent_group_id must confirm that id actually belongs to the
// caller's own workspace first — otherwise a tenant could reference (and silently
// corrupt) another tenant's catalog just by guessing an id, even without being able
// to read that tenant's data directly.
function group_owned_by_workspace($db, $group_id, $workspace_id) {
    $stmt = $db->prepare('SELECT id FROM option_groups WHERE id=? AND workspace_id=?');
    $stmt->bind_param('ii', $group_id, $workspace_id);
    $stmt->execute();
    return (bool)$stmt->get_result()->fetch_assoc();
}

function model_owned_by_workspace($db, $model_id, $workspace_id) {
    $stmt = $db->prepare('SELECT id FROM models WHERE id=? AND workspace_id=?');
    $stmt->bind_param('ii', $model_id, $workspace_id);
    $stmt->execute();
    return (bool)$stmt->get_result()->fetch_assoc();
}

function option_owned_by_workspace($db, $option_id, $workspace_id) {
    $stmt = $db->prepare('SELECT id FROM options_catalog WHERE id=? AND workspace_id=?');
    $stmt->bind_param('ii', $option_id, $workspace_id);
    $stmt->execute();
    return (bool)$stmt->get_result()->fetch_assoc();
}

function folder_owned_by_workspace($db, $folder_id, $workspace_id) {
    $stmt = $db->prepare('SELECT id FROM media_folders WHERE id=? AND workspace_id=?');
    $stmt->bind_param('ii', $folder_id, $workspace_id);
    $stmt->execute();
    return (bool)$stmt->get_result()->fetch_assoc();
}

function save_option_models($db, $option_id, $workspace_id) {
    $raw = isset($_POST['model_ids']) ? trim($_POST['model_ids']) : '';
    $db->query('DELETE FROM option_model_availability WHERE option_id=' . intval($option_id));
    if ($raw === '') return;
    $ids = json_decode($raw, true);
    if (!is_array($ids)) $ids = explode(',', $raw);
    $stmt = $db->prepare('INSERT IGNORE INTO option_model_availability (option_id, model_id) VALUES (?, ?)');
    foreach ($ids as $id) {
        $model_id = intval($id);
        if ($model_id <= 0) continue;
        if (!model_owned_by_workspace($db, $model_id, $workspace_id)) continue;
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
    $max_quantity = isset($_POST['max_quantity']) ? max(1, intval($_POST['max_quantity'])) : 1;
    $base_price = isset($_POST['base_price']) ? floatval($_POST['base_price']) : 0;
    if ($name === '') json_out(array('ok' => false, 'error' => 'Option name required'));
    if ($group_id <= 0) $group_id = null;
    if ($group_id !== null && !group_owned_by_workspace($db, $group_id, $WORKSPACE_ID)) json_out(array('ok' => false, 'error' => 'group not found'));
    $stmt = $db->prepare('INSERT INTO options_catalog (group_id,name,image_url,price,description,features_json,max_quantity,base_price,workspace_id) VALUES (?,?,?,?,?,?,?,?,?)');
    $stmt->bind_param('issdssidi', $group_id, $name, $image_url, $price, $description, $features, $max_quantity, $base_price, $WORKSPACE_ID);
    $stmt->execute();
    $new_id = $db->insert_id;
    save_option_models($db, $new_id, $WORKSPACE_ID);
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
    $max_quantity = isset($_POST['max_quantity']) ? max(1, intval($_POST['max_quantity'])) : 1;
    $base_price = isset($_POST['base_price']) ? floatval($_POST['base_price']) : 0;
    if ($id <= 0 || $name === '') json_out(array('ok' => false, 'error' => 'id/name required'));
    if ($group_id <= 0) $group_id = null;
    if ($group_id !== null && !group_owned_by_workspace($db, $group_id, $WORKSPACE_ID)) json_out(array('ok' => false, 'error' => 'group not found'));
    $stmt = $db->prepare('UPDATE options_catalog SET group_id=?, name=?, image_url=?, price=?, description=?, features_json=?, max_quantity=?, base_price=? WHERE id=? AND workspace_id=?');
    $stmt->bind_param('issdssidii', $group_id, $name, $image_url, $price, $description, $features, $max_quantity, $base_price, $id, $WORKSPACE_ID);
    $stmt->execute();
    save_option_models($db, $id, $WORKSPACE_ID);
    json_out(array('ok' => true));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'delete_option') {
    $id = intval(isset($_POST['id']) ? $_POST['id'] : 0);
    if ($id <= 0) json_out(array('ok' => false, 'error' => 'id required'));
    $db->query("DELETE FROM exclusion_rules WHERE workspace_id=$WORKSPACE_ID AND ((a_type='option' AND a_id=$id) OR (b_type='option' AND b_id=$id))");
    $db->query("DELETE FROM visibility_rules WHERE workspace_id=$WORKSPACE_ID AND ((trigger_type='option' AND trigger_id=$id) OR (target_type='option' AND target_id=$id))");
    $stmt = $db->prepare('DELETE FROM options_catalog WHERE id=? AND workspace_id=?');
    $stmt->bind_param('ii', $id, $WORKSPACE_ID);
    if (!$stmt->execute()) json_out(array('ok' => false, 'error' => $db->error));
    json_out(array('ok' => true));
}

if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'get_page') {
    $model_id = intval(isset($_GET['model_id']) ? $_GET['model_id'] : 0);
    if ($model_id <= 0) json_out(array('ok' => false, 'error' => 'model_id required'));
    if (!model_owned_by_workspace($db, $model_id, $WORKSPACE_ID)) json_out(array('ok' => false, 'error' => 'model not found'));
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
    if (!model_owned_by_workspace($db, $model_id, $WORKSPACE_ID)) json_out(array('ok' => false, 'error' => 'model not found'));

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

    $is_svg = false;
    if (!isset($allowed[$mime])) {
        // finfo frequently reports SVGs as text/plain or text/xml — sniff the content instead.
        $head = file_get_contents($file['tmp_name'], false, null, 0, 1024);
        if (in_array($mime, array('image/svg+xml', 'text/xml', 'text/plain', 'text/html', 'application/xml'), true)
            && stripos($head, '<svg') !== false) {
            $is_svg = true;
        }
        if (!$is_svg) {
            json_out(array('ok' => false, 'error' => 'Разрешены только изображения'));
        }
    }

    $uploads_dir = __DIR__ . '/../uploads';
    if (!is_dir($uploads_dir)) {
        mkdir($uploads_dir, 0755, true);
    }

    if ($is_svg) {
        $clean = sanitize_svg(file_get_contents($file['tmp_name']));
        if ($clean === false) {
            json_out(array('ok' => false, 'error' => 'Некорректный SVG-файл'));
        }
        $mime = 'image/svg+xml';
        $name = 'img_' . date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '.svg';
        $target = $uploads_dir . '/' . $name;
        if (file_put_contents($target, $clean) === false || !is_file($target) || filesize($target) <= 0) {
            json_out(array('ok' => false, 'error' => 'Не удалось сохранить файл'));
        }
    } else {
        $ext = $allowed[$mime];
        $name = 'img_' . date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
        $target = $uploads_dir . '/' . $name;
        if (!move_uploaded_file($file['tmp_name'], $target) || !is_file($target) || filesize($target) <= 0) {
            json_out(array('ok' => false, 'error' => 'Не удалось сохранить файл'));
        }
    }

    $file_url = '/uploads/' . $name;
    $folder_raw = isset($_POST['folder_id']) ? trim($_POST['folder_id']) : '';
    $size = intval(filesize($target));
    if ($folder_raw === '' || $folder_raw === '0' || !folder_owned_by_workspace($db, intval($folder_raw), $WORKSPACE_ID)) {
        $stmtm = $db->prepare('INSERT INTO media_library (file_url,file_name,mime_type,file_size,folder_id,workspace_id) VALUES (?,?,?,?,NULL,?)');
        $stmtm->bind_param('sssii', $file_url, $name, $mime, $size, $WORKSPACE_ID);
        if (!$stmtm->execute()) {
            @unlink($target);
            json_out(array('ok' => false, 'error' => 'database write failed'));
        }
    } else {
        $folder_id = intval($folder_raw);
        $stmtm = $db->prepare('INSERT INTO media_library (file_url,file_name,mime_type,file_size,folder_id,workspace_id) VALUES (?,?,?,?,?,?)');
        $stmtm->bind_param('sssiii', $file_url, $name, $mime, $size, $folder_id, $WORKSPACE_ID);
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
    $stmt = $db->prepare('SELECT id, model_id, name, price_modifier, sort_order FROM layouts WHERE model_id=? AND workspace_id=? ORDER BY sort_order ASC, id ASC');
    $stmt->bind_param('ii', $model_id, $WORKSPACE_ID);
    $stmt->execute();
    $result = $stmt->get_result();
    $rows = array();
    while ($row = $result->fetch_assoc()) $rows[] = stringify_row($row);
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
    if (!model_owned_by_workspace($db, $model_id, $WORKSPACE_ID)) json_out(array('ok' => false, 'error' => 'model not found'));
    $stmt = $db->prepare('INSERT INTO layouts (model_id, name, price_modifier, sort_order, workspace_id) VALUES (?, ?, ?, ?, ?)');
    $stmt->bind_param('isdii', $model_id, $name, $price_modifier, $sort_order, $WORKSPACE_ID);
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
    $stmt = $db->prepare('UPDATE layouts SET name=?, price_modifier=? WHERE id=? AND workspace_id=?');
    $stmt->bind_param('sdii', $name, $price_modifier, $id, $WORKSPACE_ID);
    $stmt->execute();
    json_out(array('ok' => true));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'delete_layout') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) { parse_str(file_get_contents('php://input'), $data); }
    if (!$data) $data = $_POST;
    $id = intval(isset($data['id']) ? $data['id'] : 0);
    if ($id <= 0) json_out(array('ok' => false, 'error' => 'id required'));
    $stmt = $db->prepare('DELETE FROM layouts WHERE id=? AND workspace_id=?');
    $stmt->bind_param('ii', $id, $WORKSPACE_ID);
    $stmt->execute();
    json_out(array('ok' => true));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'update_group_name') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) { parse_str(file_get_contents('php://input'), $data); }
    if (!$data) $data = $_POST;
    $id = intval(isset($data['id']) ? $data['id'] : 0);
    $name = isset($data['name']) ? trim($data['name']) : '';
    if ($id <= 0 || $name === '') json_out(array('ok' => false, 'error' => 'id/name required'));
    $stmt = $db->prepare('UPDATE option_groups SET name=? WHERE id=? AND workspace_id=?');
    $stmt->bind_param('sii', $name, $id, $WORKSPACE_ID);
    if (!$stmt->execute()) json_out(array('ok' => false, 'error' => $db->error));
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
    $stmt = $db->prepare('UPDATE option_groups SET selection_type=? WHERE id=? AND workspace_id=?');
    $stmt->bind_param('sii', $selection_type, $id, $WORKSPACE_ID);
    $stmt->execute();
    json_out(array('ok' => true));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'update_group_required') {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = intval(isset($data['id']) ? $data['id'] : 0);
    $required = isset($data['required']) ? (intval($data['required']) ? 1 : 0) : 1;
    if ($id <= 0) json_out(array('ok' => false, 'error' => 'id required'));
    $stmt = $db->prepare('UPDATE option_groups SET required=? WHERE id=? AND workspace_id=?');
    $stmt->bind_param('iii', $required, $id, $WORKSPACE_ID);
    if (!$stmt->execute()) json_out(array('ok' => false, 'error' => $db->error));
    json_out(array('ok' => true));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'update_group_enlarge_photo') {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = intval(isset($data['id']) ? $data['id'] : 0);
    $enlarge = isset($data['enlarge_photo']) ? (intval($data['enlarge_photo']) ? 1 : 0) : 0;
    if ($id <= 0) json_out(array('ok' => false, 'error' => 'id required'));
    $stmt = $db->prepare('UPDATE option_groups SET enlarge_photo=? WHERE id=? AND workspace_id=?');
    $stmt->bind_param('iii', $enlarge, $id, $WORKSPACE_ID);
    if (!$stmt->execute()) json_out(array('ok' => false, 'error' => $db->error));
    json_out(array('ok' => true));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'update_group_parent') {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = intval(isset($data['id']) ? $data['id'] : 0);
    $parent_id = isset($data['parent_group_id']) ? intval($data['parent_group_id']) : 0;
    if ($id <= 0) json_out(array('ok' => false, 'error' => 'id required'));
    if ($parent_id === $id) json_out(array('ok' => false, 'error' => 'group cannot be its own parent'));

    // Verify the target group still exists — if it was deleted (e.g. concurrently, during
    // a duplicate cleanup) the UPDATE below would silently affect zero rows and still "succeed".
    if (!group_owned_by_workspace($db, $id, $WORKSPACE_ID)) json_out(array('ok' => false, 'error' => 'group no longer exists'));

    if ($parent_id > 0) {
        if (!group_owned_by_workspace($db, $parent_id, $WORKSPACE_ID)) json_out(array('ok' => false, 'error' => 'parent group no longer exists'));
        $stmt = $db->prepare('UPDATE option_groups SET parent_group_id=? WHERE id=? AND workspace_id=?');
        $stmt->bind_param('iii', $parent_id, $id, $WORKSPACE_ID);
    } else {
        $stmt = $db->prepare('UPDATE option_groups SET parent_group_id=NULL WHERE id=? AND workspace_id=?');
        $stmt->bind_param('ii', $id, $WORKSPACE_ID);
    }
    if (!$stmt->execute()) json_out(array('ok' => false, 'error' => $db->error));
    json_out(array('ok' => true));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'update_group_models') {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = intval(isset($data['id']) ? $data['id'] : 0);
    if ($id <= 0) json_out(array('ok' => false, 'error' => 'id required'));
    $model_ids = isset($data['model_ids']) && is_array($data['model_ids']) ? array_values(array_map('intval', $data['model_ids'])) : null;
    $encoded = $model_ids === null ? null : json_encode($model_ids);
    $stmt = $db->prepare('UPDATE option_groups SET model_ids=? WHERE id=? AND workspace_id=?');
    $stmt->bind_param('sii', $encoded, $id, $WORKSPACE_ID);
    if (!$stmt->execute()) json_out(array('ok' => false, 'error' => $db->error));
    json_out(array('ok' => true));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'update_group_layouts') {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = intval(isset($data['id']) ? $data['id'] : 0);
    if ($id <= 0) json_out(array('ok' => false, 'error' => 'id required'));
    $layout_ids = isset($data['layout_ids']) && is_array($data['layout_ids']) ? array_values(array_map('intval', $data['layout_ids'])) : null;
    $encoded = $layout_ids === null ? null : json_encode($layout_ids);
    $stmt = $db->prepare('UPDATE option_groups SET layout_ids=? WHERE id=? AND workspace_id=?');
    $stmt->bind_param('sii', $encoded, $id, $WORKSPACE_ID);
    if (!$stmt->execute()) json_out(array('ok' => false, 'error' => $db->error));
    json_out(array('ok' => true));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'duplicate_group') {
    $data = json_decode(file_get_contents('php://input'), true);
    $src_id = intval(isset($data['id']) ? $data['id'] : 0);
    if ($src_id <= 0) json_out(array('ok' => false, 'error' => 'id required'));

    $db->begin_transaction();
    try {
        $r = $db->query("SELECT * FROM option_groups WHERE id=$src_id AND workspace_id=$WORKSPACE_ID LIMIT 1");
        $src = $r ? $r->fetch_assoc() : null;
        if (!$src) throw new Exception('source not found');

        $new_name = substr($src['name'], 0, 150) . ' — копия';
        $stmt = $db->prepare('INSERT INTO option_groups (name,sort_order,selection_type,parent_group_id,required,enlarge_photo,block_type,model_ids,layout_ids,workspace_id) VALUES (?,?,?,?,?,?,?,?,?,?)');
        $stmt->bind_param('sisiiisssi', $new_name, $src['sort_order'], $src['selection_type'], $src['parent_group_id'], $src['required'], $src['enlarge_photo'], $src['block_type'], $src['model_ids'], $src['layout_ids'], $WORKSPACE_ID);
        $stmt->execute();
        $new_group_id = $db->insert_id;

        $or = $db->query("SELECT * FROM options_catalog WHERE group_id=$src_id AND workspace_id=$WORKSPACE_ID ORDER BY sort_order ASC");
        if ($or) {
            $os = $db->prepare('INSERT INTO options_catalog (group_id,name,image_url,image_crop,price,base_price,description,features_json,popup_options,is_default,sort_order,max_quantity,max_length,max_width,unit,workspace_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
            while ($opt = $or->fetch_assoc()) {
                $os->bind_param(
                    'isssddsssiiiiisi',
                    $new_group_id, $opt['name'], $opt['image_url'], $opt['image_crop'], $opt['price'], $opt['base_price'],
                    $opt['description'], $opt['features_json'], $opt['popup_options'], $opt['is_default'], $opt['sort_order'],
                    $opt['max_quantity'], $opt['max_length'], $opt['max_width'], $opt['unit'], $WORKSPACE_ID
                );
                $os->execute();
                $new_option_id = $db->insert_id;

                $avr = $db->query('SELECT model_id, is_active FROM option_model_availability WHERE option_id=' . intval($opt['id']));
                if ($avr) {
                    $avs = $db->prepare('INSERT IGNORE INTO option_model_availability (option_id,model_id,is_active) VALUES (?,?,?)');
                    while ($av = $avr->fetch_assoc()) {
                        $avs->bind_param('iii', $new_option_id, $av['model_id'], $av['is_active']);
                        $avs->execute();
                    }
                }
            }
        }

        $db->commit();
        json_out(array('ok' => true, 'id' => $new_group_id, 'name' => $new_name));
    } catch (Exception $e) {
        $db->rollback();
        json_out(array('ok' => false, 'error' => $e->getMessage()));
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'reorder_models') {
    $data = json_decode(file_get_contents('php://input'), true);
    $items = isset($data['items']) ? $data['items'] : array();
    if (!is_array($items) || count($items) === 0) json_out(array('ok' => false, 'error' => 'items required'));
    $db->begin_transaction();
    try {
        $stmt = $db->prepare('UPDATE models SET sort_order=? WHERE id=? AND workspace_id=?');
        foreach ($items as $item) {
            $ord = intval($item['sort_order']); $id = intval($item['id']);
            $stmt->bind_param('iii', $ord, $id, $WORKSPACE_ID); $stmt->execute();
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
        $stmt = $db->prepare('UPDATE option_groups SET sort_order=? WHERE id=? AND workspace_id=?');
        foreach ($items as $item) {
            $ord = intval($item['sort_order']); $id = intval($item['id']);
            $stmt->bind_param('iii', $ord, $id, $WORKSPACE_ID); $stmt->execute();
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
        $stmt = $db->prepare('UPDATE options_catalog SET sort_order=? WHERE id=? AND workspace_id=?');
        foreach ($items as $item) {
            $id = intval($item['id']);
            $ord = intval($item['sort_order']);
            if ($id <= 0) continue;
            $stmt->bind_param('iii', $ord, $id, $WORKSPACE_ID);
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
    $parent_id = isset($data['parent_group_id']) ? intval($data['parent_group_id']) : 0;
    $block_type = isset($data['block_type']) ? trim($data['block_type']) : 'options';
    if (!in_array($block_type, ['options','text','photo','photo2','gallery','video','delivery','popup','contacts'])) $block_type = 'options';
    if ($parent_id > 0) {
        if (!group_owned_by_workspace($db, $parent_id, $WORKSPACE_ID)) json_out(array('ok' => false, 'error' => 'parent group no longer exists'));
        $stmt = $db->prepare('INSERT INTO option_groups (name, sort_order, parent_group_id, block_type, workspace_id) VALUES (?, ?, ?, ?, ?)');
        $stmt->bind_param('siisi', $name, $sort, $parent_id, $block_type, $WORKSPACE_ID);
    } else {
        $stmt = $db->prepare('INSERT INTO option_groups (name, sort_order, block_type, workspace_id) VALUES (?, ?, ?, ?)');
        $stmt->bind_param('sisi', $name, $sort, $block_type, $WORKSPACE_ID);
    }
    if (!$stmt->execute()) json_out(array('ok' => false, 'error' => $db->error));
    json_out(array('ok' => true, 'id' => $db->insert_id));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'delete_group') {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = intval(isset($data['id']) ? $data['id'] : 0);
    if ($id <= 0) json_out(array('ok' => false, 'error' => 'id required'));
    if (!group_owned_by_workspace($db, $id, $WORKSPACE_ID)) json_out(array('ok' => false, 'error' => 'group not found'));

    $db->begin_transaction();
    try {
        // Deleting a wrapper block must never destroy the blocks nested inside it —
        // promote its direct children back to top-level instead of cascading the delete.
        $db->query("UPDATE option_groups SET parent_group_id=NULL WHERE parent_group_id=$id AND workspace_id=$WORKSPACE_ID");

        // Only this group's own options are removed (a wrapper normally has none of its own).
        $option_ids = array();
        $res = $db->query("SELECT id FROM options_catalog WHERE group_id=$id AND workspace_id=$WORKSPACE_ID");
        while ($row = $res->fetch_assoc()) $option_ids[] = intval($row['id']);

        if (count($option_ids) > 0) {
            $opt_in = implode(',', $option_ids);
            $db->query("DELETE FROM exclusion_rules WHERE workspace_id=$WORKSPACE_ID AND ((a_type='option' AND a_id IN ($opt_in)) OR (b_type='option' AND b_id IN ($opt_in)))");
            $db->query("DELETE FROM visibility_rules WHERE workspace_id=$WORKSPACE_ID AND ((trigger_type='option' AND trigger_id IN ($opt_in)) OR (target_type='option' AND target_id IN ($opt_in)))");
            $db->query("DELETE FROM options_catalog WHERE id IN ($opt_in) AND workspace_id=$WORKSPACE_ID");
        }
        $db->query("DELETE FROM exclusion_rules WHERE workspace_id=$WORKSPACE_ID AND ((a_type='group' AND a_id=$id) OR (b_type='group' AND b_id=$id))");
        $db->query("DELETE FROM visibility_rules WHERE workspace_id=$WORKSPACE_ID AND ((trigger_type='group' AND trigger_id=$id) OR (target_type='group' AND target_id=$id))");
        $db->query("DELETE FROM option_groups WHERE id=$id AND workspace_id=$WORKSPACE_ID");

        $db->commit();
        json_out(array('ok' => true));
    } catch (Exception $e) {
        $db->rollback();
        json_out(array('ok' => false, 'error' => $e->getMessage()));
    }
}

function normalize_pair($a_type, $a_id, $b_type, $b_id) {
    $a_key = $a_type . ':' . str_pad($a_id, 10, '0', STR_PAD_LEFT);
    $b_key = $b_type . ':' . str_pad($b_id, 10, '0', STR_PAD_LEFT);
    if ($a_key <= $b_key) return array($a_type, $a_id, $b_type, $b_id);
    return array($b_type, $b_id, $a_type, $a_id);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'create_exclusion') {
    $data = json_decode(file_get_contents('php://input'), true);
    $a_type = isset($data['a_type']) ? trim($data['a_type']) : '';
    $a_id   = intval(isset($data['a_id']) ? $data['a_id'] : 0);
    $b_type = isset($data['b_type']) ? trim($data['b_type']) : '';
    $b_id   = intval(isset($data['b_id']) ? $data['b_id'] : 0);
    if (!in_array($a_type, array('group','option')) || !in_array($b_type, array('group','option')) || $a_id <= 0 || $b_id <= 0) {
        json_out(array('ok' => false, 'error' => 'a_type/a_id/b_type/b_id required'));
    }
    if ($a_type === $b_type && $a_id === $b_id) {
        json_out(array('ok' => false, 'error' => 'cannot exclude itself'));
    }
    list($a_type, $a_id, $b_type, $b_id) = normalize_pair($a_type, $a_id, $b_type, $b_id);
    $stmt = $db->prepare('INSERT IGNORE INTO exclusion_rules (a_type,a_id,b_type,b_id,workspace_id) VALUES (?,?,?,?,?)');
    $stmt->bind_param('sisii', $a_type, $a_id, $b_type, $b_id, $WORKSPACE_ID);
    $stmt->execute();
    json_out(array('ok' => true, 'id' => $db->insert_id));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'delete_exclusion') {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = isset($data['id']) ? intval($data['id']) : 0;
    if ($id > 0) {
        $stmt = $db->prepare('DELETE FROM exclusion_rules WHERE id=? AND workspace_id=?');
        $stmt->bind_param('ii', $id, $WORKSPACE_ID);
        $stmt->execute();
        json_out(array('ok' => true));
    }
    $a_type = isset($data['a_type']) ? trim($data['a_type']) : '';
    $a_id   = intval(isset($data['a_id']) ? $data['a_id'] : 0);
    $b_type = isset($data['b_type']) ? trim($data['b_type']) : '';
    $b_id   = intval(isset($data['b_id']) ? $data['b_id'] : 0);
    if ($a_id <= 0 || $b_id <= 0) json_out(array('ok' => false, 'error' => 'id or a/b pair required'));
    list($a_type, $a_id, $b_type, $b_id) = normalize_pair($a_type, $a_id, $b_type, $b_id);
    $stmt = $db->prepare('DELETE FROM exclusion_rules WHERE a_type=? AND a_id=? AND b_type=? AND b_id=? AND workspace_id=?');
    $stmt->bind_param('sisii', $a_type, $a_id, $b_type, $b_id, $WORKSPACE_ID);
    $stmt->execute();
    json_out(array('ok' => true));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'create_visibility_rule') {
    $data = json_decode(file_get_contents('php://input'), true);
    $trigger_type = isset($data['trigger_type']) ? trim($data['trigger_type']) : '';
    $trigger_id   = intval(isset($data['trigger_id']) ? $data['trigger_id'] : 0);
    $target_type  = isset($data['target_type']) ? trim($data['target_type']) : '';
    $target_id    = intval(isset($data['target_id']) ? $data['target_id'] : 0);
    $effect       = isset($data['effect']) ? trim($data['effect']) : 'hide';
    if (!in_array($trigger_type, array('group','option')) || !in_array($target_type, array('group','option')) || $trigger_id <= 0 || $target_id <= 0) {
        json_out(array('ok' => false, 'error' => 'trigger_type/trigger_id/target_type/target_id required'));
    }
    if (!in_array($effect, array('show','hide'))) $effect = 'hide';
    if ($trigger_type === $target_type && $trigger_id === $target_id) {
        json_out(array('ok' => false, 'error' => 'cannot target itself'));
    }
    $triggerOwned = $trigger_type === 'group' ? group_owned_by_workspace($db, $trigger_id, $WORKSPACE_ID) : option_owned_by_workspace($db, $trigger_id, $WORKSPACE_ID);
    $targetOwned = $target_type === 'group' ? group_owned_by_workspace($db, $target_id, $WORKSPACE_ID) : option_owned_by_workspace($db, $target_id, $WORKSPACE_ID);
    if (!$triggerOwned || !$targetOwned) json_out(array('ok' => false, 'error' => 'trigger or target not found'));
    $stmt = $db->prepare('INSERT INTO visibility_rules (trigger_type,trigger_id,target_type,target_id,effect,workspace_id) VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE effect=VALUES(effect)');
    $stmt->bind_param('sisssi', $trigger_type, $trigger_id, $target_type, $target_id, $effect, $WORKSPACE_ID);
    $stmt->execute();
    json_out(array('ok' => true, 'id' => $db->insert_id));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'delete_visibility_rule') {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = isset($data['id']) ? intval($data['id']) : 0;
    if ($id > 0) {
        $stmt = $db->prepare('DELETE FROM visibility_rules WHERE id=? AND workspace_id=?');
        $stmt->bind_param('ii', $id, $WORKSPACE_ID);
        $stmt->execute();
        json_out(array('ok' => true));
    }
    $trigger_type = isset($data['trigger_type']) ? trim($data['trigger_type']) : '';
    $trigger_id   = intval(isset($data['trigger_id']) ? $data['trigger_id'] : 0);
    $target_type  = isset($data['target_type']) ? trim($data['target_type']) : '';
    $target_id    = intval(isset($data['target_id']) ? $data['target_id'] : 0);
    if ($trigger_id <= 0 || $target_id <= 0) json_out(array('ok' => false, 'error' => 'id or trigger/target pair required'));
    $stmt = $db->prepare('DELETE FROM visibility_rules WHERE trigger_type=? AND trigger_id=? AND target_type=? AND target_id=? AND workspace_id=?');
    $stmt->bind_param('sisii', $trigger_type, $trigger_id, $target_type, $target_id, $WORKSPACE_ID);
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
    if (!group_owned_by_workspace($db, $group_id, $WORKSPACE_ID)) json_out(array('ok' => false, 'error' => 'group not found'));
    $max_quantity = isset($data['max_quantity']) ? max(1, intval($data['max_quantity'])) : 1;
    $max_length = isset($data['max_length']) ? max(0, intval($data['max_length'])) : 0;
    $max_width = isset($data['max_width']) ? max(0, intval($data['max_width'])) : 0;
    $base_price = isset($data['base_price']) ? floatval($data['base_price']) : 0;
    $is_default = (!empty($data['is_default'])) ? 1 : 0;
    $unit = isset($data['unit']) ? trim($data['unit']) : 'шт';
    if ($unit === '') $unit = 'шт';
    $stmt = $db->prepare('INSERT INTO options_catalog (group_id,name,image_url,price,description,features_json,max_quantity,max_length,max_width,base_price,is_default,unit,workspace_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)');
    $empty = ''; $features = '[]';
    $stmt->bind_param('issdssiiidisi', $group_id, $name, $image_url, $price, $empty, $features, $max_quantity, $max_length, $max_width, $base_price, $is_default, $unit, $WORKSPACE_ID);
    $stmt->execute();
    $new_id = $db->insert_id;
    if ($model_id > 0 && model_owned_by_workspace($db, $model_id, $WORKSPACE_ID)) {
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
    $set = array('name=?', 'price=?');
    $types = 'sd';
    $values = array($name, $price);
    if (isset($data['max_quantity'])) {
        $set[] = 'max_quantity=?';
        $types .= 'i';
        $values[] = max(1, intval($data['max_quantity']));
    }
    if (isset($data['max_length'])) {
        $set[] = 'max_length=?';
        $types .= 'i';
        $values[] = max(0, intval($data['max_length']));
    }
    if (isset($data['max_width'])) {
        $set[] = 'max_width=?';
        $types .= 'i';
        $values[] = max(0, intval($data['max_width']));
    }
    if (isset($data['base_price'])) {
        $set[] = 'base_price=?';
        $types .= 'd';
        $values[] = floatval($data['base_price']);
    }
    if (array_key_exists('is_default', $data)) {
        $set[] = 'is_default=?';
        $types .= 'i';
        $values[] = $data['is_default'] ? 1 : 0;
    }
    if (isset($data['unit'])) {
        $set[] = 'unit=?';
        $types .= 's';
        $u = trim($data['unit']);
        $values[] = $u === '' ? 'шт' : $u;
    }
    if (array_key_exists('description', $data)) {
        $set[] = 'description=?';
        $types .= 's';
        $values[] = trim($data['description']);
    }
    if (array_key_exists('popup_options', $data)) {
        $set[] = 'popup_options=?';
        $types .= 's';
        $values[] = $data['popup_options'] !== null ? json_encode($data['popup_options']) : null;
    }
    $types .= 'ii';
    $values[] = $id;
    $values[] = $WORKSPACE_ID;
    $stmt = $db->prepare('UPDATE options_catalog SET ' . implode(', ', $set) . ' WHERE id=? AND workspace_id=?');
    $stmt->bind_param($types, ...$values);
    $stmt->execute();
    json_out(array('ok' => true));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'delete_option_json') {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = intval(isset($data['id']) ? $data['id'] : 0);
    if ($id <= 0) json_out(array('ok' => false, 'error' => 'id required'));
    $db->query("DELETE FROM exclusion_rules WHERE workspace_id=$WORKSPACE_ID AND ((a_type='option' AND a_id=$id) OR (b_type='option' AND b_id=$id))");
    $db->query("DELETE FROM visibility_rules WHERE workspace_id=$WORKSPACE_ID AND ((trigger_type='option' AND trigger_id=$id) OR (target_type='option' AND target_id=$id))");
    $stmt = $db->prepare('DELETE FROM options_catalog WHERE id=? AND workspace_id=?');
    $stmt->bind_param('ii', $id, $WORKSPACE_ID);
    if (!$stmt->execute()) json_out(array('ok' => false, 'error' => $db->error));
    json_out(array('ok' => true));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'toggle_option_active') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) $data = $_POST;
    $option_id = intval(isset($data['option_id']) ? $data['option_id'] : 0);
    $model_id  = intval(isset($data['model_id'])  ? $data['model_id']  : 0);
    $is_active = intval(isset($data['is_active'])  ? $data['is_active']  : 1) ? 1 : 0;
    if ($option_id <= 0 || $model_id <= 0) json_out(array('ok' => false, 'error' => 'option_id and model_id required'));
    if (!option_owned_by_workspace($db, $option_id, $WORKSPACE_ID) || !model_owned_by_workspace($db, $model_id, $WORKSPACE_ID)) {
        json_out(array('ok' => false, 'error' => 'not found'));
    }
    $stmt = $db->prepare('UPDATE option_model_availability SET is_active=? WHERE option_id=? AND model_id=?');
    $stmt->bind_param('iii', $is_active, $option_id, $model_id);
    $stmt->execute();
    json_out(array('ok' => true, 'affected' => $db->affected_rows));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'set_option_model_photo') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) $data = $_POST;
    $option_id = intval(isset($data['option_id']) ? $data['option_id'] : 0);
    $model_id  = intval(isset($data['model_id'])  ? $data['model_id']  : 0);
    // Empty image_url clears the override, reverting the option back to its default photo.
    $image_url  = isset($data['image_url']) ? trim($data['image_url']) : '';
    $image_crop = isset($data['image_crop']) ? trim($data['image_crop']) : '';
    if ($option_id <= 0 || $model_id <= 0) json_out(array('ok' => false, 'error' => 'option_id and model_id required'));
    if (!option_owned_by_workspace($db, $option_id, $WORKSPACE_ID) || !model_owned_by_workspace($db, $model_id, $WORKSPACE_ID)) {
        json_out(array('ok' => false, 'error' => 'not found'));
    }
    $image_url_val  = $image_url === ''  ? null : $image_url;
    $image_crop_val = $image_crop === '' ? null : $image_crop;
    $stmt = $db->prepare('INSERT INTO option_model_availability (option_id, model_id, image_url, image_crop) VALUES (?,?,?,?)
        ON DUPLICATE KEY UPDATE image_url=VALUES(image_url), image_crop=VALUES(image_crop)');
    $stmt->bind_param('iiss', $option_id, $model_id, $image_url_val, $image_crop_val);
    if (!$stmt->execute()) json_out(array('ok' => false, 'error' => $db->error));
    json_out(array('ok' => true));
}

// ── Calculations ───────────────────────────────────────────────────────────────

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'create_calculation') {
    $body = json_decode(file_get_contents('php://input'), true);
    if (!$body) json_out(array('ok' => false, 'error' => 'invalid json'));
    $model_id = intval(isset($body['model_id']) ? $body['model_id'] : 0);
    $layout_id = intval(isset($body['layout_id']) ? $body['layout_id'] : 0);
    // Preferred: selected_options = [{id, qty}]. Back-compat: selected_option_ids = flat id list (qty=1 each).
    $selected_options = array();
    if (isset($body['selected_options']) && is_array($body['selected_options'])) {
        foreach ($body['selected_options'] as $so) {
            $oid = intval(isset($so['id']) ? $so['id'] : 0);
            $qty = max(1, intval(isset($so['qty']) ? $so['qty'] : 1));
            if ($oid > 0) $selected_options[] = array('id' => $oid, 'qty' => $qty);
        }
    } elseif (isset($body['selected_option_ids'])) {
        foreach ((array)$body['selected_option_ids'] as $oid) {
            $oid = intval($oid);
            if ($oid > 0) $selected_options[] = array('id' => $oid, 'qty' => 1);
        }
    }
    $total_price = floatval(isset($body['total_price']) ? $body['total_price'] : 0);
    $option_choices = (isset($body['option_choices']) && is_array($body['option_choices'])) ? $body['option_choices'] : array();
    $option_dimensions = array();
    if (isset($body['option_dimensions']) && is_array($body['option_dimensions'])) {
        foreach ($body['option_dimensions'] as $oid => $dim) {
            $oid = intval($oid);
            if ($oid <= 0 || !is_array($dim)) continue;
            $length = max(0, intval(isset($dim['length']) ? $dim['length'] : 0));
            $width = max(0, intval(isset($dim['width']) ? $dim['width'] : 0));
            if ($length <= 0 && $width <= 0) continue;
            $option_dimensions[strval($oid)] = array('length' => $length, 'width' => $width);
        }
    }
    $account = isset($body['account']) ? preg_replace('/[^0-9]/', '', strval($body['account'])) : '';
    if ($model_id <= 0) json_out(array('ok' => false, 'error' => 'model_id required'));
    if (!model_owned_by_workspace($db, $model_id, $WORKSPACE_ID)) json_out(array('ok' => false, 'error' => 'model not found'));
    $slug = bin2hex(random_bytes(12));
    $model_bp_stmt = $db->prepare('SELECT base_price FROM models WHERE id=? LIMIT 1');
    $model_bp_stmt->bind_param('i', $model_id);
    $model_bp_stmt->execute();
    $model_bp_row = $model_bp_stmt->get_result()->fetch_assoc();
    $model_base_price = $model_bp_row ? floatval($model_bp_row['base_price']) : 0;
    $snapshot_data = array('model_id' => $model_id, 'layout_id' => $layout_id, 'selected_options' => $selected_options, 'base_price' => $model_base_price);
    if (!empty($option_choices)) $snapshot_data['option_choices'] = $option_choices;
    if (!empty($option_dimensions)) $snapshot_data['option_dimensions'] = $option_dimensions;
    if ($account !== '') $snapshot_data['account'] = $account;
    $snapshot = json_encode($snapshot_data);
    $stmt = $db->prepare('INSERT INTO calculations (public_slug, config_snapshot, total_price, workspace_id) VALUES (?, ?, ?, ?)');
    $stmt->bind_param('ssdi', $slug, $snapshot, $total_price, $WORKSPACE_ID);
    $stmt->execute();
    json_out(array('ok' => true, 'id' => $db->insert_id, 'public_slug' => $slug));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'request_callback') {
    $body = json_decode(file_get_contents('php://input'), true);
    if (!$body) json_out(array('ok' => false, 'error' => 'invalid json'));
    $phone = isset($body['phone']) ? trim(strval($body['phone'])) : '';
    if ($phone === '') json_out(array('ok' => false, 'error' => 'phone required'));
    $site = isset($body['workspace_name']) ? trim(strval($body['workspace_name'])) : '';
    $text = "📞 Заявка на обратный звонок\nТелефон: " . $phone . ($site !== '' ? "\nСайт: " . $site : '');
    telegram_notify_managers($text);
    json_out(array('ok' => true));
}

if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'get_calculation') {
    $slug = isset($_GET['slug']) ? trim($_GET['slug']) : '';
    if (!$slug) json_out(array('ok' => false, 'error' => 'slug required'));
    $stmt = $db->prepare('SELECT * FROM calculations WHERE public_slug=? LIMIT 1');
    $stmt->bind_param('s', $slug);
    $stmt->execute();
    $calc = $stmt->get_result()->fetch_assoc();
    if (!$calc) json_out(array('ok' => false, 'error' => 'not found'));
    // Not gated by the X-Workspace-ID header (see the top-of-file note) — the fixed offer
    // is looked up by its own unguessable slug, and every downstream lookup below is scoped
    // to the workspace the calculation itself was created under, not the caller's header.
    $calc_workspace_id = intval($calc['workspace_id']);
    $snapshot = json_decode($calc['config_snapshot'], true);
    $model_id = intval($snapshot['model_id']);
    $layout_id = intval($snapshot['layout_id']);
    // Preferred: selected_options = [{id, qty}]. Back-compat: old snapshots stored selected_option_ids (qty=1 each).
    $qty_by_id = array();
    if (isset($snapshot['selected_options']) && is_array($snapshot['selected_options'])) {
        foreach ($snapshot['selected_options'] as $so) {
            $qty_by_id[intval($so['id'])] = max(1, intval(isset($so['qty']) ? $so['qty'] : 1));
        }
    } elseif (isset($snapshot['selected_option_ids'])) {
        foreach ((array)$snapshot['selected_option_ids'] as $oid) $qty_by_id[intval($oid)] = 1;
    }
    $option_ids = array_keys($qty_by_id);
    $stmt2 = $db->prepare('SELECT id, name, image_url, offer_image_crop, base_price FROM models WHERE id=? AND workspace_id=? LIMIT 1');
    $stmt2->bind_param('ii', $model_id, $calc_workspace_id);
    $stmt2->execute();
    $model = $stmt2->get_result()->fetch_assoc();
    $stmt3 = $db->prepare('SELECT id, name FROM layouts WHERE id=? AND workspace_id=? LIMIT 1');
    $stmt3->bind_param('ii', $layout_id, $calc_workspace_id);
    $stmt3->execute();
    $layout = $stmt3->get_result()->fetch_assoc();
    $selected_options = array();
    if (count($option_ids) > 0) {
        $placeholders = implode(',', array_fill(0, count($option_ids), '?'));
        $types = str_repeat('i', count($option_ids));
        // COALESCE onto the per-model photo override (if the seller set one for this model)
        // so the saved offer shows exactly the picture the buyer saw while configuring.
        $stmt4 = $db->prepare("SELECT o.id, o.group_id, o.sort_order, o.name, o.price, o.base_price, o.max_length, o.max_width, o.unit, COALESCE(oma.image_url, o.image_url) as image_url, IFNULL(g.name,'Опция') as group_name
            FROM options_catalog o
            LEFT JOIN option_groups g ON g.id=o.group_id
            LEFT JOIN option_model_availability oma ON oma.option_id=o.id AND oma.model_id=$model_id
            WHERE o.workspace_id=$calc_workspace_id AND o.id IN ($placeholders)");
        $stmt4->bind_param($types, ...$option_ids);
        $stmt4->execute();
        $res = $stmt4->get_result();
        $snap_choices = isset($snapshot['option_choices']) && is_array($snapshot['option_choices']) ? $snapshot['option_choices'] : array();
        $snap_dimensions = isset($snapshot['option_dimensions']) && is_array($snapshot['option_dimensions']) ? $snapshot['option_dimensions'] : array();
        while ($row = $res->fetch_assoc()) {
            $qty = $qty_by_id[intval($row['id'])];
            $row['qty'] = $qty;
            $choice_price = 0;
            $choice_key = strval($row['id']);
            if (isset($snap_choices[$choice_key])) {
                $ch = $snap_choices[$choice_key];
                $row['popup_choice_name'] = isset($ch['name']) ? $ch['name'] : null;
                $choice_price = isset($ch['price']) ? floatval($ch['price']) : 0;
                if ($choice_price > 0) $row['popup_choice_price'] = $choice_price;
            }
            $is_dimension = intval($row['max_length']) > 0 || intval($row['max_width']) > 0;
            if ($is_dimension && isset($snap_dimensions[$choice_key])) {
                $dim = $snap_dimensions[$choice_key];
                $length = max(0, intval(isset($dim['length']) ? $dim['length'] : 0));
                $width = max(0, intval(isset($dim['width']) ? $dim['width'] : 0));
                $row['length'] = $length;
                $row['width'] = $width;
                // An option might only use ONE axis (e.g. length-only, no width slider) — a
                // missing/0 axis means "not applicable", not "zero it out", so it must default
                // to 1, not 0, or the whole line total collapses to just the base price.
                $line_length = $length > 0 ? $length : 1;
                $line_width = $width > 0 ? $width : 1;
                $row['line_total'] = floatval($row['base_price']) + floatval($row['price']) * $line_length * $line_width + $choice_price;
            } else {
                $row['line_total'] = floatval($row['base_price']) + floatval($row['price']) * $qty + $choice_price;
            }
            $selected_options[] = $row;
        }

        // Order to match the admin/client tree view: a flat ORDER BY group.sort_order isn't
        // enough once blocks are nested (parent_group_id) — a child block's own sort_order is
        // only meaningful among its siblings, not against unrelated top-level blocks. Walk the
        // group tree the same way the client configurator does, then sort options by each
        // option's position in that walk (falling back to option.sort_order within a group).
        $group_rank = array();
        $gr = $db->query("SELECT id, sort_order, parent_group_id FROM option_groups WHERE workspace_id=$calc_workspace_id");
        $children_of = array();
        while ($g = $gr->fetch_assoc()) {
            $parent = $g['parent_group_id'] !== null ? intval($g['parent_group_id']) : 0;
            if (!isset($children_of[$parent])) $children_of[$parent] = array();
            $children_of[$parent][] = $g;
        }
        foreach ($children_of as $parent => &$list) {
            usort($list, function ($a, $b) { return intval($a['sort_order']) <=> intval($b['sort_order']); });
        }
        unset($list);
        $rank_counter = 0;
        $walk_groups = function ($parent) use (&$walk_groups, &$group_rank, &$rank_counter, $children_of) {
            foreach (isset($children_of[$parent]) ? $children_of[$parent] : array() as $g) {
                $group_rank[intval($g['id'])] = $rank_counter++;
                $walk_groups(intval($g['id']));
            }
        };
        $walk_groups(0);

        usort($selected_options, function ($a, $b) use ($group_rank) {
            $ra = isset($group_rank[intval($a['group_id'])]) ? $group_rank[intval($a['group_id'])] : 999999;
            $rb = isset($group_rank[intval($b['group_id'])]) ? $group_rank[intval($b['group_id'])] : 999999;
            if ($ra !== $rb) return $ra <=> $rb;
            $sa = intval($a['sort_order']);
            $sb = intval($b['sort_order']);
            if ($sa !== $sb) return $sa <=> $sb;
            return intval($a['id']) <=> intval($b['id']);
        });
    }
    $model_image = $model ? ($model['image_url'] ?? '') : '';
    // base_price: prefer value saved at creation time, fallback to current model price
    $base_price = isset($snapshot['base_price']) ? floatval($snapshot['base_price']) : ($model ? floatval($model['base_price']) : 0);

    // Popup blocks (e.g. "what's included") can be duplicated and re-scoped per model via
    // model_ids — only the block(s) actually allowed for THIS calculation's model should be
    // shown, or duplicated blocks with the same content render as repeated items.
    $popup_group_ids = array();
    $pg = $db->query("SELECT id, model_ids FROM option_groups WHERE workspace_id=$calc_workspace_id AND block_type='popup'");
    if ($pg) {
        while ($g = $pg->fetch_assoc()) {
            $ids = $g['model_ids'] ? json_decode($g['model_ids'], true) : null;
            if (!$ids || in_array($model_id, array_map('intval', $ids))) {
                $popup_group_ids[] = strval($g['id']);
            }
        }
    }

    json_out(array(
        'ok' => true,
        'id' => $calc['id'],
        'public_slug' => $calc['public_slug'],
        'total_price' => floatval($calc['total_price']),
        'base_price' => $base_price,
        'fixed_at' => $calc['fixed_at'],
        'model_name' => $model ? $model['name'] : 'Модель',
        'model_image_url' => $model_image,
        'model_offer_image_crop' => $model ? ($model['offer_image_crop'] ?? null) : null,
        'model_id' => $model_id,
        'layout_name' => $layout ? $layout['name'] : 'Планировка',
        'selected_options' => $selected_options,
        'account' => isset($snapshot['account']) ? $snapshot['account'] : null,
        'popup_group_ids' => $popup_group_ids,
    ));
}

http_response_code(404);
json_out(array('ok' => false, 'error' => 'Unknown route'));


