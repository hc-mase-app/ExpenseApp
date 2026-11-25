# Benefits & Expenses — Product v0.1

Versi produk terpisah untuk satu pelanggan per instalasi. Nama grup/aplikasi dan logo dapat diatur tanpa mengubah kode. Satu pelanggan dapat mengelola beberapa perusahaan/PT di Data Master, termasuk PT penanggung biaya Expense.

## Isi paket

- Kode aplikasi Next.js, API internal, Dockerfile dan contoh reverse proxy.
- Instalasi baru dengan satu akun HR/admin yang ditentukan saat setup; tanpa data pelanggan lama, klaim, lampiran atau password karyawan.
- Pengaturan identitas/logo PNG/JPEG, batas hari klaim, aktivasi aturan awal, kriteria plafon per level dan tanggal efektif.
- Alur klaim, pemeriksaan HR, Payment Request, penanda pengiriman Finance, pembayaran dan unduhan tetap tersedia.
- Panduan instalasi, API, pemeliharaan dan hasil pemeriksaan.

## Mulai

Gunakan Node.js 24.22.3 atau Node 24 LTS yang kompatibel dan pnpm 11.25.0. Baca [INSTALL.md](docs/INSTALL.md) sebelum menjalankan server. Jalankan dari folder hasil ekstraksi, bukan dari dalam ZIP.

    pnpm install --frozen-lockfile
    pnpm run build
    pnpm run test:product

Atur .env dari .env.example. Database harus berada di luar folder kode. Buat pelanggan dengan scripts/init-customer.mjs sebelum pnpm start. Setelah masuk, buka Pengaturan → Identitas & Aturan Awal, aktifkan aturan yang telah disetujui pelanggan, lalu lengkapi Data Master dan Data Karyawan.

## Batas versi ini

Ini model instalasi terpisah per pelanggan, bukan layanan SaaS bersama dengan pendaftaran publik, billing, atau langganan otomatis. Antarmuka berbahasa Indonesia, mata uang rupiah dan waktu Asia/Jakarta. Rawat jalan memakai tahun kalender tanpa prorata; kacamata satu klaim per siklus dan khusus karyawan; dukungan keluarga mengikuti model plafon bersama. Besaran/masa kerja dapat diatur; model kebijakan lain memerlukan pengembangan. Finance menerima laporan di luar aplikasi; aplikasi tidak melakukan transfer bank otomatis.

Internal variable names ABT_* dipertahankan untuk kompatibilitas konfigurasi; bukan identitas pelanggan yang tampil. Jangan memakai paket ini untuk menimpa instalasi operasional lama. Produk baru ini tidak menyediakan migrasi otomatis database versi sebelumnya.

