> Versi terbaru: pilihan PT penanggung biaya khusus Expense. Lihat docs/07_REVISI_PT_EXPENSE.md.

# Benefits & Expenses - paket serah terima IT

Versi paket: 19 November 2026. Bahasa panduan: Indonesia.

## Mulai dari sini

1. Baca `docs/01_PEMASANGAN_IT.md` untuk pemasangan pada server dan HTTPS.
2. Pulihkan `trial.sqlite` dari **paket data terbatas yang terpisah**. Tidak ada database karyawan di ZIP aplikasi ini.
3. Cocokkan `snapshot-manifest.json` dan `reconciliation.json` sebelum membuka akses pengguna.
4. Jalankan penerimaan pada `docs/04_UJI_DAN_SERAH_TERIMA.md`.
5. Jika laptop masih menerima pengajuan setelah waktu snapshot, lakukan backup final/cutover sesuai `docs/03_CUTOVER_DAN_BACKUP.md`.

## Yang dipertahankan

Alur pengajuan karyawan, pemeriksaan HR, persetujuan/penolakan/pelengkapan, Payment Request, pencatatan pengiriman Finance dan pembayaran, data master, kriteria plafon, riwayat, nomor, PDF/Excel, tampilan desktop dan mobile mengikuti versi aplikasi laptop yang disetujui. Email ke HR/Finance dan transfer bank tetap dilakukan di luar aplikasi.

Pengajuan memuat Menunggu Pemeriksaan HR, Perlu Dilengkapi, dan Belum Dikirim ke Finance. Riwayat memuat Menunggu Pembayaran, Dibayar, Ditolak, Dibatalkan, dan Semua Riwayat. Riwayat impor tidak dianggap bukti pembayaran baru. Revisi yang perlu dikirim ulang masuk filter Belum Dikirim ke Finance.

## Kebutuhan platform

- Node.js **24 LTS**, diuji pada **24.22.3**, dan pnpm **11.25.0**. Jangan langsung mengganti ke Node 26.
- Satu instance aplikasi utama dengan penyimpanan SQLite yang persisten pada disk lokal server.
- Domain/hostname perusahaan dan sertifikat HTTPS. Contoh `example.com` dalam paket wajib diganti oleh IT.
- Reverse proxy, pembatasan akses ke data/backup, serta jadwal backup.
- Gunakan VM/server/container dengan volume persisten. Paket ini tidak memakai database terkelola dan tidak cocok dipasang sebagai fungsi serverless dengan disk sementara.

## Dokumen

- `docs/01_PEMASANGAN_IT.md`: Docker Compose, Node/Windows, domain, HTTPS dan Mode Uji.
- `docs/02_ARSITEKTUR_DAN_DATA.md`: komponen, cakupan data, akun dan perubahan versi server.
- `docs/03_CUTOVER_DAN_BACKUP.md`: snapshot terbaru, backup/pemulihan dan pembaruan.
- `docs/04_UJI_DAN_SERAH_TERIMA.md`: daftar uji dan batas verifikasi.
- `docs/HASIL_VALIDASI.json`: hasil pemeriksaan paket yang dilakukan saat persiapan.

Database menyimpan akun dengan salt/hash password yang sudah ada. Password pengguna tidak direset oleh paket. Daftar plaintext password awal tidak dimasukkan ke ZIP aplikasi atau dibuat ulang sebagai password terbaru.
