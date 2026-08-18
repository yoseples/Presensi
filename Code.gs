// ============================================================================
// APLIKASI PRESENSI SMA NEGERI 1 LHOKSUKON (SMANSA LHOKSUKON)
// GOOGLE APPS SCRIPT BACKEND (Code.gs)
// ============================================================================

// ⚠️ WAJIB DIUBAH: Ganti SPREADSHEET_ID dengan ID Google Sheet Anda
// Contoh URL: https://docs.google.com/spreadsheets/d/1ABC123XYZ.../edit
// Maka ID-nya adalah: 1ABC123XYZ...
const SPREADSHEET_ID = 'GANTI_DENGAN_ID_GOOGLE_SHEET_ANDA';

// Helper untuk mendapatkan objek Spreadsheet
function getSpreadsheet() {
  if (SPREADSHEET_ID === 'GANTI_DENGAN_ID_GOOGLE_SHEET_ANDA') {
    return SpreadsheetApp.getActiveSpreadsheet();
  }
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

// ============================================================================
// 1. MAIN ENTRY POINTS (WEB APP & API ENDPOINT UNTUK CPANEL/HOSTING)
// ============================================================================

// A. Tampilan Web App langsung jika dibuka di browser via Google Apps Script
function doGet(e) {
  const template = HtmlService.createTemplateFromFile('index');
  return template.evaluate()
    .setTitle('Presensi - Sistem Absensi SMA Negeri 1 Lhoksukon')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setFaviconUrl('favicon.png');
}

// B. HTTP POST API Endpoint (Wajib ada untuk cPanel / Website Eksternal)
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    const args = data.args || [];

    if (typeof this[action] === 'function') {
      const result = this[action](...args);
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: 'Action "' + action + '" tidak ditemukan di server.' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: 'API Error: ' + error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================================
// 2. AUTENTIKASI, SESSION & KEAMANAN TOKEN
// ============================================================================

function login(username, password, nisn) {
  try {
    const ss = getSpreadsheet();
    const usersSheet = ss.getSheetByName('users');
    const guruSheet = ss.getSheetByName('guru');
    const tendikSheet = ss.getSheetByName('tendik');
    const siswaSheet = ss.getSheetByName('siswa');

    let userFound = null;

    // A. Login SISWA (Gunakan NISN)
    if (nisn || (username && !isNaN(username))) {
      const targetNisn = String(nisn || username).trim();
      if (siswaSheet) {
        const siswaData = siswaSheet.getDataRange().getValues();
        for (let i = 1; i < siswaData.length; i++) {
          if (String(siswaData[i][1]).trim() === targetNisn) { 
            userFound = {
              role: 'siswa',
              identifier: String(siswaData[i][1]).trim(), // NISN
              nama: siswaData[i][0],
              kelas: siswaData[i][8]
            };
            break;
          }
        }
      }
      if (!userFound && (!password || password.trim() === "")) {
        return { success: false, message: 'NISN ' + targetNisn + ' tidak ditemukan di database.' };
      }
    } 

    // B. Login ADMIN, GURU & TENDIK (Cek sheet users, guru, atau tendik)
    if (!userFound) {
      const targetUser = String(username || nisn || '').trim();
      const targetPass = String(password || '').trim();

      // 1. Cek Sheet Users
      if (usersSheet) {
        const userData = usersSheet.getDataRange().getValues();
        for (let i = 1; i < userData.length; i++) {
          const uUsername = String(userData[i][0]).trim().toLowerCase();
          const uPassword = String(userData[i][1]).replace(/^'/, '').trim();
          const uNip = userData[i][4] ? String(userData[i][4]).trim() : '';

          if ((uUsername === targetUser.toLowerCase() || uNip === targetUser) && uPassword === targetPass) {
            userFound = {
              role: userData[i][2] || 'guru',
              identifier: userData[i][0], // Username
              nama: userData[i][5] || userData[i][0],
              nip: uNip || '-',
              jabatan: userData[i][6] || (userData[i][3] ? 'Wali Kelas ' + userData[i][3] : 'Pegawai SMANSA'),
              kelas: userData[i][3] || '',
              noHp: userData[i][7] || '-'
            };
            break;
          }
        }
      }

      // 2. Fallback Cek Sheet Guru jika belum ketemu
      if (!userFound && guruSheet) {
        const gData = guruSheet.getDataRange().getValues();
        for (let i = 1; i < gData.length; i++) {
          const gNip = String(gData[i][0]).trim();
          const gName = String(gData[i][1]).trim();
          const gUser = String(gData[i][4] || '').trim().toLowerCase();
          const gPass = String(gData[i][5] || '').replace(/^'/, '').trim();

          if ((gUser === targetUser.toLowerCase() || gNip === targetUser) && gPass === targetPass) {
            userFound = {
              role: 'guru',
              identifier: gUser || gNip,
              nama: gName,
              nip: gNip,
              jabatan: gData[i][2] || 'Guru SMANSA',
              kelas: gData[i][2] || '',
              noHp: gData[i][3] || '-'
            };
            break;
          }
        }
      }

      // 3. Fallback Cek Sheet Tendik jika belum ketemu
      if (!userFound && tendikSheet) {
        const tData = tendikSheet.getDataRange().getValues();
        for (let i = 1; i < tData.length; i++) {
          const tNip = String(tData[i][0]).trim();
          const tName = String(tData[i][1]).trim();
          const tUser = String(tData[i][4] || '').trim().toLowerCase();
          const tPass = String(tData[i][5] || '').replace(/^'/, '').trim();

          if ((tUser === targetUser.toLowerCase() || tNip === targetUser) && tPass === targetPass) {
            userFound = {
              role: 'tendik',
              identifier: tUser || tNip,
              nama: tName,
              nip: tNip,
              jabatan: tData[i][2] || 'Staf Kependidikan',
              kelas: tData[i][2] || '',
              noHp: tData[i][3] || '-'
            };
            break;
          }
        }
      }
    }

    if (!userFound) {
      return { success: false, message: 'Username, NIP, atau Password salah.' };
    }

    // Generate Token Sesi (UUID)
    const token = Utilities.getUuid();
    const expiry = new Date();
    expiry.setTime(expiry.getTime() + (24 * 60 * 60 * 1000)); // 24 jam

    let sessionSheet = ss.getSheetByName('sessions');
    if (!sessionSheet) {
      sessionSheet = ss.insertSheet('sessions');
      sessionSheet.appendRow(['Token', 'Identifier', 'Role', 'Expiry']);
      sessionSheet.getRange("D:D").setNumberFormat("yyyy-mm-dd hh:mm:ss");
    }

    sessionSheet.appendRow([
      token, 
      userFound.identifier, 
      userFound.role, 
      expiry
    ]);

    return {
      success: true,
      token: token,
      role: userFound.role,
      username: userFound.identifier,
      nama: userFound.nama,
      nip: userFound.nip || null,
      jabatan: userFound.jabatan || null,
      kelas: userFound.kelas,
      noHp: userFound.noHp || null,
      nisn: (userFound.role === 'siswa') ? userFound.identifier : null
    };

  } catch (error) {
    return { success: false, message: "Login Error: " + error.toString() };
  }
}

function verifyUser(token, requiredRole) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName('sessions');
  if (!sheet) return true;
  
  const data = sheet.getDataRange().getValues();
  const now = new Date();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === token) {
      if (data[i][3] instanceof Date && data[i][3] > now) {
        if (requiredRole && data[i][2] !== requiredRole && data[i][2] !== 'admin') {
           throw new Error("Akses Ditolak: Anda tidak memiliki izin.");
        }
        return true;
      } else {
        throw new Error("Sesi berakhir. Silakan login ulang.");
      }
    }
  }
  return true;
}

// ============================================================================
// 3. MANAJEMEN SISWA (CRUD)
// ============================================================================

function getSiswaList() {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('siswa');
    if (!sheet) return { success: true, data: [] };
    
    // Mapping kata sandi akun siswa dari sheet users (jika pernah diubah)
    const usersSheet = ss.getSheetByName('users');
    const userPassMap = {};
    if (usersSheet) {
      const uData = usersSheet.getDataRange().getValues();
      for (let j = 1; j < uData.length; j++) {
        const uId = String(uData[j][0]).trim().toLowerCase();
        const uNisn = uData[j][4] ? String(uData[j][4]).trim().toLowerCase() : '';
        const uPass = String(uData[j][1] || '').trim();
        if (uPass) {
          if (uId) userPassMap[uId] = uPass;
          if (uNisn) userPassMap[uNisn] = uPass;
        }
      }
    }

    const data = sheet.getDataRange().getValues();
    const siswaList = [];
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) { 
        let rawTgl = data[i][3];
        let tglLahir = '';

        if (rawTgl instanceof Date) {
          tglLahir = Utilities.formatDate(rawTgl, 'Asia/Jakarta', 'yyyy-MM-dd');
        } else if (typeof rawTgl === 'string') {
          let cleanTgl = rawTgl.replace(/'/g, "").trim();
          if (cleanTgl.includes('-')) {
            let parts = cleanTgl.split('-');
            if (parts[2] && parts[2].length === 4) {
               tglLahir = parts[2] + '-' + parts[1] + '-' + parts[0];
            } else {
               tglLahir = cleanTgl;
            }
          }
        }

        const nisnClean = String(data[i][1]).replace(/^'/, '').trim();
        const customPass = userPassMap[nisnClean.toLowerCase()] || '';

        siswaList.push({
          nama: data[i][0],
          nisn: nisnClean,
          password: customPass || nisnClean, // Password akun siswa (default NISN atau custom)
          jenisKelamin: data[i][2],
          tanggalLahir: tglLahir,
          agama: data[i][4],
          namaAyah: data[i][5],
          namaIbu: data[i][6],
          noHp: String(data[i][7]).replace(/^'/, ''),
          kelas: data[i][8],
          alamat: data[i][9]
        });
      }
    }
    
    return { success: true, data: siswaList };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function getSiswaByNisn(nisn) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('siswa');
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][1]).trim() == String(nisn).trim()) {
        let tglLahir = '';
        if (data[i][3]) {
          tglLahir = Utilities.formatDate(new Date(data[i][3]), 'Asia/Jakarta', 'yyyy-MM-dd');
        }

        return {
          success: true,
          data: {
            nama: data[i][0],
            nisn: String(data[i][1]).replace(/^'/, ''),
            jenisKelamin: data[i][2],
            tanggalLahir: tglLahir,
            agama: data[i][4],
            namaAyah: data[i][5],
            namaIbu: data[i][6],
            noHp: String(data[i][7]).replace(/^'/, ''),
            kelas: data[i][8],
            alamat: data[i][9]
          }
        };
      }
    }
    
    return { success: false, message: 'Siswa tidak ditemukan' };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function addSiswa(token, siswaData) { 
  try {
    verifyUser(token, 'admin'); 

    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('siswa');
    const data = sheet.getDataRange().getValues();
    const cleanNisn = String(siswaData.nisn).trim();

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][1]).trim() == cleanNisn) {
        return { success: false, message: 'NISN sudah terdaftar!' };
      }
    }
    
    let tglSimpan = siswaData.tanggalLahir;
    if (tglSimpan && tglSimpan.includes('-')) {
      let parts = tglSimpan.split('-');
      if (parts[0].length === 4) {
        tglSimpan = "'" + parts[2] + '-' + parts[1] + '-' + parts[0];
      }
    }

    sheet.appendRow([
      siswaData.nama,
      "'" + cleanNisn,
      siswaData.jenisKelamin,
      tglSimpan,
      siswaData.agama,
      siswaData.namaAyah,
      siswaData.namaIbu,
      "'" + siswaData.noHp,
      siswaData.kelas,
      siswaData.alamat
    ]);
    return { success: true, message: 'Siswa berhasil ditambahkan' };

  } catch (error) {
    return { success: false, message: "Gagal: " + error.message };
  }
}

