# Benefits & Expenses - Referensi API untuk IT

Revisi 19 Nov 2026: Expense memiliki pilihan PT yang menanggung biaya, tanpa mengubah perusahaan asal karyawan atau Medical Benefits.

API backend SUDAH TERMASUK pada aplikasi Next.js yang sama. Tidak ada aplikasi API terpisah atau API key tambahan. Source: app/api/[...path]/route.js dan lib/*.js. Dokumen ini menjelaskan implementasi saat serah terima; bukan integrasi SSO atau API publik baru.

## Alamat, sesi dan keamanan

- Base URL: https://HOSTNAME-PERUSAHAAN/api. Domain contoh pada OpenAPI wajib diganti IT.
- Login memakai POST /login dan cookie HttpOnly `abt_session` (12 jam, SameSite=Strict, Secure pada versi server). Mode Uji memakai `abt_test_session` dan hostname terpisah.
- API bisnis memerlukan cookie sesi. Tidak menggunakan Bearer token/API key. Akses HR/karyawan dibatasi server; jangan memindahkan kontrol akses ke frontend saja.
- POST dengan header Origin berbeda dari host ditolak 403. Browser gunakan same-origin; proxy mempertahankan header Host.
- JSON memakai Content-Type: application/json. Upload memakai multipart/form-data; biarkan browser/curl mengisi boundary.
- Tanggal request tetap YYYY-MM-DD; timestamp audit ISO 8601. Format tampilan 19 Nov 2026, 11:58 WIB dibuat frontend/export. Nominal JSON berupa angka rupiah, bukan string berformat Rp.
- Gunakan HTTPS dan cookie sesi di client internal. Jangan aktifkan CORS bebas atau menaruh credential pada URL/log. Simpan database di volume persisten, bukan folder public.
- Contoh dan OpenAPI tidak berisi akun, password, token atau data karyawan asli.

## Endpoint

Semua path berikut relatif terhadap /api.

### 1. GET /test-mode/info

**Informasi lingkungan** | Akses: Publik

Tanpa body; appId, testMode, testModeEnabled, mainPublicUrl.

### 2. POST /login

**Login** | Akses: Publik

JSON: username, password. Mengirim Set-Cookie; gunakan akun uji pada pengujian.

### 3. POST /change-password

**Ubah password** | Akses: Kredensial saat ini

JSON: username, currentPassword, newPassword, confirmPassword. Password baru tepat 8 angka; seluruh sesi akun berakhir.

### 4. POST /logout

**Logout** | Akses: Cookie opsional

Tanpa body; menghapus sesi jika ada dan mengakhiri cookie.

### 5. GET /state

**Data halaman dan saldo** | Akses: HR/Karyawan

Query: year (2000 sampai tahun berjalan), actingEmployee (HR saja). Data karyawan dibatasi miliknya; HR memperoleh master dan kriteria.

### 6. GET /claim-eligibility

**Cek hak saat pengeluaran** | Akses: HR/Karyawan

Query wajib: date (YYYY-MM-DD), category (outpatient/optics). actingEmployee untuk HR. Hasil: balance, message, nextDate.

### 7. POST /claims

**Ajukan/kirim ulang klaim** | Akses: HR/Karyawan

multipart/form-data: category, date, provider, expenseCompanyId (wajib khusus Expense, ID dari expenseCompanies pada /state), items (JSON string array desc/amount). Opsional: purpose, expenseType, actingEmployee (wajib untuk HR), editId (klaim returned), files (berulang), approvalFiles (expense), priorApproval, duplicateReason, duplicateConfirmed.

### 8. POST /claims/{id}/action

**Periksa/ubah status klaim** | Akses: HR

multipart/form-data: action (approve/return/reject/cancel/paid), note, approved, policyChecked, paidDate, bankRef, proof. Klaim HR sendiri: managerApprover, managerApprovalConfirmed, managerApprovalFiles.

### 9. POST /claims/{id}/archive

**Arsip/kembalikan arsip** | Akses: HR

JSON: archived (boolean). Hanya status yang diizinkan modul arsip; bukan penghapusan permanen.

### 10. POST /claims/{id}/payment-request/prepare

**Persiapkan nomor Payment Request** | Akses: HR

Tanpa body. Reservasi nomor di server; jangan membuat nomor pada client.

### 11. POST /claims/{id}/payment-request

**Simpan Payment Request** | Akses: HR

JSON field SOP; requestNo dan transferAmount ditetapkan server. Rekening mengikuti aturan profil/snapshot.

### 12. POST /claims/{id}/payment-request/revision

**Revisi setelah dikirim** | Akses: HR

JSON: action=start; lalu action=save dengan token dan fields; atau action=cancel dengan token. Mengikuti token draft yang dikembalikan server.

### 13. POST /claims/{id}/payment-request/update-account

**Perbarui rekening setelah dikirim** | Akses: HR

Tanpa body. Hanya klaim approved yang sudah dikirim; menandai perlu kirim ulang.

### 14. POST /claims/{id}/finance-dispatch

**Catat pengiriman Finance** | Akses: HR

JSON: sentDate (YYYY-MM-DD). Bukan tanggal/waktu penandaan; server merekam petugas dan waktu otomatis.

### 15. GET /claims/{id}/report

**Unduh PDF Payment Request** | Akses: HR

Menghasilkan application/pdf. Tidak otomatis menandai dikirim. Data rekening approved/unsent dapat disinkronkan sesuai aturan yang sudah ada.

### 16. GET /documents/{id}

**Unduh/pratinjau lampiran** | Akses: HR/Pemilik klaim

Query: preview=1 untuk inline PDF/PNG/JPEG. Memerlukan cookie pemilik klaim atau HR; tidak ada URL publik lampiran.

### 17. GET /history

**Unduh riwayat individu** | Akses: HR/Pemilik

Query: employee, year, category, format (pdf/excel), view, status, q, archived=1. Setiap format selain pdf melewati generator XLSX; gunakan xlsx secara konsisten.

### 18. GET /monitoring

**Unduh Excel monitoring** | Akses: HR

Query: year, category, employee (all/ID), status, q, view (all/pending/history/balances), archived=1. Seluruh data sesuai filter, bukan hanya halaman tabel.

### 19. POST /employees

**Tambah karyawan** | Akses: HR

JSON profil karyawan. Hasil dapat berisi password awal akun baru; jangan mencatat respons tersebut dalam log.

### 20. POST /employees/{id}

**Edit profil karyawan** | Akses: HR

JSON profil lengkap termasuk id dan version=profileVersion terbaru. Perubahan level memakai tanggal efektif dari form aplikasi.

### 21. POST /employees/{id}/change-id

**Ganti Employee ID orang yang sama** | Akses: HR

JSON: newId, reason, version (profileVersion), confirmed=true. Gunakan endpoint khusus ini; bukan mengedit id pada endpoint profil.

### 22. GET /employees/{id}/id-history

**Riwayat perubahan Employee ID** | Akses: HR

Tanpa body.

### 23. POST /employees/{id}/reset-password

**Reset password karyawan** | Akses: HR

Tanpa body; hasil memuat password baru sekali untuk distribusi aman. Akun HR menggunakan Ubah password.

### 24. POST /employees/{id}/optics-review

**Konfirmasi riwayat kacamata** | Akses: HR

JSON: version, mode (none/existing/last). Jika last: date, amount, provider. Hanya profil yang menunggu pemeriksaan.

### 25. POST /masters

**Tambah master** | Akses: HR

JSON: type, name, active. companies: code; positions: parent=ID departemen; levels: benefit_group=staff/supervisor.

### 26. POST /masters/{id}

**Edit master** | Akses: HR

JSON yang sama ditambah version terbaru. Ambil masterItems melalui /state; jangan menebak ID master.

### 27. POST /quota-criteria

**Buat draft kriteria plafon** | Akses: HR

JSON: title, effective_date, data. Tanggal efektif harus sesudah hari ini. Struktur lengkap data mengikuti quotaCriteria melalui /state.

### 28. POST /quota-criteria/{id}

**Edit draft kriteria** | Akses: HR

JSON yang sama ditambah version. Baseline/versi yang sudah berlaku tidak diedit langsung.

### 29. POST /quota-criteria/{id}/action

**Jadwalkan/batalkan kriteria** | Akses: HR

JSON: action (publish/cancel), version. Ikuti validasi tanggal dan versi server.

### 30. POST /test-mode/start

**Buka Mode Uji** | Akses: HR utama

Tanpa body. Menghasilkan url berisi ticket satu kali; jangan mencatat ticket pada log.

### 31. POST /test-mode/enter

**Masuk Mode Uji** | Akses: Ticket satu kali

JSON: ticket. Berlaku pada server uji dan menghasilkan cookie abt_test_session.

### 32. POST /test-mode/reset

**Reset data fiktif** | Akses: HR uji

JSON: confirmation="RESET DATA UJI". Ditolak pada database utama; jangan dipakai untuk mereset data operasional.

## Field SOP Payment Request

company, projectName, projectCode, classification, payroll (Payroll / Non Payroll), requestNo, accountName, accountNo, bankName, transferAmount, invoiceNo, remarks.

invoiceNo opsional. Nomor Payment Request dan transferAmount ditetapkan server. Company pada Expense baru mengikuti snapshot PT yang dipilih; pada Medical Benefits dan data lama tetap mengikuti ketentuan sebelumnya; rekening mengikuti aturan sinkronisasi profil/revisi. Jangan mengubah nomor/nominal yang sudah tersimpan dari client.

## Pengajuan dan perubahan status

- category: outpatient / optics / expense.
- items adalah STRING JSON pada multipart, misalnya [{"desc":"Pemeriksaan uji","amount":75000}]. Maksimal 50 rincian; nominal rupiah bulat positif.
- Maksimal 10 dokumen per kelompok, masing-masing 10 MB. Signature file harus PDF, JPG atau PNG. Pengeluaran maksimal 30 hari dan tidak boleh masa depan.
- Expense wajib purpose, priorApproval serta approvalFiles. Pengajuan ulang returned memakai editId yang sama, sehingga riwayat dan nomor tetap utuh.
- Duplikat mengembalikan 409 dengan code=DUPLICATE_CLAIM dan duplicates. Jika tetap diajukan, sertakan duplicateConfirmed=true dan duplicateReason.
- approve: approved (angka), policyChecked=true; jika nominal berbeda dari diajukan wajib note. Klaim HR sendiri memerlukan bukti dan nama atasan lain.
- return/reject/cancel wajib note. cancel hanya sebelum dibayar; alokasi saldo yang berlaku dikembalikan tanpa menghapus riwayat/nomor.
- paid: wajib sudah dikirim ke Finance, Payment Request lengkap, tidak ada revisi yang belum disimpan/dikirim ulang. Sertakan paidDate dan proof. Upload PDF bukan tindakan pembayaran.
- Pengiriman email Finance dan transfer bank dilakukan di luar aplikasi. Endpoint finance-dispatch/paid hanya mencatat kejadian yang telah dilakukan.

Status tersimpan: submitted, returned, approved, paid, rejected, cancelled, historical. Status tampilan finance_unsent/finance_sent/finance_resend diturunkan dari approved dan catatan pengiriman/revisi; jangan menulisnya langsung ke database.

Filter Pengajuan mencakup submitted, returned, finance_unsent (termasuk resend). Riwayat mencakup finance_sent, paid, rejected, cancelled, historical. State mengirim data sesuai role; paginasi 10/25/50 dilakukan UI. Unduhan mencakup seluruh hasil filter.

## Profil dan master

Profil: id, name, company, code, department, position, level, grade, contract (PKWT/PKWTT), joinDate, status (active/resigned), resignDate, probationStatus (pending/passed; confirmed hanya untuk data lama yang telah dikonfirmasi), probationPassed, email, bank, account, accountName, opticsHistoryMode (pending untuk menunggu pemeriksaan). Gunakan versi profil dan tanggal efektif level dari UI/state; jangan menimpa history untuk mengganti level.

Jenis master yang didukung mengikuti masterTypes dalam lib/master-data.js. Pilihan aktual, relasi jabatan-departemen, kode Finance dan versi diperoleh melalui /state. Payload kriteria lengkap mengikuti quotaCriteria aktif/draft, termasuk aturan per level; jangan membuat struktur kriteria parsial.

## Kesalahan dan respons

- 200: berhasil (termasuk perubahan status/simpan/edit).
- 201: pembuatan klaim, karyawan, master dan kriteria.
- 400: validasi tidak sesuai; 401: belum masuk/sesi berakhir; 403: akses/origin ditolak; 404: sumber tidak ditemukan; 409: konflik versi/status/duplikat; 503: maintenance atau layanan uji belum tersedia; 500: kegagalan internal.
- Kesalahan JSON berbentuk {"error":"pesan"}; konflik duplikat menambahkan code dan duplicates. Respons file memakai Content-Type dan Content-Disposition.
- Header respons API: Cache-Control: no-store dan X-Content-Type-Options: nosniff.
- Saat ABT_MAINTENANCE=1, perubahan bisnis setelah autentikasi ditolak 503. Login, logout, change-password dan test-mode/enter diproses sebelum penjagaan tersebut; pastikan tidak ada input saat snapshot final.

## Contoh uji fiktif

Ganti HOSTNAME-TEST dengan hostname Mode Uji dan gunakan kredensial uji yang ditampilkan pada UI HR uji. Jangan menggunakan akun karyawan asli untuk uji tulis.

```sh
curl -c test-cookies.txt -H 'Content-Type: application/json' \
  -d '{"username":"TEST001","password":"ISI_PASSWORD_UJI"}' \
  https://HOSTNAME-TEST/api/login

curl -b test-cookies.txt 'https://HOSTNAME-TEST/api/state?year=2026'

curl -b test-cookies.txt -F category=outpatient -F date=2026-11-19 \
  -F provider='Klinik Uji' \
  -F 'items=[{"desc":"Pemeriksaan uji","amount":75000}]' \
  -F 'files=@contoh-uji.pdf' https://HOSTNAME-TEST/api/claims
```

Cookie jar adalah kredensial sesi; simpan hanya pada komputer operator dan hapus setelah uji. OpenAPI mencatat seluruh endpoint dan jenis request; skema profil/master/kriteria bersifat fleksibel sehingga referensi implementasi dan validasi server tetap berlaku.

## PT penanggung Expense

GET /state mengembalikan expenseCompanies berupa array {id,name,code} untuk perusahaan aktif dengan kode Finance. POST /claims kategori expense wajib mengirim expenseCompanyId. Server menyimpan expenseCompany {id,name,code} pada klaim. ID, nama dan kode merupakan snapshot per klaim; perusahaan asal profil tidak diubah. Satu klaim untuk satu PT.

Company Payment Request mengikuti kode PT tersebut, termasuk saat pratinjau, simpan, revisi dan PDF. Field Company tidak dapat diganti terpisah lewat request body untuk klaim baru ini. Klaim lama tanpa expenseCompany menggunakan perilaku sebelumnya; tidak ada backfill atau perubahan historical. Medical Benefits mengabaikan field PT khusus Expense.
