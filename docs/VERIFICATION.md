# Pemeriksaan rilis 0.1.0 — 25 Nov 2026

- Production build Next.js berhasil menggunakan Node 24.22.3 dan webpack.
- Empat kelompok uji otomatis lulus: instalasi pelanggan kosong dan penolakan overwrite; aktivasi aturan/otorisasi/perubahan bersamaan/alur klaim; penolakan instance pelanggan yang berbeda; serta backup dan reset Mode Uji yang terpisah.
- Dua database pelanggan fiktif dibuat terpisah, masing-masing berawal dari satu admin tanpa klaim/lampiran; tidak memakai database pelanggan nyata sebagai fixture produk.
- Pengujian browser Edge headless pada desktop 1.440 px dan HP 390 px: login, navigasi pengaturan dan perubahan identitas berhasil tanpa JavaScript error atau overflow horizontal.
- PDF contoh Payment Request dengan rincian dan saldo medis diperiksa secara visual; satu halaman A4. Dokumen panjang tetap menggunakan pemisahan halaman bila diperlukan agar isi tidak hilang.
- XLSX contoh riwayat dibaca ulang tanpa peringatan: tiga sheet, nilai klaim dan logo tersemat; identitas ada pada ringkasan/header cetak.
- Kode operasional dan seluruh tabel database aplikasi asal dicocokkan dengan snapshot awal; tidak berubah selama pekerjaan ini.
- Paket menggunakan daftar file sumber yang diperbolehkan, manifest SHA-256 dan pemeriksaan isi ZIP; tidak memuat database, lampiran, akun/password karyawan, .env atau token.

Dockerfile, Compose dan contoh reverse proxy disertakan. Build/run Docker belum diuji pada mesin ini karena Docker tidak tersedia. IT perlu memvalidasi image, volume, HTTPS, backup dan pemulihan pada lingkungan tujuan sebelum dipakai operasional. Pemeriksaan ini tidak mencakup uji beban banyak pelanggan atau audit keamanan independen.