function updateSiswa(token, oldNisn, siswaData) {
  try {
    verifyUser(token, 'admin');

    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('siswa');
    const data = sheet.getDataRange().getValues();
    const cleanOld = String(oldNisn).trim();
    
    let tglSimpan = siswaData.tanggalLahir;
    if (tglSimpan && tglSimpan.includes('-')) {
       let parts = tglSimpan.split('-');
       if(parts[0].length === 4) {
           tglSimpan = "'" + parts[2] + '-' + parts[1] + '-' + parts[0];
       }
    }

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][1]).trim() == cleanOld) {
        sheet.getRange(i + 1, 1, 1, 10).setValues([[
          siswaData.nama,
          "'" + siswaData.nisn,
          siswaData.jenisKelamin,
          tglSimpan,
          siswaData.agama,
          siswaData.namaAyah,
          siswaData.namaIbu,
          "'" + siswaData.noHp,
          siswaData.kelas,
          siswaData.alamat
        ]]);
        return { success: true, message: 'Data siswa berhasil diupdate' };
      }
    }
    
    return { success: false, message: 'Siswa tidak ditemukan' };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function deleteSiswa(token, nisn) {
  try {
    verifyUser(token, 'admin'); 

    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('siswa');
    const data = sheet.getDataRange().getValues();
    const cleanNisn = String(nisn).trim();
    
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][1]).trim() === cleanNisn) {
        sheet.deleteRow(i + 1);
        return { success: true, message: 'Data siswa berhasil dihapus.' };
      }
    }
    
    return { success: false, message: 'Data siswa tidak ditemukan.' };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

// ============================================================================
// 4. MANAJEMEN GURU & TENDIK (CRUD)
// ============================================================================

function getGuruList(token) {
  try {
    verifyUser(token, 'admin'); 

    const ss = getSpreadsheet();
    const guruSheet = ss.getSheetByName('guru');
    const usersSheet = ss.getSheetByName('users');
    const guruList = [];

    // Baca dari sheet guru jika ada (hanya guru, sembunyikan administrator)
    if (guruSheet) {
      const data = guruSheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][1]) {
          const uRole = String(data[i][2] || 'guru').toLowerCase();
          const uUsername = String(data[i][4] || '').toLowerCase();
          if (uRole !== 'admin' && uUsername !== 'admin') {
            guruList.push({
              nip: String(data[i][0]).replace(/^'/, ''),
              nama: data[i][1],
              jabatan: data[i][2] || 'Guru SMANSA',
              kelas: data[i][2] || '',
              noHp: String(data[i][3]).replace(/^'/, ''),
              username: String(data[i][4]),
              password: String(data[i][5]),
              role: 'guru'
            });
          }
        }
      }
    }

    // Jika belum ada data dari sheet guru, baca dari sheet users (hanya role guru)
    if (guruList.length === 0 && usersSheet) {
      const data = usersSheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        const uRole = String(data[i][2] || '').toLowerCase();
        const uUsername = String(data[i][0] || '').toLowerCase();
        if (uRole === 'guru' && uUsername !== 'admin') {
          guruList.push({
            username: String(data[i][0]),
            password: String(data[i][1]),
            role: data[i][2],
            kelas: data[i][3] || "",
            nip: data[i][4] ? String(data[i][4]).replace(/^'/, '') : "-",
            nama: data[i][5] || data[i][0],
            jabatan: data[i][6] || (data[i][3] ? 'Wali Kelas ' + data[i][3] : 'Guru SMANSA'),
            noHp: data[i][7] ? String(data[i][7]).replace(/^'/, '') : "-"
          });
        }
      }
    }

    // Pastikan akun admin tidak pernah muncul di list guru
    const cleanList = guruList.filter(g => String(g.role || '').toLowerCase() !== 'admin' && String(g.username || '').toLowerCase() !== 'admin');

    return { success: true, data: cleanList };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

function addGuru(token, username, password, kelas, nip, nama, jabatan, noHp) {
  try {
    verifyUser(token, 'admin');

    const ss = getSpreadsheet();
    let usersSheet = ss.getSheetByName('users');
    if (!usersSheet) {
      usersSheet = ss.insertSheet('users');
      usersSheet.appendRow(['Username', 'Password', 'Role', 'Kelas', 'NIP', 'Nama Lengkap', 'Jabatan', 'No Handphone']);
    }

    const cleanU = String(username).trim();
    const uData = usersSheet.getDataRange().getValues();
    for (let i = 1; i < uData.length; i++) {
      if (String(uData[i][0]).trim().toLowerCase() === cleanU.toLowerCase()) {
        return { success: false, message: 'Username sudah terdaftar' };
      }
    }

    usersSheet.appendRow([
      "'" + cleanU, 
      "'" + password, 
      'guru', 
      kelas || '',
      "'" + (nip || '-'),
      nama || cleanU,
      jabatan || (kelas ? 'Wali Kelas ' + kelas : 'Guru SMANSA'),
      "'" + (noHp || '-')
    ]);

    // Sinkronisasi ke sheet guru jika ada
    let guruSheet = ss.getSheetByName('guru');
    if (guruSheet) {
      guruSheet.appendRow([
        "'" + (nip || '-'),
        nama || cleanU,
        jabatan || (kelas ? 'Wali Kelas ' + kelas : 'Guru SMANSA'),
        "'" + (noHp || '-'),
        "'" + cleanU,
        "'" + password
      ]);
    }

    return { success: true, message: 'Guru berhasil ditambahkan' };
  } catch (error) {
    return { success: false, message: "Gagal: " + error.message };
  }
}

function updateGuru(token, oldUsername, newUsername, password, kelas, nip, nama, jabatan, noHp) {
  try {
    verifyUser(token, 'admin');

    const ss = getSpreadsheet();
    const usersSheet = ss.getSheetByName('users');
    if (usersSheet) {
      const data = usersSheet.getDataRange().getValues();
      const cleanOld = String(oldUsername).trim().toLowerCase();
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]).trim().toLowerCase() === cleanOld) {
          usersSheet.getRange(i + 1, 1, 1, 8).setValues([[
            "'" + newUsername, 
            "'" + password, 
            data[i][2] || 'guru', 
            kelas || '',
            "'" + (nip || '-'),
            nama || newUsername,
            jabatan || (kelas ? 'Wali Kelas ' + kelas : 'Guru SMANSA'),
            "'" + (noHp || '-')
          ]]);
          break;
        }
      }
    }

    const guruSheet = ss.getSheetByName('guru');
    if (guruSheet) {
      const gData = guruSheet.getDataRange().getValues();
      for (let i = 1; i < gData.length; i++) {
        if (String(gData[i][4]).trim().toLowerCase() === String(oldUsername).trim().toLowerCase()) {
          guruSheet.getRange(i + 1, 1, 1, 6).setValues([[
            "'" + (nip || '-'),
            nama || newUsername,
            jabatan || (kelas ? 'Wali Kelas ' + kelas : 'Guru SMANSA'),
            "'" + (noHp || '-'),
            "'" + newUsername,
            "'" + password
          ]]);
          break;
        }
      }
    }

    return { success: true, message: 'Data guru berhasil diupdate' };
  } catch (error) {
    return { success: false, message: "Gagal: " + error.message };
  }
}

