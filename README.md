# Presensi - Sistem Absensi SMA Negeri 1 Lhoksukon

**Sistem Presensi Digital dengan QR Code dan GPS SMA Negeri 1 Lhoksukon.**

Aplikasi web presensi siswa dan manajemen kehadiran sekolah modern, responsif, dan siap langsung di-deploy secara gratis ke **GitHub Pages**.

---

## 🌟 Fitur Utama SMANSA LHOKSUKON
1. **Multi-Role Login**:
   - **Developer (Master Super Admin)**: Akses eksklusif modul **Manajemen User** lintas seluruh role (Developer, Admin, Guru, Tendik, Siswa), reset password instan dengan enkripsi SHA-256 + Salt, audit status enkripsi, proteksi akun utama, export audit user ke Excel, dan bypass hak akses penuh ke seluruh modul sistem.
   - **Admin (Super Admin)**: Dashboard statistik global seluruh siswa, kelola direktori siswa, kelola akun guru & tendik, pengaturan waktu buka/tutup absensi, kelola tanggal merah/hari libur, serta rekap laporan kehadiran periode + export ke Excel.
   - **Guru / Wali Kelas**: Dashboard statistik kehadiran kelas yang diampu, scanner kamera presensi, kartu tanda pendidik digital, monitoring realtime siswa dengan dropdown status kehadiran, dan presensi mandiri (GPS).
   - **Tendik**: Presensi mandiri (GPS) & scanner kamera, kartu staf digital, dan profil akun.
   - **Siswa**: Dashboard kartu kehadiran hari ini, status jam datang & pulang, pengajuan izin/sakit mandiri, serta Kartu Pelajar Digital dengan QR Code siap cetak.
2. **Scanner Kamera QR Code (Html5Qrcode)**:
   - Mendukung kamera depan & belakang di smartphone atau laptop.
   - Otomatis mencatat absen datang (terlambat / tepat waktu) dan absen pulang (pulang cepat / selesai).
3. **Cetak Kartu Pelajar & Pendidik Digital**:
   - Generator QR Code instan berbasis NISN / NIP khusus SMA Negeri 1 Lhoksukon.
   - Dilengkapi tombol cetak kartu siap print / PDF.
4. **Monitoring & Laporan Excel (SheetJS)**:
   - Export Excel instan langsung terunduh ke perangkat (`.xlsx`).
   - Filter laporan berdasarkan rentang tanggal & kelas (`X MIPA 1`, `X MIPA 2`, `XI IPS 1`, dll.).
5. **Zero Backend Required (GitHub Pages Ready)**:
   - Menggunakan engine local web storage & Firebase Realtime Database terintegrasi, data tersimpan secara persisten dan langsung berfungsi realtime.

---

## 🔑 Akun Login Pengguna Bawaan

| Role | Username / NISN | Password | Nama Lengkap / Jabatan | Catatan |
| :--- | :--- | :--- | :--- | :--- |
| **Developer** | `developer` | `dev123` | System Developer (KangYos) | Eksklusif: Modul Manajemen User & Master Controller |
| **Admin** | `admin` | `admin123` | Administrator (Kepala TU) | Kelola Siswa, Guru, Tendik, Jadwal Absen & Laporan |
| **Guru** | `(Username Guru)` | `12345` | Bapak/Ibu Guru | Default password diseragamkan ke `12345` |
| **Tendik** | `(Username Tendik)` | `12345` | Tenaga Kependidikan | Default password diseragamkan ke `12345` |
| **Siswa** | `(NISN Siswa)` | `12345` | Siswa / Pelajar | Default password diseragamkan ke `12345` |

---

## 🌐 Tautan Live Produksi
👉 **[https://yoseples.github.io/smansalhoksukon/](https://yoseples.github.io/smansalhoksukon/)**
*(Demo: [https://yoseples.github.io/Presensi/](https://yoseples.github.io/Presensi/))*
