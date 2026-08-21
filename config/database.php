<?php
/**
 * ============================================================================
 * KONFIGURASI KONEKSI DATABASE
 * Aplikasi Presensi Digital WebApp
 * ============================================================================
 *
 * Database : mukk6632_absensi
 * User     : mukk6632_absensi
 * Password : mukk6632_absensi
 */

define('DB_HOST',     'localhost');
define('DB_NAME',     'mukk6632_absensi');
define('DB_USER',     'mukk6632_absensi');
define('DB_PASSWORD', 'mukk6632_absensi');
define('DB_CHARSET',  'utf8mb4');

/**
 * Koneksi menggunakan PDO (Recommended)
 */
function getDBConnection() {
    static $pdo = null;
    if ($pdo === null) {
        try {
            $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;
            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE  => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES    => false,
            ];
            $pdo = new PDO($dsn, DB_USER, DB_PASSWORD, $options);
        } catch (PDOException $e) {
            die('Koneksi database gagal: ' . $e->getMessage());
        }
    }
    return $pdo;
}

/**
 * Koneksi menggunakan MySQLi (Alternatif)
 */
function getDBConnectionMysqli() {
    static $conn = null;
    if ($conn === null) {
        $conn = new mysqli(DB_HOST, DB_USER, DB_PASSWORD, DB_NAME);
        if ($conn->connect_error) {
            die('Koneksi database gagal: ' . $conn->connect_error);
        }
        $conn->set_charset(DB_CHARSET);
    }
    return $conn;
}