function deleteGuru(token, username) {
  try {
    verifyUser(token, 'admin');

    const ss = getSpreadsheet();
    const cleanU = String(username).trim().toLowerCase();

    const usersSheet = ss.getSheetByName('users');
    if (usersSheet) {
      const data = usersSheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]).trim().toLowerCase() === cleanU) {
          usersSheet.deleteRow(i + 1);
          break;
        }
      }
    }

    const guruSheet = ss.getSheetByName('guru');
    if (guruSheet) {
      const gData = guruSheet.getDataRange().getValues();
      for (let i = 1; i < gData.length; i++) {
        if (String(gData[i][4]).trim().toLowerCase() === cleanU) {
          guruSheet.deleteRow(i + 1);
          break;
        }
      }
    }

    const tendikSheet = ss.getSheetByName('tendik');
    if (tendikSheet) {
      const tData = tendikSheet.getDataRange().getValues();
      for (let i = 1; i < tData.length; i++) {
        if (String(tData[i][4]).trim().toLowerCase() === cleanU) {
          tendikSheet.deleteRow(i + 1);
          break;
        }
      }
    }

    return { success: true, message: 'Pengguna berhasil dihapus' };
  } catch (error) {
    return { success: false, message: "Gagal: " + error.message };
  }
}

// MANAJEMEN TENDIK (STAF KEPENDIDIKAN)
function getTendikList(token) {
  try {
    verifyUser(token, 'admin');

    const ss = getSpreadsheet();
    const tendikSheet = ss.getSheetByName('tendik');
    const usersSheet = ss.getSheetByName('users');
    const tendikList = [];

    // Baca dari sheet tendik jika ada
    if (tendikSheet) {
      const data = tendikSheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][1]) {
          tendikList.push({
            nip: String(data[i][0]).replace(/^'/, ''),
            nama: data[i][1],
            jabatan: data[i][2] || 'Staf Kependidikan',
            kelas: data[i][2] || '',
            noHp: String(data[i][3]).replace(/^'/, ''),
            username: String(data[i][4]),
            password: String(data[i][5]),
            role: 'tendik'
          });
        }
      }
    }

    // Jika belum ada data di sheet tendik, baca dari sheet users
    if (tendikList.length === 0 && usersSheet) {
      const data = usersSheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][2] == 'tendik') {
          tendikList.push({
            username: String(data[i][0]),
            password: String(data[i][1]),
            role: 'tendik',
            kelas: data[i][3] || "",
            nip: data[i][4] ? String(data[i][4]).replace(/^'/, '') : "-",
            nama: data[i][5] || data[i][0],
            jabatan: data[i][6] || 'Staf Kependidikan',
            noHp: data[i][7] ? String(data[i][7]).replace(/^'/, '') : "-"
          });
        }
      }
    }

    return { success: true, data: tendikList };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

function addTendik(token, username, password, nip, nama, jabatan, noHp) {
  try {
    verifyUser(token, 'admin');

    const ss = getSpreadsheet();
    let usersSheet = ss.getSheetByName('users');
    if (!usersSheet) {
      usersSheet = ss.insertSheet('users');
      usersSheet.appendRow(['Username', 'Password', 'Role', 'Kelas', 'NIP', 'Nama Lengkap', 'Jabatan', 'No Handphone']);
    }

    const cleanU = String(username).trim();
    const uData = usersSheet.getDataRange().getValues();
    for (let i = 1; i < uData.length; i++) {
      if (String(uData[i][0]).trim().toLowerCase() === cleanU.toLowerCase()) {
        return { success: false, message: 'Username sudah terdaftar' };
      }
    }

    usersSheet.appendRow([
      "'" + cleanU, 
      "'" + password, 
      'tendik', 
      '',
      "'" + (nip || '-'),
      nama || cleanU,
      jabatan || 'Staf Kependidikan',
      "'" + (noHp || '-')
    ]);

    // Sinkronkan ke sheet tendik jika ada
    let tendikSheet = ss.getSheetByName('tendik');
    if (tendikSheet) {
      tendikSheet.appendRow([
        "'" + (nip || '-'),
        nama || cleanU,
        jabatan || 'Staf Kependidikan',
        "'" + (noHp || '-'),
        "'" + cleanU,
        "'" + password
      ]);
    }

    return { success: true, message: 'Data Tendik berhasil ditambahkan' };
  } catch (error) {
    return { success: false, message: "Gagal: " + error.message };
  }
}

function updateTendik(token, oldUsername, newUsername, password, nip, nama, jabatan, noHp) {
  try {
    verifyUser(token, 'admin');

    const ss = getSpreadsheet();
    const usersSheet = ss.getSheetByName('users');
    if (usersSheet) {
      const data = usersSheet.getDataRange().getValues();
      const cleanOld = String(oldUsername).trim().toLowerCase();
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]).trim().toLowerCase() === cleanOld) {
          usersSheet.getRange(i + 1, 1, 1, 8).setValues([[
            "'" + newUsername, 
            "'" + password, 
            'tendik', 
            '',
            "'" + (nip || '-'),
            nama || newUsername,
            jabatan || 'Staf Kependidikan',
            "'" + (noHp || '-')
          ]]);
          break;
        }
      }
    }

    const tendikSheet = ss.getSheetByName('tendik');
    if (tendikSheet) {
      const tData = tendikSheet.getDataRange().getValues();
      for (let i = 1; i < tData.length; i++) {
        if (String(tData[i][4]).trim().toLowerCase() === String(oldUsername).trim().toLowerCase()) {
          tendikSheet.getRange(i + 1, 1, 1, 6).setValues([[
            "'" + (nip || '-'),
            nama || newUsername,
            jabatan || 'Staf Kependidikan',
            "'" + (noHp || '-'),
            "'" + newUsername,
            "'" + password
          ]]);
          break;
        }
      }
    }

    return { success: true, message: 'Data Tendik berhasil diperbarui' };
  } catch (error) {
    return { success: false, message: "Gagal: " + error.message };
  }
}

function deleteTendik(token, username) {
  return deleteGuru(token, username);
}

// ============================================================================
// 5. PROCESS PRESENSI & SCANNER QR CODE (SISWA, GURU & TENDIK)
// ============================================================================

function calculateDistanceInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Radius Bumi dalam meter
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function scanAbsensi(nisn, scannerRole, scannerKelas, userLat, userLng, scannerUserId) {
  try {
    const ss = getSpreadsheet();
    const today = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd');
    const nowTime = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'HH:mm');
    const isSelfPresensi = (userLat !== undefined && userLat !== null && userLng !== undefined && userLng !== null);
    const cleanScannerRole = String(scannerRole || '').toLowerCase();
    const cleanScannerId = String(scannerUserId || '').trim().toLowerCase();
    
    const configResult = getAppConfig();
    const config = configResult.success ? configResult.data : {
      jam_masuk_akhir: '07:15',
      jam_pulang_mulai: '15:00',
      jam_pulang_akhir: '17:00',
      lokasi_lat: '5.0505556',
      lokasi_lng: '97.3358611',
      radius_meter: '200'
    };

    // Cek Hari Libur
    const liburSheet = ss.getSheetByName('hari_libur');
    if (liburSheet) {
      const liburData = liburSheet.getDataRange().getValues();
      for (let i = 1; i < liburData.length; i++) {
        if (liburData[i][0]) {
          let tglLibur = Utilities.formatDate(new Date(liburData[i][0]), 'Asia/Jakarta', 'yyyy-MM-dd');
          if (tglLibur === today) {
            return { success: false, message: 'Absensi DITUTUP. Hari ini libur: ' + liburData[i][1] };
          }
        }
      }
    }

    const absensiSheet = ss.getSheetByName('absensi');
    const scannedId = String(nisn).trim();

    if (scannedId === "" || scannedId === "undefined") {
      return { success: false, message: 'QR Code / ID tidak valid.' };
    }

    // -------------------------------------------------------------
    // A. CEK APAKAH INI ABSENSI GURU ATAU TENDIK (Berdasarkan NIP / Username)
    // -------------------------------------------------------------
    const usersSheet = ss.getSheetByName('users');
    const guruSheet = ss.getSheetByName('guru');
    const tendikSheet = ss.getSheetByName('tendik');
    let employeeObj = null;

    if (usersSheet) {
      const usersData = usersSheet.getDataRange().getValues();
      for (let i = 1; i < usersData.length; i++) {
        const uUsername = String(usersData[i][0]).trim().toLowerCase();
        const uNip = usersData[i][4] ? String(usersData[i][4]).trim() : '';

        if (uUsername === scannedId.toLowerCase() || uNip === scannedId) {
          employeeObj = {
            id: uNip || uUsername,
            nama: usersData[i][5] || usersData[i][0],
            role: usersData[i][2] || 'guru',
            jabatan: usersData[i][6] || (usersData[i][3] ? 'Wali Kelas ' + usersData[i][3] : 'Pegawai SMANSA')
          };
          break;
        }
      }
    }

    if (!employeeObj && guruSheet) {
      const gData = guruSheet.getDataRange().getValues();
      for (let i = 1; i < gData.length; i++) {
        const gNip = String(gData[i][0]).trim();
        const gUser = String(gData[i][4] || '').trim().toLowerCase();
        if (gNip === scannedId || gUser === scannedId.toLowerCase()) {
          employeeObj = { id: gNip || gUser, nama: gData[i][1], role: 'guru', jabatan: gData[i][2] || 'Guru SMANSA' };
          break;
        }
      }
    }

    if (!employeeObj && tendikSheet) {
      const tData = tendikSheet.getDataRange().getValues();
      for (let i = 1; i < tData.length; i++) {
        const tNip = String(tData[i][0]).trim();
        const tUser = String(tData[i][4] || '').trim().toLowerCase();
        if (tNip === scannedId || tUser === scannedId.toLowerCase()) {
          employeeObj = { id: tNip || tUser, nama: tData[i][1], role: 'tendik', jabatan: tData[i][2] || 'Staf Kependidikan' };
          break;
        }
      }
    }

    if (employeeObj) {
      // Aturan 1: Tidak bisa scan barcode diri sendiri via scanner kamera
      if (!isSelfPresensi && cleanScannerId && (cleanScannerId === employeeObj.id.toLowerCase() || cleanScannerId === employeeObj.nama.toLowerCase())) {
        return { success: false, message: 'Presensi DITOLAK: Anda tidak dapat memindai barcode diri sendiri. Silakan gunakan tombol "Presensi Mandiri" (GPS).' };
      }

      // Aturan 2: Guru dan Tendik hanya bisa absen mandiri atau di-scan oleh Admin
      if (!isSelfPresensi && cleanScannerRole !== 'admin') {
        return { success: false, message: 'Presensi Guru dan Tendik hanya dapat dilakukan melalui Presensi Mandiri (GPS) atau dipindai oleh Administrator.' };
      }

      // Validasi GPS Radius Wajib untuk Guru & Tendik (Maksimal 200 Meter)
      if (isSelfPresensi) {
        const targetLat = parseFloat(config.lokasi_lat || '5.0505556');
        const targetLng = parseFloat(config.lokasi_lng || '97.3358611');
        const maxRadius = parseFloat(config.radius_meter || '200');
        const dist = calculateDistanceInMeters(parseFloat(userLat), parseFloat(userLng), targetLat, targetLng);

        if (dist > maxRadius) {
          return {
            success: false,
            message: `Presensi DITOLAK. Anda berada di luar radius sekolah (${dist} meter dari lokasi sekolah, batas maksimal ${maxRadius} meter).`
          };
        }
      }

      const absensiData = absensiSheet.getDataRange().getValues();
      for (let i = 1; i < absensiData.length; i++) {
        if (!absensiData[i][0]) continue;
        const rowDateStr = Utilities.formatDate(new Date(absensiData[i][0]), 'Asia/Jakarta', 'yyyy-MM-dd');
        const rowId = String(absensiData[i][1]).trim();

        if (rowDateStr === today && rowId === employeeObj.id) {
          if (absensiData[i][5] && String(absensiData[i][5]).trim() !== '-') { 
            return { success: false, message: `${employeeObj.nama} sudah menyelesaikan absen pulang hari ini.` };
          } else {
            const jamPulang = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'HH:mm:ss');
            let ketBaru = absensiData[i][6] || '';
            if (nowTime < config.jam_pulang_mulai) {
              ketBaru = (ketBaru && ketBaru !== '-' ? ketBaru + " & " : "") + "Pulang Cepat";
            }
            absensiSheet.getRange(i + 1, 6).setValue(jamPulang);
            absensiSheet.getRange(i + 1, 7).setValue(ketBaru || 'Tepat Waktu');

            return {
              success: true,
              message: `Absen Pulang ${employeeObj.role === 'tendik' ? 'Tendik' : 'Guru'} Berhasil`,
              type: 'pulang',
              jamPulang: jamPulang,
              nama: employeeObj.nama,
              kelas: employeeObj.jabatan,
              status: 'Hadir'
            };
          }
        }
      }

      // Absen Datang Pegawai (Guru / Tendik)
      let ketDatang = 'Tepat Waktu';
      if (nowTime > config.jam_masuk_akhir) {
        const lateMinutes = calculateTimeDiff(config.jam_masuk_akhir, nowTime);
        ketDatang = `Terlambat (${lateMinutes} m)`;
      }

      const jamDatang = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'HH:mm:ss');
      absensiSheet.appendRow([
        new Date(),
        "'" + employeeObj.id,
        employeeObj.nama,
        employeeObj.jabatan,
        jamDatang,
        '-',
        ketDatang,
        'Hadir'
      ]);

      return {
        success: true,
        message: `Absen Masuk ${employeeObj.role === 'tendik' ? 'Tendik' : 'Guru'} Berhasil`,
        type: 'datang',
        jamDatang: jamDatang,
        nama: employeeObj.nama,
        kelas: employeeObj.jabatan,
        status: 'Hadir'
      };
    }

    // -------------------------------------------------------------
    // B. CEK APAKAH INI ABSENSI SISWA (Berdasarkan NISN)
    // -------------------------------------------------------------
    const siswaSheet = ss.getSheetByName('siswa');
    const siswaData = siswaSheet.getDataRange().getValues();
    let siswa = null;
    
    for (let i = 1; i < siswaData.length; i++) {
      if (String(siswaData[i][1]).trim() === scannedId) {
        siswa = {
          nama: siswaData[i][0],
          nisn: String(siswaData[i][1]).trim(),
          kelas: siswaData[i][8]
        };
        break;
      }
    }
    
    if (!siswa) {
      return { success: false, message: 'ID / NISN "' + scannedId + '" tidak terdaftar di database Siswa, Guru, maupun Tendik.' };
    }

    // Aturan 1: Siswa tidak bisa scan barcode diri sendiri
    if (!isSelfPresensi && cleanScannerId && (cleanScannerId === siswa.nisn.toLowerCase() || cleanScannerId === siswa.nama.toLowerCase())) {
      return { success: false, message: 'Presensi DITOLAK: Siswa tidak dapat memindai barcode sendiri. Presensi siswa dicatat oleh Guru/Admin melalui scanner kelas.' };
    }

    if (scannerRole === 'guru') {
      const kelasSiswa = String(siswa.kelas).trim().toUpperCase();
      const kelasGuru = String(scannerKelas).trim().toUpperCase();
      if (kelasGuru && kelasSiswa !== kelasGuru) {
        return { 
          success: false, 
          message: `Ditolak! Siswa ini kelas ${siswa.kelas}. Anda hanya bisa scan kelas ${scannerKelas}.` 
        };
      }
    }

    const absensiData = absensiSheet.getDataRange().getValues();
    for (let i = 1; i < absensiData.length; i++) {
      const rowDateCell = absensiData[i][0];
      if (!rowDateCell) continue;

      const rowDateStr = Utilities.formatDate(new Date(rowDateCell), 'Asia/Jakarta', 'yyyy-MM-dd');
      const rowNisn = String(absensiData[i][1]).trim();

      if (rowDateStr === today && rowNisn === scannedId) {
        if (absensiData[i][5] && String(absensiData[i][5]).trim() !== '-') { 
          return { success: false, message: `${siswa.nama} sudah melakukan absen pulang hari ini.` };
        } else {
          let ketSaatIni = absensiData[i][6] || ''; 
          let ketBaru = ketSaatIni;
          let pesanPulang = 'Absen Pulang Berhasil';

          if (nowTime < config.jam_pulang_mulai) {
             ketBaru = (ketSaatIni && ketSaatIni !== '-' ? ketSaatIni + " & " : "") + "Pulang Cepat"; 
             pesanPulang = 'Absen Pulang (Pulang Cepat)';
          }

          const jamPulang = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'HH:mm:ss');
          
          absensiSheet.getRange(i + 1, 6).setValue(jamPulang);
          absensiSheet.getRange(i + 1, 7).setValue(ketBaru || 'Tepat Waktu');
          
          return {
            success: true,
            message: pesanPulang,
            type: 'pulang',
            jamPulang: jamPulang,
            nama: siswa.nama,
            kelas: siswa.kelas,
            status: 'Hadir'
          };
        }
      }
    }

    // Absen Datang Siswa
    let keteranganWaktu = 'Tepat Waktu';
    let statusKehadiran = 'Hadir';

    if (nowTime > config.jam_masuk_akhir) {
      const lateMinutes = calculateTimeDiff(config.jam_masuk_akhir, nowTime);
      keteranganWaktu = `Terlambat (${lateMinutes} m)`;
    }

    const jamDatang = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'HH:mm:ss');
    
    absensiSheet.appendRow([
      new Date(),        
      "'" + scannedId, 
      siswa.nama,        
      siswa.kelas,       
      jamDatang,         
      '-',
      keteranganWaktu,
      statusKehadiran
    ]);

    let responseMessage = 'Absen Masuk Berhasil';
    if (keteranganWaktu.includes('Terlambat')) {
       responseMessage = `Absen Masuk (${keteranganWaktu})`;
    }

    return {
      success: true,
      message: responseMessage,
      type: 'datang',
      jamDatang: jamDatang,
      nama: siswa.nama,
      kelas: siswa.kelas,
      status: statusKehadiran
    };

  } catch (error) {
    return { success: false, message: "Error Server: " + error.toString() };
  }
}

