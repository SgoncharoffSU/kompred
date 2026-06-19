<?php
$config_path = __DIR__ . '/../../php_hosting/public/config.php';
if (!is_file($config_path)) $config_path = '/var/www/bathhouse/public/config.php';
$db = require $config_path;
$mysqli = new mysqli($db['db_host'], $db['db_user'], $db['db_pass'], $db['db_name']);
if ($mysqli->connect_error) {
    fwrite(STDERR, "DB connection failed\n");
    exit(1);
}
$mysqli->set_charset('utf8mb4');

$mysqli->query("CREATE TABLE IF NOT EXISTS option_model_availability (
    option_id INT NOT NULL,
    model_id INT NOT NULL,
    PRIMARY KEY(option_id, model_id)
)");

function q($db, $sql) {
    if (!$db->query($sql)) {
        fwrite(STDERR, $db->error . "\nSQL: " . $sql . "\n");
        exit(1);
    }
}
function upsert_group($db, $name, $sort) {
    $stmt = $db->prepare("SELECT id FROM option_groups WHERE name=?");
    $stmt->bind_param('s', $name);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    if ($row) {
        $id = intval($row['id']);
        $stmt = $db->prepare("UPDATE option_groups SET sort_order=? WHERE id=?");
        $stmt->bind_param('ii', $sort, $id);
        $stmt->execute();
        return $id;
    }
    $stmt = $db->prepare("INSERT INTO option_groups (name,sort_order) VALUES (?,?)");
    $stmt->bind_param('si', $name, $sort);
    $stmt->execute();
    return intval($db->insert_id);
}
function upsert_model($db, $name, $price) {
    $stmt = $db->prepare("SELECT id FROM models WHERE name=?");
    $stmt->bind_param('s', $name);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    if ($row) {
        $id = intval($row['id']);
        $stmt = $db->prepare("UPDATE models SET base_price=? WHERE id=?");
        $stmt->bind_param('di', $price, $id);
        $stmt->execute();
        return $id;
    }
    $stmt = $db->prepare("INSERT INTO models (name,base_price) VALUES (?,?)");
    $stmt->bind_param('sd', $name, $price);
    $stmt->execute();
    return intval($db->insert_id);
}
function upsert_option($db, $group_id, $name, $price, $description, $features, $image, $model_ids) {
    $stmt = $db->prepare("SELECT id FROM options_catalog WHERE group_id=? AND name=?");
    $stmt->bind_param('is', $group_id, $name);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $features_json = json_encode($features, JSON_UNESCAPED_UNICODE);
    if ($row) {
        $id = intval($row['id']);
        $stmt = $db->prepare("UPDATE options_catalog SET price=?,description=?,features_json=?,image_url=? WHERE id=?");
        $stmt->bind_param('dsssi', $price, $description, $features_json, $image, $id);
        $stmt->execute();
    } else {
        $stmt = $db->prepare("INSERT INTO options_catalog (group_id,name,image_url,price,description,features_json) VALUES (?,?,?,?,?,?)");
        $stmt->bind_param('issdss', $group_id, $name, $image, $price, $description, $features_json);
        $stmt->execute();
        $id = intval($db->insert_id);
    }
    q($db, "DELETE FROM option_model_availability WHERE option_id=" . intval($id));
    $stmt = $db->prepare("INSERT IGNORE INTO option_model_availability (option_id,model_id) VALUES (?,?)");
    foreach ($model_ids as $mid) {
        $mid = intval($mid);
        $stmt->bind_param('ii', $id, $mid);
        $stmt->execute();
    }
    return $id;
}
function block($title, $group_id, $option_ids, $multi=false) {
    return array(
        'id' => 'b' . bin2hex(random_bytes(4)),
        'title' => '',
        'backgroundColor' => '#ffffff',
        'elements' => array(array(
            'id' => 'e' . bin2hex(random_bytes(4)),
            'type' => 'options',
            'optionGroupId' => $group_id,
            'optionIds' => array_values($option_ids),
            'optionTitle' => $title,
            'multiSelect' => $multi,
            'cardGap' => 12,
            'cardRadius' => 10,
            'cardBorder' => 1,
            'cardShadow' => 8,
            'cardSize' => 180,
            'textSize' => 14,
            'optionsBgColor' => '#ffffff',
            'optionsBgOpacity' => 100,
            'titleSize' => 22,
            'titleWeight' => 800,
            'titleLetter' => 0,
            'titleLine' => 120,
            'titleColor' => '#17231d',
            'titleAlign' => 'left',
            'titlePadding' => 0
        ))
    );
}

$models = array(
    'Квадро Хаус 4x2' => 359000,
    'Квадро Хаус 4x3' => 439000,
    'Квадро Хаус 4x4' => 486000,
    'Квадро Хаус 4x5' => 569000,
    'Квадро Хаус 4x6' => 596000,
);
$model_ids = array();
foreach ($models as $name => $price) $model_ids[$name] = upsert_model($mysqli, $name, $price);
$all = array_values($model_ids);
$m42 = array($model_ids['Квадро Хаус 4x2']);
$m43 = array($model_ids['Квадро Хаус 4x3']);
$m44plus = array($model_ids['Квадро Хаус 4x4'], $model_ids['Квадро Хаус 4x5'], $model_ids['Квадро Хаус 4x6']);
$m43plus = array($model_ids['Квадро Хаус 4x3'], $model_ids['Квадро Хаус 4x4'], $model_ids['Квадро Хаус 4x5'], $model_ids['Квадро Хаус 4x6']);

$groups = array();
foreach (array('Цвет бани','Кровля','Окна','Двери','Печной узел','Моечное отделение','Комната отдыха','Парная','Дымоход','Конструктив','Услуги') as $i=>$name) {
    $groups[$name] = upsert_group($mysqli, $name, $i + 1);
}

