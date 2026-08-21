-- ============================================================================
-- DATABASE PRESENSI DIGITAL WEBAPP
-- ============================================================================
-- Database : mukk6632_absensi
-- User     : mukk6632_absensi
-- Password : mukk6632_absensi
-- ============================================================================

-- Buat database
CREATE DATABASE IF NOT EXISTS `mukk6632_absensi`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

-- Buat user dan berikan hak akses
CREATE USER IF NOT EXISTS 'mukk6632_absensi'@'localhost' IDENTIFIED BY 'mukk6632_absensi';
GRANT ALL PRIVILEGES ON `mukk6632_absensi`.* TO 'mukk6632_absensi'@'localhost';
FLUSH PRIVILEGES;

USE `mukk6632_absensi`;

-- ============================================================================
-- 1. TABEL USERS (Admin, Guru, Tendik)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `users` (
  `id`            INT AUTO_INCREMENT PRIMARY KEY,
  `username`      VARCHAR(50)  NOT NULL UNIQUE,
  `password`      VARCHAR(255) NOT NULL,
  `role`          ENUM('developer','admin','guru','tendik') NOT NULL DEFAULT 'guru',
  `kelas`         VARCHAR(50)  DEFAULT NULL,
  `nip`           VARCHAR(30)  DEFAULT NULL,
  `nama_lengkap`  VARCHAR(150) NOT NULL,
  `jabatan`       VARCHAR(100) DEFAULT NULL,
  `no_handphone`  VARCHAR(20)  DEFAULT NULL,
  `created_at`    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data awal users (Developer & Administrator)
INSERT INTO `users` (`username`, `password`, `role`, `kelas`, `nip`, `nama_lengkap`, `jabatan`, `no_handphone`) VALUES
('developer', 'dev123',    'developer', NULL,        'DEV-001',            'System Developer (KangYos)', 'Lead System Developer', '081234567899'),
('admin',     'admin123',  'admin',     NULL,        '198001012005011001', 'Administrator',            'Kepala Tata Usaha',      '081234567800');

-- ============================================================================
-- 2. TABEL GURU
-- ============================================================================
CREATE TABLE IF NOT EXISTS `guru` (
  `id`            INT AUTO_INCREMENT PRIMARY KEY,
  `nip`           VARCHAR(30)  NOT NULL UNIQUE,
  `nama_lengkap`  VARCHAR(150) NOT NULL,
  `jabatan`       VARCHAR(100) DEFAULT NULL,
  `no_handphone`  VARCHAR(20)  DEFAULT NULL,
  `username`      VARCHAR(50)  DEFAULT NULL,
  `password`      VARCHAR(255) DEFAULT NULL,
  `created_at`    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 3. TABEL TENDIK (Tenaga Kependidikan / Staf)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `tendik` (
  `id`            INT AUTO_INCREMENT PRIMARY KEY,
  `nip_nik`       VARCHAR(30)  NOT NULL UNIQUE,
  `nama_lengkap`  VARCHAR(150) NOT NULL,
  `jabatan`       VARCHAR(100) DEFAULT NULL,
  `no_handphone`  VARCHAR(20)  DEFAULT NULL,
  `username`      VARCHAR(50)  DEFAULT NULL,
  `password`      VARCHAR(255) DEFAULT NULL,
  `created_at`    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 4. TABEL SISWA
-- ============================================================================
CREATE TABLE IF NOT EXISTS `siswa` (
  `id`              INT AUTO_INCREMENT PRIMARY KEY,
  `nama_lengkap`    VARCHAR(150) NOT NULL,
  `nisn`            VARCHAR(20)  NOT NULL UNIQUE,
  `jenis_kelamin`   ENUM('Laki-laki','Perempuan') NOT NULL,
  `tanggal_lahir`   DATE         DEFAULT NULL,
  `agama`           VARCHAR(20)  DEFAULT NULL,
  `nama_ayah`       VARCHAR(100) DEFAULT NULL,
  `nama_ibu`        VARCHAR(100) DEFAULT NULL,
  `no_handphone`    VARCHAR(20)  DEFAULT NULL,
  `kelas`           VARCHAR(50)  DEFAULT NULL,
  `alamat`          TEXT         DEFAULT NULL,
  `created_at`      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 5. TABEL ABSENSI (Rekap Presensi Harian)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `absensi` (
  `id`                INT AUTO_INCREMENT PRIMARY KEY,
  `tanggal`           DATE         NOT NULL,
  `id_nisn_nip`       VARCHAR(30)  NOT NULL COMMENT 'ID / NISN siswa atau NIP guru/tendik',
  `nama_lengkap`      VARCHAR(150) NOT NULL,
  `kelas_jabatan`     VARCHAR(100) DEFAULT NULL COMMENT 'Kelas (siswa) atau Jabatan (guru/tendik)',
  `jam_datang`        TIME         DEFAULT NULL,
  `jam_pulang`        TIME         DEFAULT NULL,
  `keterangan_waktu`  VARCHAR(50)  DEFAULT NULL COMMENT 'Tepat Waktu / Terlambat',
  `status`            ENUM('Hadir','Izin','Sakit','Alfa','Terlambat') DEFAULT 'Hadir',
  `created_at`        TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  `updated_at`        TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_tanggal`       (`tanggal`),
  INDEX `idx_id_nisn_nip`   (`id_nisn_nip`),
  INDEX `idx_tanggal_id`    (`tanggal`, `id_nisn_nip`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 6. TABEL HARI LIBUR
-- ============================================================================
CREATE TABLE IF NOT EXISTS `hari_libur` (
  `id`          INT AUTO_INCREMENT PRIMARY KEY,
  `tanggal`     DATE         NOT NULL UNIQUE,
  `keterangan`  VARCHAR(200) NOT NULL,
  `created_at`  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data awal hari libur
INSERT INTO `hari_libur` (`tanggal`, `keterangan`) VALUES
('2026-08-17', 'HUT Kemerdekaan RI'),
('2026-12-25', 'Hari Raya Natal');

-- ============================================================================
-- 7. TABEL KONFIGURASI
-- ============================================================================
CREATE TABLE IF NOT EXISTS `konfigurasi` (
  `id`          INT AUTO_INCREMENT PRIMARY KEY,
  `config_key`  VARCHAR(50)  NOT NULL UNIQUE,
  `value`       VARCHAR(100) NOT NULL,
  `keterangan`  VARCHAR(200) DEFAULT NULL,
  `updated_at`  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data awal konfigurasi
INSERT INTO `konfigurasi` (`config_key`, `value`, `keterangan`) VALUES
('jam_masuk_mulai',  '06:30', 'Waktu absen datang dibuka'),
('jam_masuk_akhir',  '07:15', 'Batas waktu terlambat'),
('jam_pulang_mulai', '15:00', 'Waktu absen pulang dibuka'),
('jam_pulang_akhir', '17:00', 'Batas akhir absen pulang');

-- ============================================================================
-- 8. TABEL LISENSI APLIKASI (Domain-Bound Licensing System)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `licenses` (
  `id`                VARCHAR(50)  NOT NULL PRIMARY KEY,
  `license_key`       VARCHAR(50)  NOT NULL UNIQUE,
  `license_key_hash`  VARCHAR(64)  NOT NULL,
  `product`           VARCHAR(100) NOT NULL DEFAULT 'presensi-smansa-pro',
  `customer_name`     VARCHAR(150) NOT NULL,
  `customer_email`    VARCHAR(150) DEFAULT NULL,
  `domain`            VARCHAR(150) DEFAULT NULL,
  `status`            ENUM('active','inactive','suspended','expired','revoked') NOT NULL DEFAULT 'active',
  `license_type`      ENUM('Lifetime','Subscription','Trial') NOT NULL DEFAULT 'Subscription',
  `max_activation`    INT          NOT NULL DEFAULT 1,
  `activation_count`  INT          NOT NULL DEFAULT 0,
  `activated_at`      DATETIME     DEFAULT NULL,
  `expires_at`        DATETIME     DEFAULT NULL,
  `last_verified_at`  DATETIME     DEFAULT NULL,
  `notes`             TEXT         DEFAULT NULL,
  `created_at`        TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  `updated_at`        TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_license_key` (`license_key`),
  INDEX `idx_domain` (`domain`),
  INDEX `idx_status` (`status`),
  INDEX `idx_product` (`product`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 9. TABEL AUDIT LOG LISENSI
-- ============================================================================
CREATE TABLE IF NOT EXISTS `license_audit_logs` (
  `id`          VARCHAR(50)  NOT NULL PRIMARY KEY,
  `license_id`  VARCHAR(50)  DEFAULT NULL,
  `action`      VARCHAR(50)  NOT NULL,
  `domain`      VARCHAR(150) DEFAULT NULL,
  `ip_address`  VARCHAR(50)  DEFAULT NULL,
  `user_agent`  TEXT         DEFAULT NULL,
  `metadata`    JSON         DEFAULT NULL,
  `created_at`  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_log_license_id` (`license_id`),
  INDEX `idx_log_action` (`action`),
  INDEX `idx_log_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data awal lisensi default
INSERT INTO `licenses` (`id`, `license_key`, `license_key_hash`, `product`, `customer_name`, `customer_email`, `domain`, `status`, `license_type`, `max_activation`, `activation_count`, `activated_at`, `expires_at`, `notes`) VALUES
('lic_default_smansa', 'JRAK-7F4K-9X2M-Q8VP-3N6T', '67a84ff105264b3ef816a7516d24f0c4369a3044a04d588523ef21fb47b4e723', 'presensi-smansa-pro', 'Instansi Presensi Digital', 'admin@presensi.kangyos.com', 'yoseples.github.io', 'active', 'Lifetime', 1, 1, NOW(), NULL, 'Lisensi Default Resmi Presensi Digital');

-- ============================================================================
-- SELESAI - Database mukk6632_absensi siap digunakan!
-- ============================================================================
