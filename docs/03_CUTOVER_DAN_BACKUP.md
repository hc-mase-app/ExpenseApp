# Cutover, backup, pemulihan dan pembaruan

## Waktu snapshot bukan sinkronisasi langsung

Paket data adalah salinan konsisten pada waktu yang tertulis dalam `snapshot-manifest.json`. Jika laptop dipakai lagi setelah waktu tersebut, klaim, bukti bayar, perubahan rekening atau status terbaru belum tentu ada pada paket yang sudah dibuat. Jangan mengaktifkan laptop dan server sebagai dua sumber input bersamaan setelah cutover.

## Cutover pertama

1. HR/IT menentukan waktu perpindahan dan menghentikan sementara penginputan pada laptop. Pastikan tidak ada pemeriksaan/pembayaran yang sedang disimpan.
2. Ambil snapshot terakhir memakai Node 24 dan `scripts/backup.mjs` dari paket:

```text
node scripts/backup.mjs --source "PATH_DATABASE_LAPTOP" --output "FOLDER_SNAPSHOT_BARU"
```

   Pada laptop sumber percobaan, file data ada di folder `data/trial.sqlite` dalam folder aplikasi. Pilih sumber itu, bukan database Mode Uji. Script membuka sumber secara read-only dan menolak menimpa snapshot tujuan.
3. Kirim snapshot baru dan manifest melalui kanal terbatas untuk IT/HR. Data baru menggantikan kebutuhan snapshot lama untuk cutover; jangan digabung dengan reimport Excel awal.
4. Pulihkan ke volume/folder server baru menggunakan `restore.mjs`, cocokkan manifest, lalu periksa 50 karyawan (atau jumlah pada snapshot terbaru), klaim, dokumen, rekening, saldo serta urutan nomor. Gunakan halaman aplikasi dan manifest sebagai kontrol, bukan input ulang manual.
5. Cocokkan rekonsiliasi saldo pada tanggal yang sama. Jika tanggal berbeda dan ada kenaikan masa kerja/kelayakan/siklus, HR memeriksa selisih yang sah. Jangan memaksa saldo lama dengan mengedit historical.
6. Lakukan uji penerimaan, buka akses domain perusahaan, lalu informasikan kepada pengguna. Laptop lama disimpan sebagai cadangan dan tidak dipakai lagi untuk transaksi baru.

## Backup rutin

Jadwalkan backup harian dan sebelum pembaruan. IT menetapkan retensi serta penyimpanan salinan di lokasi terpisah dari server. Contoh untuk Compose, ganti timestamp tujuan setiap kali menjalankan:

```sh
docker compose --env-file .env -f deploy/compose.yml exec app \
  node scripts/backup.mjs --output /backups/2026-11-19-0600
```

Volume backup di host yang sama saja belum melindungi dari hilangnya host. Salin hasil backup ke penyimpanan perusahaan yang aksesnya terbatas. Coba pemulihan berkala ke lingkungan terisolasi; jangan mengujinya dengan menimpa data utama.

## Pemulihan

- Hentikan akses tulis/penginputan dan amankan backup terakhir dari kondisi yang ada.
- Pulihkan snapshot yang dipilih ke **volume/folder baru**, verifikasi checksum dan tabel, lalu arahkan service ke data hasil pemulihan. Script menolak menimpa data yang sudah ada.
- Cocokkan saldo/nomor dan lampiran sebelum membuka akses. Jangan menghapus volume lama sampai pemulihan dinyatakan sesuai oleh HR/IT.
- Jika ada transaksi setelah snapshot, tentukan pemulihannya bersama HR. Jangan mengembalikan backup lama tanpa memperhitungkan transaksi tersebut.

## Pembaruan aplikasi

1. Simpan image/rilis sebelumnya dan backup data terkini.
2. Uji versi kode baru pada salinan terisolasi. Mode Uji dalam aplikasi memakai kode yang sama, sehingga tidak menggantikan pengujian rilis kode terpisah.
3. Saat maintenance diperlukan, set `ABT_MAINTENANCE=1` dan terapkan ulang service. API perubahan bisnis akan ditahan; verifikasi tidak ada transaksi yang belum selesai sebelum beralih.
4. Pasang image/rilis baru dengan tetap memakai volume data dan `ABT_INSTANCE_ID` yang sama. Paket ini tidak menambahkan migrasi schema bisnis yang mengubah data sebelumnya.
5. Verifikasi fungsi, saldo, PR dan unduhan. Set `ABT_MAINTENANCE=0`, terapkan ulang service, lalu buka akses.
6. Jika rollback hanya kode, gunakan image lama dengan data terbaru hanya setelah kompatibilitas dipastikan. Jangan otomatis menimpa data terbaru menggunakan backup lama.