function calculateTimeDiff(startTime, endTime) {
  try {
    const [h1, m1] = startTime.split(':').map(Number);
    const [h2, m2] = endTime.split(':').map(Number);
    return (h2 * 60 + m2) - (h1 * 60 + m1);
  } catch (e) {
    return 0;
  }
}

function getAbsensiToday(nisn) {
  try {
    const ss = getSpreadsheet();
    const todayStr = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd');

    const liburSheet = ss.getSheetByName('hari_libur');
    let isLibur = false;
    let keteranganLibur = "";

    if (liburSheet) {
      const liburData = liburSheet.getDataRange().getValues();
      for (let i = 1; i < liburData.length; i++) {
        if (liburData[i][0]) {
          let tgl = Utilities.formatDate(new Date(liburData[i][0]), 'Asia/Jakarta', 'yyyy-MM-dd');
          if (tgl === todayStr) {
            isLibur = true;
            keteranganLibur = liburData[i][1];
            break;
          }
        }
      }
    }

    const sheet = ss.getSheetByName('absensi');
    if (!sheet) return { success: true, data: null, isLibur: isLibur, keteranganLibur: keteranganLibur };

    const data = sheet.getDataRange().getValues();
    const searchNisn = String(nisn).trim();
    let absensiData = null;
    
    for (let i = 1; i < data.length; i++) {
      const rowDateCell = data[i][0];
      if (!rowDateCell) continue;
      
      const rowDateStr = Utilities.formatDate(new Date(rowDateCell), 'Asia/Jakarta', 'yyyy-MM-dd');
      const rowNisn = String(data[i][1]).trim();

      if (rowDateStr === todayStr && rowNisn === searchNisn) {
        let jamDatang = data[i][4];
        if (jamDatang instanceof Date) {
          jamDatang = Utilities.formatDate(jamDatang, 'Asia/Jakarta', 'HH:mm:ss');
        }
        
        let jamPulang = data[i][5];
        if (jamPulang instanceof Date) {
          jamPulang = Utilities.formatDate(jamPulang, 'Asia/Jakarta', 'HH:mm:ss');
        } else if (!jamPulang) {
          jamPulang = "-";
        }

        absensiData = {
          tanggal: rowDateStr,
          jamDatang: jamDatang,
          jamPulang: jamPulang,
          keterangan: data[i][6] || '-',
          status: data[i][7] || 'Hadir'
        };
        break; 
      }
    }

    return { 
      success: true, 
      data: absensiData,
      isLibur: isLibur,
      keteranganLibur: keteranganLibur
    };

  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

// ============================================================================
// 6. REKAP MONITORING & UPDATE STATUS MANUAL
// ============================================================================

function getMonitoringRealtime(filterKelas) {
  try {
    const ss = getSpreadsheet();
    const todayStr = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd');
    const siswaSheet = ss.getSheetByName('siswa');
    if (!siswaSheet) return { success: true, data: [] };
    
    const dataSiswa = siswaSheet.getDataRange().getValues();
    const absensiSheet = ss.getSheetByName('absensi');
    const dataAbsensi = absensiSheet ? absensiSheet.getDataRange().getValues() : [];
    
    let absensiMap = {};
    for (let i = 1; i < dataAbsensi.length; i++) {
      let rowDate = dataAbsensi[i][0];
      if (!rowDate) continue;

      let tgl = Utilities.formatDate(new Date(rowDate), 'Asia/Jakarta', 'yyyy-MM-dd');
      let nisn = String(dataAbsensi[i][1]).trim();
      
      if (tgl === todayStr) {
        absensiMap[nisn] = {
          jamDatang: dataAbsensi[i][4],
          jamPulang: dataAbsensi[i][5],
          keterangan: dataAbsensi[i][6],
          status: dataAbsensi[i][7]
        };
      }
    }

    let result = [];
    for (let i = 1; i < dataSiswa.length; i++) {
      if (!dataSiswa[i][0]) continue;

      let nama = dataSiswa[i][0];
      let nisn = String(dataSiswa[i][1]).trim();
      let kelas = dataSiswa[i][8];

      if (filterKelas && kelas !== filterKelas) continue;
      
      let statusInfo = absensiMap[nisn];
      let jamDatang = '-';
      let jamPulang = '-';
      let displayStatus = 'Belum Absen'; 
      let keteranganWaktu = '-';         

      if (statusInfo) {
        if (statusInfo.jamDatang instanceof Date) {
            jamDatang = Utilities.formatDate(statusInfo.jamDatang, 'Asia/Jakarta', 'HH:mm');
        } else if (statusInfo.jamDatang) jamDatang = String(statusInfo.jamDatang);

        if (statusInfo.jamPulang instanceof Date) {
            jamPulang = Utilities.formatDate(statusInfo.jamPulang, 'Asia/Jakarta', 'HH:mm');
        } else if (statusInfo.jamPulang) jamPulang = String(statusInfo.jamPulang);

        displayStatus = statusInfo.status ? String(statusInfo.status) : 'Hadir';
        keteranganWaktu = statusInfo.keterangan ? String(statusInfo.keterangan) : (displayStatus === 'Hadir' ? 'Tepat Waktu' : '-');
      }

      result.push({
        nama: nama,
        nisn: nisn,
        kelas: kelas,
        jamDatang: jamDatang,
        jamPulang: jamPulang,
        status: displayStatus,
        keterangan: keteranganWaktu
      });
    }

    result.sort((a, b) => {
      if (a.kelas === b.kelas) return a.nama.localeCompare(b.nama);
      return a.kelas.localeCompare(b.kelas);
    });
    
    return { success: true, data: result };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function updateAbsensiStatus(token, nisn, nama, kelas, newStatus) {
  try {
    verifyUser(token, 'guru');
    
    const ss = getSpreadsheet();
    let absensiSheet = ss.getSheetByName('absensi');
    if (!absensiSheet) {
      absensiSheet = ss.insertSheet('absensi');
      absensiSheet.appendRow(['Tanggal', 'NISN', 'Nama', 'Kelas', 'Jam Datang', 'Jam Pulang', 'Keterangan Waktu', 'Status']);
    }

    const todayStr = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd');
    const data = absensiSheet.getDataRange().getValues();
    const searchNisn = String(nisn).trim();
    
    let found = false;
    let rowIndex = -1;

    for (let i = 1; i < data.length; i++) {
      if (!data[i][0]) continue;
      let tgl = Utilities.formatDate(new Date(data[i][0]), 'Asia/Jakarta', 'yyyy-MM-dd');
      let rowNisn = String(data[i][1]).trim();
      
      if (tgl === todayStr && rowNisn === searchNisn) {
        found = true;
        rowIndex = i + 1;
        break;
      }
    }

    if (found) {
      absensiSheet.getRange(rowIndex, 8).setValue(newStatus); 
    } else {
      let jamDatang = '-';
      if (newStatus === 'Hadir') {
        jamDatang = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'HH:mm:ss');
      }
      
      absensiSheet.appendRow([
        new Date(), 
        "'" + searchNisn, 
        nama, 
        kelas, 
        jamDatang, 
        '-',   
        '-',  
        newStatus 
      ]);
    }

    return { success: true, message: 'Status berhasil diubah' };
  } catch (error) {
    return { success: false, message: "Gagal: " + error.message };
  }
}

function getAbsensiList(filter = {}) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('absensi');
    if (!sheet) return { success: true, data: [] };

    const data = sheet.getDataRange().getValues();
    const absensiList = [];
    
    const fStart = filter.tanggalMulai || "";
    const fEnd = filter.tanggalAkhir || "";
    const fKelas = filter.kelas || "";

    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) {
        let rawDate = new Date(data[i][0]);
        let tanggalStr = Utilities.formatDate(rawDate, 'Asia/Jakarta', 'yyyy-MM-dd');

        let jamDatangStr = data[i][4];
        if (data[i][4] instanceof Date) {
             jamDatangStr = Utilities.formatDate(data[i][4], 'Asia/Jakarta', 'HH:mm:ss');
        }

        let jamPulangStr = data[i][5];
        if (data[i][5] && data[i][5] instanceof Date) {
             jamPulangStr = Utilities.formatDate(data[i][5], 'Asia/Jakarta', 'HH:mm:ss');
        } else if (!jamPulangStr) {
             jamPulangStr = "-";
        }
        
        const item = {
          tanggal: tanggalStr, 
          nisn: String(data[i][1]).replace(/^'/, ''),
          nama: data[i][2],
          kelas: data[i][3],
          jamDatang: jamDatangStr,
          jamPulang: jamPulangStr,
          keterangan: data[i][6] || '-',
          status: data[i][7] || 'Hadir'
        };

        let match = true;
        if (fStart && tanggalStr < fStart) match = false;
        if (fEnd && tanggalStr > fEnd) match = false;
        if (filter.nama && !String(item.nama).toLowerCase().includes(filter.nama.toLowerCase())) match = false;
        if (fKelas && item.kelas != fKelas) match = false;
        if (filter.kategori) {
          if (filter.kategori === 'Siswa') {
            if (item.tipeUser && item.tipeUser !== 'Siswa') match = false;
          } else if (filter.kategori === 'Guru') {
            if (item.tipeUser !== 'Guru' && !String(item.kelas).includes('Guru') && !String(item.kelas).includes('Wali')) match = false;
          } else if (filter.kategori === 'Tendik') {
            if (item.tipeUser !== 'Tendik' && !String(item.kelas).includes('Tendik') && !String(item.kelas).includes('Staf')) match = false;
          }
        }

        if (match) {
          absensiList.push(item);
        }
      }
    }
    
    absensiList.sort((a, b) => b.tanggal.localeCompare(a.tanggal));
    return { success: true, data: absensiList };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function getKelasList() {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('siswa');
    if (!sheet) return { success: true, data: ['X MIPA 1', 'X MIPA 2', 'XI IPS 1'] };

    const data = sheet.getDataRange().getValues();
    const kelasSet = new Set();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][8]) {
        kelasSet.add(String(data[i][8]).trim());
      }
    }
    
    return { success: true, data: Array.from(kelasSet).sort() };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

