# API internal

Basis URL: https://HOST_PELANGGAN/api. Tidak ada API key universal atau password yang disertakan. API ini dipakai browser aplikasi dengan cookie sesi HttpOnly, SameSite=Strict dan Secure pada HTTPS. POST dari origin berbeda ditolak. Jangan membuka database/lampiran sebagai folder publik.

| Method / path | Kegunaan / akses |
| --- | --- |
| GET /branding | Nama pelanggan, nama aplikasi, versi logo; publik untuk halaman login |
| GET /branding/logo | Logo pelanggan atau ikon bawaan; publik |
| POST /login | JSON username, password; menghasilkan cookie sesi |
| POST /logout | Mengakhiri sesi |
| POST /change-password | JSON username, currentPassword, newPassword, confirmPassword |
| GET /state?year=YYYY | Profil, klaim dan saldo; karyawan hanya miliknya, HR seluruh pelanggan |
| POST /branding | HR: multipart version, companyName, productName, claimWindowDays, logo opsional, removeLogo opsional |
| POST /product/initial-policy | HR: JSON version dan data aturan; terkunci setelah ada klaim |
| POST /masters atau /masters/:id | HR: data master; version wajib untuk edit |
| POST /employees atau /employees/:id | HR: tambah/edit profil; version untuk edit |
| POST /employees/:id/change-id | HR: koreksi ID karyawan yang sama; histori dipertahankan |
| GET /employees/:id/id-history | HR: histori koreksi ID |
| POST /employees/:id/reset-password | HR: password acak baru; hanya tampil pada respons ini |
| POST /employees/:id/optics-review | HR: pemeriksaan riwayat kacamata |
| POST /claims | Karyawan/HR atas nama: multipart kategori, tanggal, provider, items JSON dan files; Expense membutuhkan PT penanggung dan bukti approval |
| POST /claims/:id/action | HR: approve/return/reject/cancel/paid sesuai status; alasan dan bukti mengikuti validasi aplikasi |
| GET /claim-eligibility | Pratinjau hak klaim sesuai tanggal/kategori |
| POST /claims/:id/payment-request/prepare | HR: menyiapkan Payment Request |
| POST /claims/:id/payment-request | HR: simpan field SOP |
| POST /claims/:id/payment-request/revision | HR: mulai/batalkan revisi draft |
| POST /claims/:id/payment-request/update-account | HR: sinkronkan rekening untuk permintaan yang sudah dikirim; wajib kirim ulang |
| POST /claims/:id/finance-dispatch | HR: JSON sentDate; waktu dan petugas otomatis |
| GET /claims/:id/report | PDF Payment Request dan rincian klaim |
| GET /documents/:id?preview=1 | Lampiran hanya untuk pemilik klaim/HR yang berwenang |
| GET /history | PDF/XLSX riwayat sesuai employee, year, category, format dan filter |
| GET /monitoring | HR: XLSX seluruh data sesuai tab/filter |
| POST /quota-criteria atau /quota-criteria/:id | HR: buat/edit draft kriteria masa depan |
| POST /quota-criteria/:id/action | HR: publish/cancel versi yang belum berlaku |
| GET /test-mode/info | Status lingkungan; publik, tanpa data medis |
| POST /test-mode/start, /enter, /reset | Mode Uji terpisah; start/reset hanya HR dan pemeriksaan lingkungan |
| POST /claims/:id/archive | HR: arsip/kembalikan sesuai status yang diizinkan |

Status kesalahan: 400 validasi, 401 sesi/login, 403 hak akses, 404 tidak ditemukan, 409 konflik versi/status/duplikat, 503 pemeliharaan. Endpoint tidak menyediakan akses lintas pelanggan. Integrasi eksternal dengan SSO/service-account memerlukan kontrak API dan autentikasi tambahan, bukan menaruh password HR pada aplikasi pihak ketiga.