$option_ids = array();
$wood_img = '/color_cart/178094209304ee.png';
$colors = array('Айсберг','Альпийское утро','Фьорд','Северное море','Топленое молоко','Слоновая кость','Карамель','Имбирь','Лакрица','Графит');
foreach ($colors as $c) {
    $option_ids['Цвет бани'][] = upsert_option($mysqli, $groups['Цвет бани'], $c, 0, 'Цвет Pinotex Extreme One по каталогу Сиберия 2026.', array('source:catalog2026','type:wood_color'), $wood_img, $all);
}
$mysqli->query("DELETE FROM options_catalog WHERE group_id=" . intval($groups['Кровля']) . " AND (image_url IS NULL OR image_url='')");
$roof = array(
    array('DOCKE Соната коричневый', '/uploads/img_20260608_123814_13730dde.jpg'),
    array('DOCKE Соната серый', '/uploads/img_20260608_123815_91ea5a4c.jpg'),
    array('DOCKE Соната темно-зеленый', '/uploads/img_20260608_123816_dd95ca70.jpg'),
    array('DOCKE Соната красный', '/uploads/img_20260608_123817_164f4825.jpg'),
);
foreach ($roof as $r) {
    $option_ids['Кровля'][] = upsert_option($mysqli, $groups['Кровля'], $r[0], 0, 'Гибкая черепица Docke, цвет кровли по каталогу.', array('source:catalog2026'), $r[1], $all);
}
$rows = array(
    array('Окна','Окно ПВХ в зоне отдыха 1200x500 с установкой и перегородкой',12000,'Дополнительное окно для зоны отдыха.', $m42),
    array('Окна','Окно ПВХ в зоне отдыха 1000x400 с установкой и перегородкой',12000,'Дополнительное окно для зоны отдыха.', $m43plus),
    array('Окна','Дополнительная форточка 300x300',5000,'Дополнительная форточка для проветривания.', $all),
    array('Двери','Дверь входная ПВХ 1700x800, белая',10000,'Входная ПВХ дверь белого цвета.', $all),
    array('Двери','Дверь входная ПВХ 1700x800, цвет дуб',18000,'Входная ПВХ дверь в цвете дуб.', $all),
    array('Двери','Дверь входная ПВХ 1700x800, цвет антрацит',18000,'Входная ПВХ дверь в цвете антрацит.', $all),
    array('Двери','Дверь металлическая',18000,'Металлическая входная дверь.', $all),
    array('Печной узел','Печь Везувий Скиф Ковка 16 Панорама',25000,'Печь Везувий с панорамным стеклом.', $all),
    array('Печной узел','Печь с панорамой',14000,'Замена на печь с панорамным стеклом.', $m44plus),
    array('Моечное отделение','Скамья для моечной',6000,'Дополнительная скамья в моечное отделение.', $all),
    array('Моечное отделение','Умывальник, сантехника 2 м',8000,'Умывальник и сантехнический комплект.', $all),
    array('Моечное отделение','Душевая система 1 лейка, смеситель, полка',15000,'Душевой комплект для моечного отделения.', $m44plus),
    array('Моечное отделение','Душевая система 2 лейки, смеситель, полка',30000,'Расширенный душевой комплект.', $m44plus),
    array('Моечное отделение','Обливное устройство',23000,'Обливное устройство для банных процедур.', $m44plus),
    array('Комната отдыха','Рундук',7000,'Дополнительный рундук для хранения.', $all),
    array('Комната отдыха','Тонирование мебели в зоне отдыха',18000,'Тонирование мебели в зоне отдыха.', $all),
    array('Парная','Тонирование мебели в парной',13000,'Тонирование пологов и мебели в парной.', $all),
    array('Конструктив','Минибрус под камень',5000,'Декоративная отделка минибрусом.', array_merge($m42,$m43)),
    array('Конструктив','Минибрус под камень, увеличенный комплект',8000,'Декоративная отделка минибрусом для старших моделей.', $m44plus),
    array('Окна','Второе окно печной зоны',10000,'Дополнительное окно в печной зоне.', $m43plus),
    array('Услуги','Сборка на участке',30000,'Сборка бани на участке заказчика.', $all),
);
foreach ($rows as $r) {
    $option_ids[$r[0]][] = upsert_option($mysqli, $groups[$r[0]], $r[1], $r[2], $r[3], array('source:catalog2026'), '', $r[4]);
}

foreach ($model_ids as $model_name => $model_id) {
    $blocks = array();
    foreach (array('Цвет бани'=>false,'Кровля'=>false,'Окна'=>true,'Двери'=>false,'Печной узел'=>true,'Моечное отделение'=>true,'Комната отдыха'=>true,'Парная'=>true,'Конструктив'=>true,'Услуги'=>true) as $group => $multi) {
        $ids = array();
        foreach (($option_ids[$group] ?? array()) as $oid) {
            $res = $mysqli->query('SELECT 1 FROM option_model_availability WHERE option_id=' . intval($oid) . ' AND model_id=' . intval($model_id));
            if ($res && $res->num_rows) $ids[] = intval($oid);
        }
        if ($ids) $blocks[] = block($group, $groups[$group], $ids, $multi);
    }
    $page = json_encode(array('blocks'=>$blocks), JSON_UNESCAPED_UNICODE);
    $stmt = $mysqli->prepare("INSERT INTO model_pages (model_id,page_json) VALUES (?,?) ON DUPLICATE KEY UPDATE page_json=VALUES(page_json)");
    $stmt->bind_param('is', $model_id, $page);
    $stmt->execute();
}

echo "seeded catalog 2026: " . count($model_ids) . " models\n";