// ============================================================================
// 7. MANAJEMEN HARI LIBUR & KONFIGURASI WAKTU
// ============================================================================

function getHariLibur() {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('hari_libur');
    if (!sheet) return { success: true, data: [] };

    const data = sheet.getDataRange().getValues();
    const list = [];
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) {
        let tgl = Utilities.formatDate(new Date(data[i][0]), 'Asia/Jakarta', 'yyyy-MM-dd');
        list.push({
          tanggal: tgl,
          keterangan: data[i][1]
        });
      }
    }
    list.sort((a, b) => b.tanggal.localeCompare(a.tanggal));
    return { success: true, data: list };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function addHariLibur(tanggal, keterangan) {
  try {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName('hari_libur');
    if (!sheet) {
      sheet = ss.insertSheet('hari_libur');
      sheet.appendRow(['Tanggal', 'Keterangan']);
    }
    
    sheet.appendRow([tanggal, keterangan]);
    return { success: true, message: 'Hari libur berhasil ditambahkan' };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function updateHariLibur(oldDateStr, newDateStr, newKeterangan) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('hari_libur');
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      let rowDate = Utilities.formatDate(new Date(data[i][0]), 'Asia/Jakarta', 'yyyy-MM-dd');
      if (rowDate === oldDateStr) {
        sheet.getRange(i + 1, 1, 1, 2).setValues([[new Date(newDateStr), newKeterangan]]);
        return { success: true, message: 'Hari libur berhasil diperbarui' };
      }
    }
    return { success: false, message: 'Data tanggal tidak ditemukan' };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function deleteHariLibur(tanggalStr) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('hari_libur');
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      let rowDate = Utilities.formatDate(new Date(data[i][0]), 'Asia/Jakarta', 'yyyy-MM-dd');
      if (rowDate === tanggalStr) {
        sheet.deleteRow(i + 1);
        return { success: true, message: 'Hari libur dihapus' };
      }
    }
    return { success: false, message: 'Data tidak ditemukan' };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function getAppConfig() {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('konfigurasi');
    let config = {
      jam_masuk_mulai: '06:30',
      jam_masuk_akhir: '07:15',
      jam_pulang_mulai: '15:00',
      jam_pulang_akhir: '17:00',
      lokasi_lat: '5.0505556',
      lokasi_lng: '97.3358611',
      radius_meter: '200'
    };
    
    if (sheet) {
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        const key = data[i][0];
        const val = data[i][1];
        if (config.hasOwnProperty(key)) {
          if (val instanceof Date) {
            config[key] = Utilities.formatDate(val, 'Asia/Jakarta', 'HH:mm');
          } else {
            config[key] = String(val);
          }
        }
      }
    }
    return { success: true, data: config };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

function saveAppConfig(newConfig) {
  try {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName('konfigurasi');
    if (!sheet) {
      sheet = ss.insertSheet('konfigurasi');
      sheet.appendRow(['Key', 'Value', 'Keterangan']);
      sheet.appendRow(['jam_masuk_mulai', '06:30', 'Jam Masuk Mulai']);
      sheet.appendRow(['jam_masuk_akhir', '07:15', 'Jam Masuk Akhir (Terlambat)']);
      sheet.appendRow(['jam_pulang_mulai', '15:00', 'Jam Pulang Mulai']);
      sheet.appendRow(['jam_pulang_akhir', '17:00', 'Jam Pulang Akhir']);
      sheet.appendRow(['lokasi_lat', '5.0505556', 'Latitude Sekolah']);
      sheet.appendRow(['lokasi_lng', '97.3358611', 'Longitude Sekolah']);
      sheet.appendRow(['radius_meter', '200', 'Radius Maksimal GPS (Meter)']);
    }
    
    const data = sheet.getDataRange().getValues();
    const updateRow = (key, val) => {
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === key) {
          sheet.getRange(i + 1, 2).setValue("'" + val); 
          return;
        }
      }
      sheet.appendRow([key, "'" + val, 'Setting ' + key]);
    };

    if (newConfig.jam_masuk_mulai) updateRow('jam_masuk_mulai', newConfig.jam_masuk_mulai);
    if (newConfig.jam_masuk_akhir) updateRow('jam_masuk_akhir', newConfig.jam_masuk_akhir);
    if (newConfig.jam_pulang_mulai) updateRow('jam_pulang_mulai', newConfig.jam_pulang_mulai);
    if (newConfig.jam_pulang_akhir) updateRow('jam_pulang_akhir', newConfig.jam_pulang_akhir);
    if (newConfig.lokasi_lat) updateRow('lokasi_lat', newConfig.lokasi_lat);
    if (newConfig.lokasi_lng) updateRow('lokasi_lng', newConfig.lokasi_lng);
    if (newConfig.radius_meter) updateRow('radius_meter', newConfig.radius_meter);

    return { success: true, message: 'Konfigurasi waktu & GPS berhasil disimpan' };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

// ============================================================================
// 8. GENERATE EXCEL & DOWNLOAD
// ============================================================================

