# Operasional dan pembaruan

Database SQLite menyimpan profil, hash password, klaim, saldo berbasis riwayat, nomor urut, lampiran dokumen, nama/logo pelanggan dan audit. File logo disimpan di database yang sama; laporan dibentuk saat diunduh.

Gunakan node scripts/backup.mjs --output FOLDER_SNAPSHOT_BARU: ABT_DATA_ROOT mengarah ke data pelanggan; --output menunjuk FOLDER snapshot baru di luar kode. Cadangan SQLite dibuat dengan online backup termasuk transaksi WAL. Snapshot mencakup semua tabel dan BLOB lampiran, disertai manifest/checksum. Simpan cadangan terenkripsi di lokasi terbatas, terpisah per pelanggan. Jangan unggah ke repository. Uji pemulihan sebelum digunakan sebagai satu-satunya cadangan.

Pemulihan memakai scripts/restore.mjs --source FILE_SQLITE --manifest FILE_MANIFEST dengan ABT_DATA_ROOT baru. Tujuan yang sudah berisi database ditolak. Gunakan ABT_INSTANCE_ID pelanggan yang sama agar identitas cocok. Akun dan password mengikuti snapshot; script tidak mengganti password. Mode Uji dapat dibuat ulang dan tidak menjadi sumber pemulihan transaksi utama.

Sebelum upgrade: cadangkan, hentikan perubahan transaksi, uji versi baru memakai salinan terpisah dan hostname uji, periksa hasil dan saldo, lalu deploy kode. Jangan menjalankan init-customer pada database yang sudah berisi data. Simpan versi image sebelumnya untuk rollback kode. Jangan menjalankan beberapa replica penulis pada satu file SQLite melalui network filesystem; versi ini ditujukan untuk satu layanan utama per pelanggan.

Reverse proxy wajib HTTPS, batas unggahan/request sesuai kebutuhan, pembatasan percobaan login, backup terjadwal dan akses admin terbatas. Sesuaikan client_max_body_size dengan lampiran: maksimal 10 MB per file dan 10 file per kelompok. Aplikasi tidak mengirim email/WhatsApp dan tidak melakukan transfer bank; pengiriman dan konfirmasi mengikuti alur HR–Finance.

Paket sumber tidak mencakup lisensi komersial atau penetapan kepemilikan IP untuk distribusi kepada pelanggan; hal tersebut ditetapkan pemilik aplikasi secara terpisah. Dependensi mempertahankan lisensinya masing-masing.

