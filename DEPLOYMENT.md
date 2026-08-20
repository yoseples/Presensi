# 🚀 PRODUCTION DEPLOYMENT GUIDE (DEPLOYMENT.md)
**Sistem Presensi Digital & License Management Engine V2**
**Versi:** 2.0.0 (Release Candidate)

---

## 1. PERSYARATAN SISTEM (SYSTEM REQUIREMENTS)
- **Node.js**: v18.0.0 atau lebih baru (v20 LTS direkomendasikan).
- **RAM**: Minimal 1 GB (2 GB direkomendasikan untuk beban tinggi).
- **Storage**: Minimal 10 GB SSD.
- **Port**: 3001 (License Server API), 80/443 (Web Application).
- **SSL/TLS**: Wajib HTTPS di lingkungan production untuk keamanan transmisi data dan enkripsi token.

---

## 2. VARIABEL LINGKUNGAN (ENVIRONMENT VARIABLES)
Salin berkas template `.env.example` ke `.env` pada server hosting backend:
```bash
cp .env.example .env
```

### Klasifikasi Variabel:
- **Public Variables (Klien WebApp)**: `APP_NAME`, `APP_PUBLIC_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_DB_URL`.
- **Secret Variables (HANYA Server)**: `ADMIN_API_KEY`, `LICENSE_SERVER_PORT`, `RSA_PRIVATE_KEY_PATH`.

> ⚠️ **PERINGATAN**: Jangan pernah mengekspos `ADMIN_API_KEY` atau `license_private.key` ke dalam bundle frontend atau git.

---

## 3. DEPLOYMENT KUNCI KRIPTOGRAFI RSA-2048
1. Server akan secara otomatis memverifikasi keberadaan `keys/license_private.key` dan `keys/license_public.key`.
2. Jika belum ada, server akan membuat pasangan kunci RSA-2048 baru saat pertama kali dijalankan.
3. Pastikan path `keys/license_private.key` terdaftar di `.gitignore` dan hanya dapat dibaca oleh service user (`chmod 600 keys/license_private.key`).

---

## 4. DATABASE & FIREBASE CONFIGURATION
- Database lisensi tersimpan dalam format JSON atomik di direktori `data/licenses.json` dan `data/license_audit_logs.json`.
- Aturan Firebase diunggah menggunakan Firebase CLI:
  ```bash
  firebase deploy --only database
  ```
- File aturan yang aktif: `firebase.rules.json`.

---

## 5. LANGKAH DEPLOYMENT DENGAN PROCESS MANAGER (PM2)
```bash
# 1. Masuk ke direktori aplikasi
cd /var/www/sistem-absensi-digital

# 2. Backup database sebelum update
node scripts/backup-database.js backup pre_deployment

# 3. Jalankan License Server di background via PM2
pm2 start server/license-server.js --name "license-server-pro"

# 4. Simpan konfigurasi PM2
pm2 save
pm2 startup
```

---

## 6. VERIFIKASI POST-DEPLOYMENT
Lakukan uji kesehatan (*health check*) server:
```bash
# 1. Periksa status server
curl http://localhost:3001/api/license/status

# 2. Uji verifikasi kunci publik
curl http://localhost:3001/api/license/public-key

# 3. Jalankan seluruh regression test suite
node test/v2-operations-test.js
node test/penetration-test.js
node test/black-box-test.js
```

---

## 7. PROSEDUR ROLLBACK
Jika ditemukan kendala pada saat deployment:
```bash
# 1. Hentikan service
pm2 stop license-server-pro

# 2. Restore database cadangan
node scripts/backup-database.js restore <nama_folder_backup>

# 3. Jalankan kembali service versi stabil sebelumnya
pm2 start license-server-pro
```