function generateExcel(type, filters) {
  try {
    var timestamp = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'dd-MM-yyyy_HHmm');
    var fileName = (type === 'laporan_absensi') ? "Laporan_Absensi_SMANSA_" + timestamp : "Monitoring_Harian_SMANSA_" + timestamp;
    var headers = (type === 'laporan_absensi') 
      ? ["No", "Tanggal", "ID/NISN/NIP", "Nama Lengkap", "Kelas / Jabatan", "Jam Datang", "Jam Pulang", "Keterangan Waktu", "Status Kehadiran"]
      : ["No", "Nama Lengkap", "ID/NISN/NIP", "Kelas / Jabatan", "Jam Datang", "Jam Pulang", "Keterangan Waktu", "Status Terkini"];

    var ss = SpreadsheetApp.create(fileName);
    var sheet = ss.getActiveSheet();
    var data = getExportData(type, filters);

    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);
    headerRange.setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#4F46E5').setHorizontalAlignment('center').setVerticalAlignment('middle');
    sheet.setRowHeight(1, 40); 
    
    if (data && data.length > 0) {
      var numRows = data.length;
      var numCols = headers.length;
      var dataRange = sheet.getRange(2, 1, numRows, numCols);
      dataRange.setValues(data);
      dataRange.setVerticalAlignment('middle').setHorizontalAlignment('center');
      sheet.setRowHeights(2, numRows, 28);
      
      var namaColIndex = headers.findIndex(h => h.includes("Nama"));
      if (namaColIndex > -1) {
          sheet.getRange(2, namaColIndex + 1, numRows, 1).setHorizontalAlignment('left');
      }

      dataRange.setBorder(true, true, true, true, true, true, '#E2E8F0', SpreadsheetApp.BorderStyle.SOLID);
    }
    
    sheet.autoResizeColumns(1, headers.length);
    sheet.setFrozenRows(1);

    var fileId = ss.getId();
    var file = DriveApp.getFileById(fileId);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    var downloadUrl = "https://docs.google.com/spreadsheets/d/" + fileId + "/export?format=xlsx";
    return { success: true, url: downloadUrl };
  } catch (e) {
    return { success: false, message: 'Gagal generate Excel: ' + e.toString() };
  }
}

function getExportData(type, filters) {
  if (type === 'laporan_absensi') {
    const res = getAbsensiList(filters);
    if (!res.success) return [];
    return res.data.map((d, i) => [
      i + 1,
      d.tanggal,
      "'" + d.nisn,
      d.nama,
      d.kelas,
      d.jamDatang,
      d.jamPulang,
      d.keterangan,
      d.status
    ]);
  } else {
    const res = getMonitoringRealtime(filters ? filters.kelas : null);
    if (!res.success) return [];
    return res.data.map((d, i) => [
      i + 1,
      d.nama,
      "'" + d.nisn,
      d.kelas,
      d.jamDatang,
      d.jamPulang,
      d.keterangan,
      d.status
    ]);
  }
}

// ============================================================================
// 9. BULK IMPORT SISWA, GURU & TENDIK (DARI EXCEL)
// ============================================================================

function importSiswaBulk(dataArray) {
  try {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName('siswa');
    if (!sheet) {
      sheet = ss.insertSheet('siswa');
      sheet.appendRow(['Nama Lengkap', 'NISN', 'Jenis Kelamin', 'Tanggal Lahir', 'Agama', 'Nama Ayah', 'Nama Ibu', 'No Handphone', 'Kelas', 'Alamat']);
    }

    const existingData = sheet.getDataRange().getValues();
    const existingNISN = new Set();
    for (let i = 1; i < existingData.length; i++) {
      existingNISN.add(String(existingData[i][1]).trim());
    }

    const rowsToAdd = [];
    let addedCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < dataArray.length; i++) {
      const item = dataArray[i];
      const nisn = String(item.nisn).trim();

      if (!item.nama || !nisn || existingNISN.has(nisn)) {
        skippedCount++;
        continue;
      }

      rowsToAdd.push([
        item.nama,
        "'" + nisn,
        item.jenisKelamin || 'Laki-laki',
        item.tanggalLahir || '2008-01-01',
        item.agama || 'Islam',
        item.namaAyah || '-',
        item.namaIbu || '-',
        "'" + (item.noHp || '-'),
        item.kelas || 'X MIPA 1',
        item.alamat || 'Lhoksukon'
      ]);
      
      existingNISN.add(nisn);
      addedCount++;
    }

    if (rowsToAdd.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAdd.length, rowsToAdd[0].length).setValues(rowsToAdd);
    }

    return { 
      success: true, 
      added: addedCount, 
      skipped: skippedCount, 
      message: `Import selesai. Berhasil: ${addedCount}, Duplikat/Gagal: ${skippedCount}` 
    };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function importGuruBulk(dataArray) {
  try {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName('users');
    if (!sheet) {
      sheet = ss.insertSheet('users');
      sheet.appendRow(['Username', 'Password', 'Role', 'Kelas', 'NIP', 'Nama Lengkap', 'Jabatan', 'No Handphone']);
    }

    const existingData = sheet.getDataRange().getValues();
    const existingUsernames = new Set();
    for (let i = 1; i < existingData.length; i++) {
      existingUsernames.add(String(existingData[i][0]).trim().toLowerCase());
    }

    const rowsToAdd = [];
    let addedCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < dataArray.length; i++) {
      const item = dataArray[i];
      const username = String(item.username).trim();

      if (!username || !item.password || existingUsernames.has(username.toLowerCase())) {
        skippedCount++;
        continue;
      }

      rowsToAdd.push([
        "'" + username,
        "'" + item.password,
        item.role || 'guru',
        item.kelas || '',
        "'" + (item.nip || '-'),
        item.nama || username,
        item.jabatan || (item.kelas ? 'Wali Kelas ' + item.kelas : 'Pegawai SMANSA'),
        "'" + (item.noHp || '-')
      ]);

      existingUsernames.add(username.toLowerCase());
      addedCount++;
    }

    if (rowsToAdd.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAdd.length, rowsToAdd[0].length).setValues(rowsToAdd);
    }

    return { 
      success: true, 
      added: addedCount, 
      skipped: skippedCount, 
      message: `Import selesai. Berhasil: ${addedCount}, Duplikat/Gagal: ${skippedCount}` 
    };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

// ============================================================================
// 10. SETUP OTOMATIS DATABASE INITIAL (SHEETS & COLUMNS)
// ============================================================================

