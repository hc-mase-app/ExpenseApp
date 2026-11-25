# Isi paket dan pemeriksaan keutuhan

Paket aplikasi dan data dipisahkan supaya source code dapat disimpan dalam repositori internal tanpa memasukkan database personal karyawan.

## 01_Aplikasi_dan_Panduan_IT.zip

- Source aplikasi Next.js dan seluruh aset frontend/logo/PDF viewer.
- Versi dependensi terkunci pada `package.json` dan `pnpm-lock.yaml`.
- Contoh konfigurasi `.env.example`, Dockerfile, Compose, Nginx HTTPS.
- Script start, backup, restore, pemeriksaan manifest, rekonsiliasi dan persiapan Mode Uji.
- Panduan pemasangan, arsitektur, perpindahan data, pembaruan, backup dan uji penerimaan.
- Tes konfigurasi/backup (`pnpm run test:deployment`) dan hasil validasi aktual.
- `SOURCE_MANIFEST.json` berisi SHA-256 setiap file sumber dalam ZIP.

Tidak menyertakan node_modules, .next, .env aktif, database asli, database uji atau daftar password plaintext. IT membangun ulang aplikasi dengan versi dependensi terkunci; tidak perlu memindahkan folder dependency dari laptop.

## 02_Data_Terbaru_TERBATAS.zip

- `trial.sqlite`: snapshot konsisten database asli, termasuk file lampiran BLOB, akun/hash password, klaim, profil, audit, Finance, master, pengaturan dan urutan nomor.
- `snapshot-manifest.json`: waktu snapshot, checksum database, jumlah dan hash setiap tabel.
- `reconciliation.json`: kontrol saldo/plafon/pemakaian rawat jalan dan kacamata 50 karyawan pada tanggal snapshot.
- `BACA_DULU_DATA.txt`: ringkasan dan langkah penggunaan.

Paket ini mengandung data medis, identitas dan rekening karyawan. Berikan hanya kepada IT/HR yang menangani pemasangan melalui kanal perusahaan terbatas. Jangan memasukkannya ke repositori source code atau folder web publik. ZIP tidak dienkripsi; pembatasan akses dan cara transfer ditangani IT.

## Dokumen pendamping

`03_Serah_Terima_IT.pdf` adalah panduan ringkas untuk HR/IT. `SHA256SUMS.txt` di folder pengiriman mencatat checksum kedua ZIP dan PDF. Cocokkan checksum setelah transfer agar file yang diterima sama; checksum bukan pengganti pembatasan akses.

## Batas kesiapan

Paket siap diserahkan untuk pemasangan dan uji penerimaan IT. Ini bukan pernyataan bahwa server perusahaan sudah aktif atau sudah lulus seluruh pemeriksaan keamanan produksi. DNS, TLS, proxy, backup rutin, kapasitas dan uji operasional pada server sebenarnya tetap ditangani IT. Tidak ada pengiriman email, publikasi domain atau perubahan aplikasi laptop yang dilakukan melalui pembuatan paket ini.
