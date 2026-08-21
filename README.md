# Presensi Digital WebApp

**Sistem Presensi Digital dengan QR Code Scanner, Barcode, GPS Geofencing, dan License Management System.**

Aplikasi web presensi siswa, guru, dan pegawai instansi yang modern, responsif, dan siap langsung di-deploy ke **cPanel**, **Hostinger VPS/Cloud**, atau **GitHub Pages**.

---

## 🌟 Fitur Utama Presensi Digital
1. **Multi-Role Login**:
   - **Developer (Master Super Admin)**: Akses eksklusif modul **Manajemen User** lintas seluruh role (Developer, Admin, Guru, Tendik, Siswa), reset password instan dengan enkripsi SHA-256 + Salt, audit status enkripsi, proteksi akun utama, export audit user ke Excel, dan bypass hak akses penuh ke seluruh modul sistem.
   - **Admin (Super Admin)**: Dashboard statistik global seluruh siswa, kelola direktori siswa, kelola akun guru & tendik, pengaturan waktu buka/tutup absensi, kelola tanggal merah/hari libur, serta rekap laporan kehadiran periode + export ke Excel.
   - **Guru / Wali Kelas**: Dashboard statistik kehadiran kelas yang diampu, scanner kamera presensi, kartu tanda pendidik digital, monitoring realtime siswa dengan dropdown status kehadiran, dan presensi mandiri (GPS).
   - **Tendik**: Presensi mandiri (GPS) & scanner kamera, kartu staf digital, dan profil akun.
   - **Siswa**: Dashboard kartu kehadiran hari ini, status jam datang & pulang, pengajuan izin/sakit mandiri, serta Kartu Pelajar Digital dengan QR Code siap cetak.
2. **Scanner Kamera QR Code (Html5Qrcode)**:
   - Mendukung kamera depan & belakang di smartphone atau laptop.
   - Otomatis mencatat absen datang (terlambat / tepat waktu) dan absen pulang (pulang cepat / selesai).
3. **Cetak Kartu Identitas Digital**:
   - Generator QR Code instan berbasis NISN / NIP.
   - Dilengkapi tombol cetak kartu siap print / PDF.
4. **Monitoring & Laporan Excel (SheetJS)**:
   - Export Excel instan langsung terunduh ke perangkat (`.xlsx`).
   - Filter laporan berdasarkan rentang tanggal & kelas (`X MIPA 1`, `X MIPA 2`, `XI IPS 1`, dll.).
5. **Zero Backend Required (GitHub Pages Ready)**:
   - Menggunakan engine local web storage & Firebase Realtime Database terintegrasi, data tersimpan secara persisten dan langsung berfungsi realtime.

---

## 🔑 Akun Login Pengguna Bawaan (Versi Demo)

Aplikasi ini dilengkapi fitur **1-Click Quick Demo Login** pada halaman login untuk memudahkan calon pengguna / penguji mencoba 4 peran sekolah:

| Role | Username / NISN | Password | Nama Lengkap / Jabatan | Catatan Akses |
| :--- | :--- | :--- | :--- | :--- |
| **🛡️ Admin** | `admin` | `admin123` | Administrator SMANSA | Kelola Siswa, Guru, Tendik, Laporan, & Pengaturan Branding |
| **👨‍🏫 Guru** | `guru1` | `12345` | Drs. Syamsuddin, M.Pd | Wali Kelas XII MIPA 1, Monitoring Kehadiran, Scan QR |
| **👨‍🏫 Guru** | `guru2` | `12345` | Cut Nurhaliza, S.Pd | Wali Kelas XI IPS 1, Monitoring Kehadiran |
| **👔 Tendik** | `tendik1` | `12345` | Zulfikar, S.Sos | Staf Tata Usaha, Presensi Mandiri GPS |
| **🎓 Siswa** | `20240101` | `12345` | Ahmad Fadhil (XII MIPA 1) | Kartu Pelajar Digital, Presensi Mandiri, Status Kehadiran |
| **🎓 Siswa** | `20240102` | `12345` | Siti Raisa (XII MIPA 1) | Kartu Pelajar Digital, Izin Mandiri |
| **🎓 Siswa** | `20240201` | `12345` | Rizky Pratama (XI IPS 1) | Kartu Pelajar Digital |

> 🔒 *Catatan: Akun **Developer** (Master Super Admin & License Generator) dilindungi secara privat dan hanya dapat diakses langsung oleh pemilik sistem.*

---

## 🛡️ Sistem Manajemen Lisensi Multi-Klien & Proteksi Domain

Aplikasi ini dilengkapi dengan **Production-Grade License Management System**:

