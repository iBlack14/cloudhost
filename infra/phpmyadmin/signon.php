<?php
$jwt_secret = getenv('JWT_SECRET');
if (!$jwt_secret) {
    die("Error: JWT_SECRET no configurado en phpMyAdmin.");
}

$token = $_GET['token'] ?? '';
$iv = $_GET['iv'] ?? '';
$db = $_GET['db'] ?? '';

if (empty($token) || empty($iv)) {
    // Si se accede directamente sin parámetros, redirigir al panel
    header('Location: /');
    exit;
}

$key = hex2bin($jwt_secret);
$decrypted = openssl_decrypt(
    hex2bin($token),
    'aes-256-cbc',
    $key,
    OPENSSL_RAW_DATA,
    hex2bin($iv)
);

if ($decrypted === false) {
    die("Error de autenticación. Token inválido.");
}

$data = json_decode($decrypted, true);
if (!$data || empty($data['username']) || empty($data['password'])) {
    die("Token inválido o corrupto.");
}

$session_name = 'SignonSession';
session_name($session_name);
session_set_cookie_params([
    'path' => '/phpmyadmin/',
    'httponly' => true,
    'samesite' => 'Lax'
]);
session_start();

$_SESSION['PMA_single_signon_user'] = $data['username'];
$_SESSION['PMA_single_signon_password'] = $data['password'];
$_SESSION['PMA_single_signon_host'] = 'mysql';
$_SESSION['PMA_single_signon_port'] = 3306;

session_write_close();

$targetUrl = 'index.php';
if (!empty($db)) {
    $targetUrl .= '?route=/database/structure&db=' . urlencode($db);
}
header('Location: ' . $targetUrl);
exit;
?>