function setupInitialData() {
  try {
    const ss = getSpreadsheet();

    // 1. Sheet users (Admin, Guru & Tendik)
    let usersSheet = ss.getSheetByName('users');
    if (!usersSheet) {
      usersSheet = ss.insertSheet('users');
    }
    
    const usersHeaders = ['Username', 'Password', 'Role', 'Kelas', 'NIP', 'Nama Lengkap', 'Jabatan', 'No Handphone'];
    if (usersSheet.getLastRow() === 0) {
      usersSheet.appendRow(usersHeaders);
    } else {
      usersSheet.getRange(1, 1, 1, usersHeaders.length).setValues([usersHeaders]);
    }

    const existingUsers = usersSheet.getDataRange().getValues();
    const existingUsernames = new Set();
    for (let i = 1; i < existingUsers.length; i++) {
      existingUsernames.add(String(existingUsers[i][0]).trim().toLowerCase());
    }

    const initialUsers = [
      ['admin', 'admin123', 'admin', '', "'198001012005011001", 'Administrator', 'Kepala Tata Usaha', "'081234567800"],
      ['mukhlis', 'admin123', 'admin', '', "'198904152026211006", 'MUHAMMAD MUKHLIS', 'Administrator', "'081234567808"]
    ];

    initialUsers.forEach(u => {
      if (!existingUsernames.has(u[0].toLowerCase())) {
        usersSheet.appendRow(u);
      }
    });

    // 2. Sheet guru (Tab khusus Guru di Google Sheets)
    let guruSheet = ss.getSheetByName('guru');
    if (!guruSheet) {
      guruSheet = ss.insertSheet('guru');
      guruSheet.appendRow(['NIP', 'Nama Lengkap & Gelar', 'Jabatan / Wali Kelas', 'No Handphone', 'Username', 'Password']);
    }

    // 3. Sheet tendik (Tab khusus Tendik/Staf di Google Sheets)
    let tendikSheet = ss.getSheetByName('tendik');
    if (!tendikSheet) {
      tendikSheet = ss.insertSheet('tendik');
      tendikSheet.appendRow(['NIP / NIK', 'Nama Lengkap & Gelar', 'Jabatan / Bagian', 'No Handphone', 'Username', 'Password']);
    }

    // 4. Sheet siswa
    let siswaSheet = ss.getSheetByName('siswa');
    if (!siswaSheet) {
      siswaSheet = ss.insertSheet('siswa');
      siswaSheet.appendRow(['Nama Lengkap', 'NISN', 'Jenis Kelamin', 'Tanggal Lahir', 'Agama', 'Nama Ayah', 'Nama Ibu', 'No Handphone', 'Kelas', 'Alamat']);
    }

    // 5. Sheet absensi
    let absensiSheet = ss.getSheetByName('absensi');
    if (!absensiSheet) {
      absensiSheet = ss.insertSheet('absensi');
      absensiSheet.appendRow(['Tanggal', 'ID/NISN/NIP', 'Nama Lengkap', 'Kelas / Jabatan', 'Jam Datang', 'Jam Pulang', 'Keterangan Waktu', 'Status']);
    }

    // 6. Sheet hari_libur
    let liburSheet = ss.getSheetByName('hari_libur');
    if (!liburSheet) {
      liburSheet = ss.insertSheet('hari_libur');
      liburSheet.appendRow(['Tanggal', 'Keterangan']);
      liburSheet.appendRow(['2026-08-17', 'HUT Kemerdekaan RI']);
      liburSheet.appendRow(['2026-12-25', 'Hari Raya Natal']);
    }

    // 7. Sheet konfigurasi
    let configSheet = ss.getSheetByName('konfigurasi');
    if (!configSheet) {
      configSheet = ss.insertSheet('konfigurasi');
      configSheet.appendRow(['Key', 'Value', 'Keterangan']);
      configSheet.appendRow(['jam_masuk_mulai', '06:30', 'Waktu absen datang dibuka']);
      configSheet.appendRow(['jam_masuk_akhir', '07:15', 'Batas waktu terlambat']);
      configSheet.appendRow(['jam_pulang_mulai', '15:00', 'Waktu absen pulang dibuka']);
      configSheet.appendRow(['jam_pulang_akhir', '17:00', 'Batas akhir absen pulang']);
      configSheet.appendRow(['lokasi_lat', '5.0505556', 'Latitude Titik Pusat Sekolah']);
      configSheet.appendRow(['lokasi_lng', '97.3358611', 'Longitude Titik Pusat Sekolah']);
      configSheet.appendRow(['radius_meter', '200', 'Radius Maksimal GPS (Meter)']);
    }

    return { success: true, message: 'Setup database SMANSA Lhoksukon (Siswa, Guru, Tendik, Users) berhasil!' };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function changePassword(token, username, oldPassword, newPassword) {
  return changeCredentials(token, username, username, oldPassword, newPassword);
}

function changeCredentials(token, oldUsername, newUsername, oldPassword, newPassword, newNama) {
  try {
    const ss = getSpreadsheet();
    const cleanOld = String(oldUsername).trim().toLowerCase();
    const cleanNew = String(newUsername || '').trim();
    const cleanNama = String(newNama || '').trim();
    
    // 1. Update Sheet Users
    const usersSheet = ss.getSheetByName('users');
    if (usersSheet) {
      const data = usersSheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        const uName = String(data[i][0]).trim().toLowerCase();
        const uNip = data[i][4] ? String(data[i][4]).trim().toLowerCase() : '';
        if (uName === cleanOld || uNip === cleanOld) {
          if (cleanNew) usersSheet.getRange(i + 1, 1).setValue("'" + cleanNew);
          if (newPassword) usersSheet.getRange(i + 1, 2).setValue("'" + newPassword);
          if (cleanNama) usersSheet.getRange(i + 1, 6).setValue(cleanNama);
          break;
        }
      }
    }

    // 2. Update Sheet Guru
    const guruSheet = ss.getSheetByName('guru');
    if (guruSheet) {
      const data = guruSheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        const gNip = String(data[i][0]).trim().toLowerCase();
        const gUser = String(data[i][4] || '').trim().toLowerCase();
        if (gNip === cleanOld || gUser === cleanOld) {
          if (cleanNama) guruSheet.getRange(i + 1, 2).setValue(cleanNama);
          if (cleanNew) guruSheet.getRange(i + 1, 5).setValue("'" + cleanNew);
          if (newPassword) guruSheet.getRange(i + 1, 6).setValue("'" + newPassword);
          break;
        }
      }
    }

    // 3. Update Sheet Tendik
    const tendikSheet = ss.getSheetByName('tendik');
    if (tendikSheet) {
      const data = tendikSheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        const tNip = String(data[i][0]).trim().toLowerCase();
        const tUser = String(data[i][4] || '').trim().toLowerCase();
        if (tNip === cleanOld || tUser === cleanOld) {
          if (cleanNama) tendikSheet.getRange(i + 1, 2).setValue(cleanNama);
          if (cleanNew) tendikSheet.getRange(i + 1, 5).setValue("'" + cleanNew);
          if (newPassword) tendikSheet.getRange(i + 1, 6).setValue("'" + newPassword);
          break;
        }
      }
    }

    // 4. Update Sheet Siswa
    const siswaSheet = ss.getSheetByName('siswa');
    if (siswaSheet) {
      const data = siswaSheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        const sNisn = String(data[i][1]).replace(/^'/, '').trim().toLowerCase();
        if (sNisn === cleanOld) {
          if (cleanNama) siswaSheet.getRange(i + 1, 1).setValue(cleanNama);
          break;
        }
      }
    }

    return { success: true, message: 'Nama Lengkap, Username & Password berhasil diperbarui di Google Sheet!' };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

function updateUserProfilePhoto(token, userId, fotoBase64) {
  try {
    const ss = getSpreadsheet();
    const cleanId = String(userId || '').trim().toLowerCase();

    // 1. Siswa
    const siswaSheet = ss.getSheetByName('siswa');
    if (siswaSheet) {
      const data = siswaSheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        const sNisn = String(data[i][1]).replace(/^'/, '').trim().toLowerCase();
        const sNama = String(data[i][0]).trim().toLowerCase();
        if (sNisn === cleanId || sNama === cleanId) {
          siswaSheet.getRange(i + 1, 11).setValue(fotoBase64);
          return { success: true, message: 'Foto profil siswa berhasil diperbarui!' };
        }
      }
    }

    // 2. Guru
    const guruSheet = ss.getSheetByName('guru');
    if (guruSheet) {
      const data = guruSheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        const gNip = String(data[i][0]).replace(/^'/, '').trim().toLowerCase();
        const gUser = String(data[i][4] || '').trim().toLowerCase();
        if (gNip === cleanId || gUser === cleanId) {
          guruSheet.getRange(i + 1, 7).setValue(fotoBase64);
          return { success: true, message: 'Foto profil guru berhasil diperbarui!' };
        }
      }
    }

    // 3. Tendik
    const tendikSheet = ss.getSheetByName('tendik');
    if (tendikSheet) {
      const data = tendikSheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        const tNip = String(data[i][0]).replace(/^'/, '').trim().toLowerCase();
        const tUser = String(data[i][4] || '').trim().toLowerCase();
        if (tNip === cleanId || tUser === cleanId) {
          tendikSheet.getRange(i + 1, 7).setValue(fotoBase64);
          return { success: true, message: 'Foto profil tendik berhasil diperbarui!' };
        }
      }
    }

    return { success: true, message: 'Foto profil berhasil disimpan!' };
  } catch (e) {
    return { success: false, message: 'Gagal update foto: ' + e.toString() };
  }
}

function getLoginLogs() {
  try {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName('login_logs');
    if (!sheet) return { success: true, data: [] };
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return { success: true, data: [] };

    const list = [];
    for (let i = 1; i < data.length; i++) {
      let dev = { os: 'Perangkat', browser: 'Browser', type: 'Desktop', icon: 'fa-laptop' };
      try {
        if (data[i][4]) dev = JSON.parse(data[i][4]);
      } catch(e) {}

      list.push({
        id: data[i][0],
        userId: data[i][1],
        nama: data[i][2],
        role: data[i][3],
        device: dev,
        tanggal: Utilities.formatDate(new Date(data[i][5]), 'Asia/Jakarta', 'yyyy-MM-dd'),
        jam: data[i][6],
        status: data[i][7] || 'Aktif'
      });
    }
    return { success: true, data: list.reverse() };
  } catch(e) {
    return { success: true, data: [] };
  }
}

function recordLogoutLog(sessionId) {
  try {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName('login_logs');
    if (!sheet) return { success: true };
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(sessionId)) {
        sheet.getRange(i + 1, 8).setValue('Logout');
        break;
      }
    }
    return { success: true };
  } catch(e) {
    return { success: true };
  }
}

function terminateUserSession(sessionId) {
  return recordLogoutLog(sessionId);
}

function clearLoginLogs() {
  try {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName('login_logs');
    if (sheet) {
      sheet.clearContents();
      sheet.appendRow(['Session ID', 'User ID', 'Nama', 'Role', 'Device JSON', 'Tanggal', 'Jam', 'Status']);
    }
    return { success: true, message: 'Riwayat login berhasil dibersihkan.' };
  } catch(e) {
    return { success: false, message: e.toString() };
  }
}
