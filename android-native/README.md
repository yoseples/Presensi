# Aplikasi Android Presensi Digital WebApp

Aplikasi Android Native (Java) berbasis WebView Modern untuk sistem presensi **Presensi Digital WebApp** (https://presensi.kangyos.com/).

---

## 🚀 Fitur Utama Aplikasi Android
1. **Dukungan Kamera & Scanner QR**: Integrasi langsung `WebChromeClient.onPermissionRequest` untuk memastikan kamera aktif mulus saat scan kartu absensi QR Code.
2. **Validasi GPS / Geolocation**: Handler izin lokasi instan agar penentuan radius absensi siswa/guru/tendik akurat.
3. **Pull to Refresh (Swipe Refresh)**: Tarik ke bawah untuk memuat ulang data absensi secara realtime.
4. **File Chooser (Unggah Berkas)**: Mendukung upload surat keterangan izin/sakit langsung dari kamera atau galeri smartphone.
5. **Download Manager**: Mengunduh rekap laporan Excel & kartu QR dengan notifikasi unduhan native.
6. **Smart Back Navigation**: Menekan tombol kembali (back) menavigasi riwayat halaman web terlebih dahulu sebelum keluar aplikasi.
7. **Offline Screen**: Tampilan ramah pengguna dengan tombol "Coba Lagi" jika koneksi internet terputus.

---

## 🛠️ Cara Membuka & Membuat File APK

### 1. Membuka di Android Studio
1. Buka software **Android Studio**.
2. Pilih menu **File** > **Open...**
3. Arahkan ke folder:
   `/Users/yoseples/.gemini/antigravity-ide/scratch/sistem-absensi-digital/android-native`
4. Tunggu proses *Gradle Sync* selesai.

### 2. Menjalankan Langsung ke HP Android
1. Hubungkan HP Android ke komputer via kabel USB (Pastikan *USB Debugging* aktif di menu Opsi Pengembang).
2. Klik tombol hijau **Run 'app'** (ikon ▶️) di toolbar atas Android Studio.

### 3. Menghasilkan File APK (Build APK)
- **APK Debug (Untuk Uji Coba Cepat)**:
  - Menu **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
  - File APK akan tersimpan di: `app/build/outputs/apk/debug/app-debug.apk`.
- **APK Release (Untuk Dibagikan ke Guru & Siswa)**:
  - Menu **Build** > **Generate Signed Bundle / APK...**
  - Pilih **APK** > Masukkan KeyStore > Pilih build variant **release**.
