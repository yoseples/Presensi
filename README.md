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

## 🔑 Akun Login Pengguna Bawaan (Versi Demo)

Aplikasi ini dilengkapi fitur **1-Click Quick Demo Login** pada halaman login untuk memudahkan pengujian semua role:

| Role | Username / NISN | Password | Nama Lengkap / Jabatan | Catatan Akses |
| :--- | :--- | :--- | :--- | :--- |
| **👑 Developer** | `developer` | `dev123` | System Developer (KangYos) | Eksklusif: Manajemen User, Reset DB Demo, Full Bypass |
| **🛡️ Admin** | `admin` | `admin123` | Administrator SMANSA | Kelola Siswa, Guru, Tendik, Laporan, & Pengaturan Branding |
| **👨‍🏫 Guru** | `guru1` | `12345` | Drs. Syamsuddin, M.Pd | Wali Kelas XII MIPA 1, Monitoring Kehadiran, Scan QR |
| **👨‍🏫 Guru** | `guru2` | `12345` | Cut Nurhaliza, S.Pd | Wali Kelas XI IPS 1, Monitoring Kehadiran |
| **👔 Tendik** | `tendik1` | `12345` | Zulfikar, S.Sos | Staf Tata Usaha, Presensi Mandiri GPS |
| **🎓 Siswa** | `20240101` | `12345` | Ahmad Fadhil (XII MIPA 1) | Kartu Pelajar Digital, Presensi Mandiri, Status Kehadiran |
| **🎓 Siswa** | `20240102` | `12345` | Siti Raisa (XII MIPA 1) | Kartu Pelajar Digital, Izin Mandiri |
| **🎓 Siswa** | `20240201` | `12345` | Rizky Pratama (XI IPS 1) | Kartu Pelajar Digital |

---

## 🛡️ Proteksi & Pembatasan Versi Demo (Demo Safeguards)
1. **Proteksi Password Inti**: Password akun `developer` dan `admin` tidak dapat diubah oleh pengunjung demo untuk mencegah akun terkunci.
2. **Proteksi Akun Bawaan**: Akun demo bawaan di atas dilindungi dari penghapusan.
3. **Proteksi Hapus Massal**: Penghapusan massal seluruh siswa/guru dinonaktifkan di mode demo.
4. **Tombol Reset DB Demo (Developer)**: Developer dapat mengembalikan seluruh database demo ke setelan awal pabrik kapan saja dengan 1 klik.

---

## 🌐 Tautan Live Demo
👉 **[https://yoseples.github.io/Presensi/](https://yoseples.github.io/Presensi/)**
*(Official Repository: [github.com/yoseples/Presensi](https://github.com/yoseples/Presensi))*
