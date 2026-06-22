<?php
$i = 1;

if (getenv('JWT_SECRET')) {
    $cfg['Servers'][$i]['auth_type'] = 'signon';
    $cfg['Servers'][$i]['SignonSession'] = 'SignonSession';
    $cfg['Servers'][$i]['SignonURL'] = 'signon.php';
}
