# Presensi - Sistem Absensi SMA Negeri 1 Lhoksukon

**Sistem Presensi Digital dengan QR Code dan GPS SMA Negeri 1 Lhoksukon.**

Aplikasi web presensi siswa dan manajemen kehadiran sekolah modern, responsif, dan siap langsung di-deploy secara gratis ke **GitHub Pages**.

---

## 🌟 Fitur Utama SMANSA LHOKSUKON
1. **Multi-Role Login**:
   - **Siswa**: Dashboard kartu kehadiran hari ini, status jam datang & pulang, serta Kartu Pelajar Digital dengan QR Code yang bisa langsung dicetak.
   - **Guru / Wali Kelas**: Dashboard statistik kehadiran kelas yang diampu, scanner kamera presensi, serta monitoring realtime siswa dengan dropdown status kehadiran.
   - **Admin**: Dashboard statistik global seluruh siswa, kelola direktori siswa, kelola akun guru, pengaturan waktu buka/tutup absensi, kelola tanggal merah/hari libur, serta rekap laporan kehadiran periode + export ke Excel.
2. **Scanner Kamera QR Code (Html5Qrcode)**:
   - Mendukung kamera depan & belakang di smartphone atau laptop.
   - Otomatis mencatat absen datang (terlambat / tepat waktu) dan absen pulang (pulang cepat / selesai).
3. **Cetak Kartu Pelajar Digital**:
   - Generator QR Code instan berbasis NISN khusus SMA Negeri 1 Lhoksukon.
   - Dilengkapi tombol cetak kartu siap print / PDF.
4. **Monitoring & Laporan Excel (SheetJS)**:
   - Export Excel instan langsung terunduh ke perangkat (`.xlsx`).
   - Filter laporan berdasarkan rentang tanggal & kelas (`X MIPA 1`, `X MIPA 2`, `XI IPS 1`, dll.).
5. **Zero Backend Required (GitHub Pages Ready)**:
   - Menggunakan engine local web storage di browser, data tersimpan secara persisten dan langsung berfungsi tanpa perlu konfigurasi server.

---

## 🔑 Akun Login Administrator

| Role | Username | Password | Nama Lengkap / Jabatan |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `admin123` / `12345` | Administrator (Kepala TU) |

---

## 🌐 Tautan Live Produksi
👉 **[https://yoseples.github.io/smansalhoksukon/](https://yoseples.github.io/smansalhoksukon/)**
*(Demo: [https://yoseples.github.io/Presensi/](https://yoseples.github.io/Presensi/))*
