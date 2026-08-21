# 👑 PANDUAN OPERASIONAL ADMIN LISENSI (LICENSE_ADMIN.md)
**Standar Operasional Prosedur (SOP) Pengelolaan Lisensi Sistem Presensi Digital**
**Versi:** 2.0.0 (Release Candidate)

---

## 1. DAFTAR TINDAKAN & OPERASI LISENSI (SOP)

| Tindakan | Kapan Digunakan | Dampak Sistem | Konfirmasi Diperlukan |
| :--- | :--- | :--- | :---: |
| **GENERATE** | Sekolah/klien baru memesan sistem | Menghasilkan kunci acak berstatus `unused` atau `active` | Tidak |
| **ACTIVATE** | Klien pertama kali memasukkan kunci pada domainnya | Mengunci domain (*Domain Binding*) dan status menjadi `active` | Otomatis |
| **SUSPEND** | Pembayaran tertunda atau investigasi penyalahgunaan | Membekukan token, klien kembali ke Demo Mode | **Ya** |
| **REACTIVATE** | Klien telah menyelesaikan kewajiban / klarifikasi | Membuka kembali status `active` pada domain yang terdaftar | Tidak |
| **REVOKE** | Pelanggaran kontrak permanen atau lisensi dibatalkan | Lisensi dicabut permanen, token langsung ditolak server | **Ya (Kritis)** |
| **EXTEND** | Klien memperpanjang masa langganan (+30h, +90h, +1th) | Menambah tanggal `expires_at` dan mengaktifkan kembali jika expired | Tidak |
| **CHANGE PLAN** | Klien upgrade/downgrade (`BASIC`, `PRO`, `ENTERPRISE`) | Menyesuaikan peta entitlement fitur secara realtime di server | **Ya** |
| **RESET DOMAIN** | Klien salah memasukkan domain saat aktivasi awal | Menghapus domain binding sehingga kunci dapat diaktivasi ulang | **Ya** |
| **RESET ACTIVATION**| Jumlah aktivasi mencapai batas maksimal (`max_activation`)| Mengembalikan hitungan aktivasi ke 0 | **Ya** |
| **TRANSFER** | Klien resmi migrasi nama domain sekolah | Memindahkan lisensi ke domain baru, membatalkan token domain lama | **Ya (Kritis)** |

---

## 2. PANDUAN PEMBUATAN LISENSI BARU (GENERATE)
1. Buka menu **Admin Panel** $\rightarrow$ **Kelola Lisensi**.
2. Klik tombol **[+ Buat Lisensi Baru]**.
3. Isi data:
   - **Nama Instansi / Sekolah**: (Contoh: *SMA Negeri 1 Indonesia / Instansi Klien*).
   - **Email Pelanggan**: (Contoh: *admin@instansi.sch.id*).
   - **Paket Lisensi**:
     - `BASIC`: Fitur presensi dasar & laporan sederhana.
     - `PRO`: Presensi, laporan, ekspor rekap digital resmi, dan multi-user.
     - `ENTERPRISE`: Semua fitur + bulk QR generator + cloud backup sync + custom white-label branding.
   - **Domain (Opsional)**: Kosongkan jika ingin domain terkunci otomatis saat klien melakukan aktivasi pertama.
   - **Masa Berlaku**: Pilih 1 Tahun, 6 Bulan, 3 Bulan, atau Lifetime.
4. Klik **Simpan & Generate Kunci**.
5. Klik ikon **Salin Kunci** dan kirimkan ke pihak sekolah.

---

## 3. MONITORING & DETEKSI ANOMALI (SUSPICIOUS ACTIVITY)
Pada dashboard admin, sistem menampilkan indikator kesehatan lisensi:
- **Status NORMAL**: Penggunaan wajar tanpa kegagalan aktivasi berulang.
- **Status SUSPICIOUS**: Terdeteksi lebih dari 5 kali kegagalan aktivasi atau 3 kali *domain mismatch* dalam 24 jam.

> 🔍 **Langkah Investigasi**: Buka menu **Audit Logs**, filter berdasarkan ID lisensi terkait, dan periksa alamat IP serta *User-Agent* yang mencoba mengakses.

---

## 4. PENANGANAN INSIDEN KEAMANAN (INCIDENT RESPONSE SOP)
1. **Kunci Lisensi Bocor ke Publik**:
   - Jika belum diaktivasi: Lakukan **DELETE** atau **REVOKE** lisensi tersebut dan generate kunci baru.
   - Jika sudah terikat domain sah: Lisensi tetap aman karena terkunci pada domain klien; namun jika dicurigai, lakukan **TRANSFER** atau **REVOKE** dan terbitkan lisensi pengganti.
2. **Klien Ganti Domain Sekolah**:
   - Minta surat permohonan resmi dari kepala sekolah.
   - Gunakan fitur **TRANSFER DOMAIN** dari panel admin.
3. **Kunci Privat Server Kompromis**:
   - Segera jalankan prosedur **Key Rotation** di server.
   - Terbitkan pasangan kunci baru dan deploy ke secret manager.
