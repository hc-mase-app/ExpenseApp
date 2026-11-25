# Instalasi pelanggan baru

1. Ekstrak kode ke folder aplikasi. Jangan masukkan database, lampiran, .env atau kredensial ke repository.
2. Pasang Node 24 LTS dan pnpm 11.25.0; jalankan pnpm install --frozen-lockfile lalu pnpm run build.
3. Salin .env.example menjadi .env. Atur ABT_DATA_ROOT ke folder absolut DI LUAR kode, ABT_INSTANCE_ID unik dan tetap untuk pelanggan, serta ABT_PUBLIC_URL ke hostname HTTPS pelanggan. Pertahankan ABT_COOKIE_SECURE=1. Mode Uji nonaktif secara default.
4. Buat JSON sementara di lokasi terbatas di luar kode, dengan struktur berikut. Semua nilai merupakan contoh dan password harus diganti dengan rahasia unik 12–128 karakter:

    {"customerId":"customer-unique","companyName":"PT Pelanggan","financeCode":"CORP","adminId":"admin-customer","adminName":"Administrator","adminPassword":"REPLACE_WITH_UNIQUE_SECRET"}

5. Masukkan JSON lewat stdin (tidak melalui argumen password). PowerShell:

    Get-Content -Raw C:\secure\customer-init.json | node scripts/init-customer.mjs

   Linux:

    node scripts/init-customer.mjs < /secure/customer-init.json

   Hapus file input rahasia setelah setup. Script menolak database yang sudah ada; tidak menimpa akun atau transaksi. Jangan mengulang setup untuk upgrade.
6. Jalankan pnpm start. Login dengan akun yang ditentukan pada langkah 4. Atur nama/logo dan aturan awal di Pengaturan. Pengajuan diblokir sampai aturan awal aktif. Sebelum ada klaim, aturan awal dapat diperbaiki; setelah transaksi pertama gunakan versi kriteria bertanggal efektif.
7. Tambahkan perusahaan, departemen, jabatan, level dan bank lalu karyawan. Akun karyawan baru mendapat password acak 16 karakter yang ditampilkan satu kali kepada HR. Password dapat diubah sendiri; hasil reset menggugurkan sesi lama. Tidak ada password bawaan universal.

## Docker

Jalankan perintah Compose dari folder deploy (agar ../.env konsisten):

    docker compose --env-file ../.env build
    docker compose --env-file ../.env run --rm -T app node scripts/init-customer.mjs < /secure/customer-init.json
    docker compose --env-file ../.env up -d app

Untuk PowerShell, gunakan Get-Content -Raw pada file input dan pipe ke perintah compose run. Volume dibuat dengan pemilik user node oleh image. Compose memakai ABT_INSTANCE_ID sebagai nama proyek: wajib berbeda per pelanggan. Atur APP_PORT/TEST_PORT berbeda apabila beberapa instalasi memakai host yang sama. Reverse proxy mengarah ke loopback port pelanggan; berikan hostname HTTPS terpisah. Image tidak berisi database atau rahasia.

Satu pelanggan = satu hostname + satu instance ID + satu kumpulan volume/database + satu cadangan. Jangan memasang volume database pelanggan A pada container pelanggan B. Startup menolak identity/instance ID yang berbeda. Jangan mengubah instance ID ketika memulihkan pelanggan yang sama.

## Mode Uji opsional

Siapkan dari layanan utama: node scripts/prepare-test.mjs (atau compose exec app ...). Aktifkan ABT_ENABLE_TEST_MODE=1, atur hostname HTTPS test berbeda dan ABT_TEST_INTERNAL_URL=http://test:3101/, jalankan docker compose --env-file ../.env --profile test up -d. Mode Uji hanya menyalin master, aturan dan nama identitas; akun/klaim asli serta logo tidak disalin. Data uji dan urutan nomornya terpisah. Jika tidak diperlukan, biarkan nonaktif.