### 1. 🏗️ Alur & Logika Lisensi
```
ADMIN LICENSE GENERATOR
          ↓
  DATABASE LICENSE
          ↓
   LICENSE API (POST /api/license/activate)
          ↓
        WEBAPP
          ↓
   VALID LICENSE  →  👑 FULL VERSION (Akses Tanpa Batas)
   INVALID / EXPIRED / REVOKED  →  🛡️ DEMO MODE
```

### 2. 🔑 Karakteristik Kunci & Token
- **Format Kunci**: `XXXX-XXXX-XXXX-XXXX-XXXX` (dibuat menggunakan CSPRNG kriptografis acak yang aman).
- **Domain Binding**: Lisensi dapat dibuat tanpa domain (*unbound*). Domain pertama yang berhasil mengaktivasi lisensi akan langsung dikunci otomatis. Kunci tidak dapat digunakan di domain lain (*domain mismatch protection*).
- **Asymmetric Signed Token (RSA-2048)**: Token lisensi ditandatangani di sisi server menggunakan Private Key (`keys/license_private.key`), dan diverifikasi oleh WebApp menggunakan Public Key. Private Key tidak pernah diekspos ke frontend atau bundle klien.

### 3. 🛠️ Pusat Manajemen Lisensi Admin (`/admin/licenses` / Menu "Kelola Lisensi")
Admin dan Developer memiliki akses ke modul **Pusat Manajemen Lisensi** dengan fitur lengkap:
- **Statistik Realtime**: Total Lisensi, Aktif, Suspended, Expired, Revoked, dan Segera Expired (<30 Hari).
- **Tombol `+ Generate Lisensi Baru`**: Modal pembuatan lisensi kustom (Produk, Nama Pelanggan, Email, Domain, Tipe: Lifetime/Subscription/Trial, Batas Aktivasi, Expiration Date).
- **Tindakan (Actions)**:
  - 👁️ **Lihat Detail**: Rincian status, tanggal aktivasi, dan masa berlaku.
  - ⏸️ **Suspend / ▶️ Aktifkan Kembali**: Menghentikan sementara hak lisensi pelanggan.
  - 🚫 **Revoke (Cabut)**: Menolak token lisensi secara permanen.
  - 🔄 **Reset Domain**: Melepas kuncian domain agar lisensi dapat dipasang di domain baru pelanggan.
  - 🔁 **Reset Aktivasi**: Mengembalikan jumlah hitungan aktivasi ke 0.
  - ⏳ **Perpanjang Masa Aktif**: Menambah masa aktif (+30 hari, +90 hari, +1 tahun, atau tanggal kustom).
  - 🗑️ **Hapus Lisensi**.
- **Filter & Pencarian**: Pencarian instan berdasarkan kunci, nama sekolah, email, domain, filter status, tipe lisensi, dan masa berlaku.
- **Export Data**: Ekspor seluruh basis data lisensi ke format CSV dengan satu klik.
- **Audit Log**: Pencatatan histori seluruh operasi lisensi (generate, aktivasi, suspend, revoke, extend, reset).

---

## 📡 Dokumentasi Endpoint REST API Lisensi

License Server berjalan di port `3001` (atau via node script `server/license-server.js`):

### 1. `POST /api/license/activate`
Mengaktivasi lisensi pada domain WebApp.
- **Request Body**:
  ```json
  {
    "license_key": "JRAK-7F4K-9X2M-Q8VP-3N6T",
    "domain": "presensi.kangyos.com",
    "product": "presensi-smansa-pro"
  }
  ```
- **Response Success (200)**:
  ```json
  {
    "success": true,
    "status": "active",
    "message": "License activated successfully",
    "license": {
      "product": "presensi-smansa-pro",
      "domain": "presensi.kangyos.com",
      "customer_name": "Instansi Presensi Digital",
      "license_type": "Lifetime",
      "expires_at": null
    },
    "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```

### 2. `POST /api/license/verify`
Memverifikasi validitas signed token dan status lisensi terkini.
- **Request Body**:
  ```json
  {
    "token": "SIGNED_RSA_TOKEN",
    "domain": "presensi.kangyos.com",
    "product": "presensi-smansa-pro"
  }
  ```

### 3. `POST /api/license/deactivate`
Mencopot lisensi pada browser dan mengembalikan WebApp ke Mode Demo.

### 4. `GET /api/license/public-key`
Menyediakan RSA-2048 Public Key untuk verifikasi tanda tangan kriptografis token di frontend.

### 5. `GET /api/admin/licenses` & `POST /api/admin/licenses/generate`
Manajemen lisensi penuh untuk panel administrator.

---

## 🌐 Tautan Live Demo
👉 **[https://yoseples.github.io/Presensi/](https://yoseples.github.io/Presensi/)**
*(Official Repository: [github.com/yoseples/Presensi](https://github.com/yoseples/Presensi))*
