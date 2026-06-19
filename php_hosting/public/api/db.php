<?php
function db_connect() {
    $cfg = require __DIR__ . '/../config.php';
    $mysqli = new mysqli($cfg['db_host'], $cfg['db_user'], $cfg['db_pass'], $cfg['db_name']);
    if ($mysqli->connect_error) {
        http_response_code(500);
        echo json_encode(array('ok' => false, 'error' => 'DB connection failed'));
        exit;
    }
    $mysqli->set_charset($cfg['db_charset']);
    return $mysqli;
}

function json_out($payload) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}
