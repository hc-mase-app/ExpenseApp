# Arsitektur dan data

## Komponen

Frontend Next.js/React memuat portal JavaScript/CSS responsif. API Node memakai SQLite bawaan Node. File pendukung klaim dan bukti pembayaran disimpan sebagai BLOB di tabel `documents`, bukan pada browser karyawan. PDF dan Excel dibentuk oleh kode aplikasi yang sama dengan versi laptop.

Alur: browser komputer/HP -> reverse proxy HTTPS -> satu proses utama Node -> database persisten. Email ke HR/Finance dan transfer bank tetap manual di luar aplikasi. Tidak ada integrasi otomatis bank, email, SSO atau sinkronisasi dua arah dengan laptop dalam paket ini.

## Data yang ikut dipindahkan

- Profil/Employee ID, level, kontrak, tanggal, rekening, status aktif/resign dan perubahan profil.
- Akun, role HR/karyawan serta salt/hash password yang sudah tersimpan. Tidak ada reset password massal.
- Seluruh klaim pada snapshot, rincian biaya, status, catatan pemeriksaan, potensi duplikat, dan jejak proses.
- Kuitansi, resep/dokumen pendukung, bukti persetujuan serta bukti pembayaran yang memang sudah diunggah.
- Data pengiriman Finance, Payment Request, rekening yang tersimpan, riwayat revisi dan nomor/urutan.
- Data master, versi kriteria plafon, riwayat level, hak tahunan yang sudah dikunci dan arsip impor.

Pengajuan uji yang sudah dihapus sebelumnya tidak dibuat kembali. Rekam riwayat lama/import tetap mengikuti database saat snapshot. Ringkasan aktual dan checksum ada pada `snapshot-manifest.json` di paket data terbatas; angka tidak ditetapkan ulang dari Excel awal.

## Penyimpanan

`ABT_DATA_ROOT/data/trial.sqlite` adalah data utama. `ABT_DATA_ROOT/data-test/trial.sqlite` adalah data fiktif Mode Uji. SQLite dapat membuat berkas `-wal`/`-shm` saat aplikasi berjalan; gunakan skrip backup SQLite, jangan menyalin file utama saja ketika transaksi masih berjalan. Snapshot portabel dalam paket sudah dikonsolidasikan menjadi satu file.

Data utama harus berada di disk persisten di luar folder kode. Pergantian image/folder rilis tidak boleh mengganti volume data. Volume test berbeda dari volume utama. Container test tidak mendapatkan mount volume database asli.

## Penyesuaian khusus paket server

1. Lokasi data dikonfigurasi dari environment. Server menolak database kosong/hilang agar tidak diam-diam mulai dari data baru.
2. Alamat utama/test menjadi alamat perusahaan yang dikonfigurasi, bukan localhost laptop.
3. Cookie autentikasi memakai Secure pada server HTTPS, selain HttpOnly dan SameSite=Strict.
4. Mode Uji dikelola sebagai layanan terpisah. Tombolnya dapat dinonaktifkan sampai hostname/service test siap.
5. Instance ID stabil menjaga identitas database test saat folder kode diganti.
6. Mode pemeliharaan dapat menahan perubahan bisnis ketika perpindahan/update; login/logout masih tersedia.
7. Panduan proxy membatasi endpoint login dan mempertahankan origin checking yang sudah ada.

Rumus benefit, saldo, alur persetujuan, user role, klaim, urutan nomor, template PDF/Excel, dan UI ringkas terakhir tidak diganti. Perubahan hanya diterapkan ke salinan paket server; sumber aplikasi laptop tetap dipertahankan.

## Akun dan password

Pengguna masuk dengan Employee ID dan password yang sama dengan yang tersimpan saat snapshot. Password disimpan sebagai hash sehingga tidak dapat diekstrak sebagai daftar password terbaru. File password awal dari proses distribusi sebelumnya bisa tidak mencerminkan perubahan/reset berikutnya; karena itu tidak dipublikasikan atau dilabeli sebagai daftar password aktif di paket kode. HR dapat memakai fitur reset password yang sudah ada bila pengguna memerlukannya.

Sesi login lama mungkin masih tercatat pada snapshot, tetapi browser perlu login pada domain server yang baru. Keputusan menonaktifkan sesi lama setelah rekonsiliasi merupakan langkah operasional IT; jangan mengganti hash password pengguna.

## Batas penggunaan versi ini

- Satu database utama lokal server, satu instance utama. Tidak dirancang untuk replika/horizontal scaling dengan SQLite bersama.
- Domain/root hostname sendiri; tidak ada konfigurasi base path subfolder portal.
- Portal internal dapat menautkan ke alamat aplikasi. Akses internet publik, SSO, integrasi payroll/bank/email, PostgreSQL dan object storage belum ditambahkan.
- Perubahan data di laptop setelah waktu snapshot tidak otomatis ikut ke server.
- Akses dan pengelolaan data medis dibatasi ke pihak yang berwenang sesuai pengaturan role aplikasi dan prosedur perusahaan.
