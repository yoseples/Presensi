-- ============================================================================
-- DATABASE PRESENSI DIGITAL - SMANSA LHOKSUKON
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
  `role`          ENUM('admin','guru','tendik') NOT NULL DEFAULT 'guru',
  `kelas`         VARCHAR(50)  DEFAULT NULL,
  `nip`           VARCHAR(30)  DEFAULT NULL,
  `nama_lengkap`  VARCHAR(150) NOT NULL,
  `jabatan`       VARCHAR(100) DEFAULT NULL,
  `no_handphone`  VARCHAR(20)  DEFAULT NULL,
  `created_at`    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data awal users (Administrator)
INSERT INTO `users` (`username`, `password`, `role`, `kelas`, `nip`, `nama_lengkap`, `jabatan`, `no_handphone`) VALUES
('admin',   'admin123',   'admin',  NULL,         '198001012005011001', 'Administrator',            'Kepala Tata Usaha',      '081234567800'),
('mukhlis', 'admin123',   'admin',  NULL,         '198904152026211006', 'MUHAMMAD MUKHLIS',         'Administrator',          '081234567808');

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
-- SELESAI - Database mukk6632_absensi siap digunakan!
-- ============================================================================
