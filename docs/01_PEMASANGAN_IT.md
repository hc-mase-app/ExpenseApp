# Pemasangan IT

Jalankan dari folder aplikasi hasil ekstrak. Domain `example.com` adalah contoh, bukan alamat yang sudah dibuat. Gunakan hostname khusus pada root domain/subdomain; pemasangan pada `/subfolder` belum didukung paket ini.

## Pilihan utama: Linux + Docker Compose + reverse proxy HTTPS

1. IT menyediakan Docker Engine/Compose, DNS, sertifikat perusahaan, disk lokal persisten dan akses terbatas untuk operator. Gunakan satu instance layanan utama. Jangan gunakan replika ganda untuk database SQLite yang sama, network share/NFS atau disk sementara serverless.
2. Ekstrak paket aplikasi dan paket data secara terpisah. Contoh folder data sementara: `/secure/abt-handover-data`. Batasi akses folder ini ke IT/HR yang berwenang.
3. Salin `.env.example` menjadi `.env`. Isi `ABT_PUBLIC_URL` dengan domain HTTPS sebenarnya. Tetapkan `ABT_INSTANCE_ID` yang stabil, lalu pertahankan nilainya pada setiap pembaruan. Jangan mengubah folder data saat mengganti versi kode. Untuk instalasi utama pertama, `ABT_ENABLE_TEST_MODE=0`.
4. Bangun image. Perintah berikut tidak menyalakan aplikasi dan tidak memasukkan database asli ke image:

```sh
docker compose --env-file .env -f deploy/compose.yml build app
```

5. Pulihkan database ke volume **baru/kosong**, sebelum menjalankan layanan:

```sh
docker compose --env-file .env -f deploy/compose.yml run --rm --no-deps \
  -v /secure/abt-handover-data:/handover:ro app \
  node scripts/restore.mjs --source /handover/trial.sqlite \
  --manifest /handover/snapshot-manifest.json
```

   Pemulihan menolak tujuan yang sudah berisi database. Jangan menghapus volume lama untuk memaksa pemulihan. Gunakan volume baru dan ikuti prosedur pemulihan pada dokumen 03.

6. Jalankan dan periksa layanan:

```sh
docker compose --env-file .env -f deploy/compose.yml up -d app
docker compose --env-file .env -f deploy/compose.yml ps
docker compose --env-file .env -f deploy/compose.yml logs --tail=100 app
```

7. Terapkan `deploy/nginx.conf.example` pada Nginx host. Ganti hostname dan lokasi sertifikat. Aktifkan virtual host utama terlebih dahulu. Port Node 3100/3101 hanya diterbitkan ke loopback host. Jangan membuka kedua port ini langsung ke internet. Konfigurasi mencakup redirect HTTPS, header keamanan, pembatasan percobaan login dan penerusan Host yang benar agar pemeriksaan asal permintaan tetap bekerja.
8. Jalankan `nginx -t`, kemudian reload Nginx sesuai prosedur IT. Uji dari browser komputer dan HP melalui domain HTTPS. Tidak perlu mengaktifkan hotspot laptop.
9. Sebelum membuka akses karyawan, cocokkan manifest dan rekonsiliasi dari paket data:

```sh
docker compose --env-file .env -f deploy/compose.yml run --rm --no-deps \
  -v /secure/abt-handover-data:/handover:ro app \
  node scripts/verify.mjs --manifest /handover/snapshot-manifest.json

docker compose --env-file .env -f deploy/compose.yml run --rm --no-deps \
  -v /secure/abt-handover-data:/handover:ro app \
  node scripts/reconciliation.mjs --baseline /handover/reconciliation.json
```

   Manifest membandingkan baris tabel, termasuk lampiran dan akun. Lakukan sebelum pengguna mulai login/bertransaksi; setelah itu perubahan tabel sesi/klaim bisa sah. Rekonsiliasi saldo menolak perbandingan otomatis jika tanggalnya berbeda, karena masa kerja, eligibility, dan siklus kacamata bisa berubah secara sah. HR/IT meninjau selisih bertanggal jika pemasangan dilakukan setelah tanggal snapshot.

## Mode Uji di server

Mode Uji bukan salinan data asli. Ia memakai dua akun fiktif, database/nomor terpisah dan penanda DATA UJI. Kode aplikasi tetap sama; lingkungan ini belum menjadi release gate/staging dengan versi kode terpisah.

1. Sediakan hostname HTTPS kedua, misalnya `benefits-test.example.com`, dan aktifkan virtual host test Nginx.
2. Siapkan database uji dari layanan utama:

```sh
docker compose --env-file .env -f deploy/compose.yml exec app node scripts/prepare-test.mjs
docker compose --env-file .env -f deploy/compose.yml --profile test up -d test
```

3. Isi `.env`: `ABT_TEST_PUBLIC_URL=https://HOSTNAME-TEST/`, `ABT_TEST_INTERNAL_URL=http://test:3101/`, `ABT_ENABLE_TEST_MODE=1`. Terapkan ulang variabel layanan:

```sh
docker compose --env-file .env -f deploy/compose.yml --profile test up -d app test
```

4. HR membuka tombol Mode Uji dari aplikasi utama. Tautan satu kali mengarah ke hostname test, bukan `127.0.0.1` milik HP/karyawan. Jika layanan test belum aktif, aplikasi memberi pesan untuk menghubungi IT; tidak menjalankan proses server liar dari aplikasi utama.
5. Uji Reset Data Uji, lalu verifikasi data/nomor utama tetap sama. Jangan menyalin file database test ke volume utama.

## Alternatif Node.js pada Windows/server tanpa Docker

1. Gunakan Node 24.22.3 dan pnpm 11.25.0. Instal pnpm dari registry resmi jika belum tersedia. Ekstrak kode di luar OneDrive/network share.
2. Sebelum membuat `.env`, jalankan `pnpm install --frozen-lockfile` lalu `pnpm run build`.
3. Buat folder data terpisah, misalnya `C:\ProgramData\ABTBenefits`. Salin `.env.example` ke `.env`; ganti `ABT_DATA_ROOT` ke folder tersebut, `ABT_BIND_HOST=127.0.0.1`, `ABT_TEST_INTERNAL_URL=http://127.0.0.1:3101/`, dan alamat publik HTTPS perusahaan.
4. Jalankan `node scripts/restore.mjs --source "PATH\trial.sqlite" --manifest "PATH\snapshot-manifest.json"` sebelum `pnpm start`.
5. IT menjalankan `node scripts/serve.mjs` sebagai service menggunakan pengelola service yang sudah disetujui perusahaan. Working directory harus folder aplikasi. Restart otomatis serta log dikelola oleh IT, bukan dengan membiarkan jendela terminal pengguna menjadi satu-satunya server.
6. Gunakan IIS/reverse proxy HTTPS yang sudah dikelola IT. Teruskan header Host asli, batasi percobaan login, hindari cache respons API, dan sesuaikan batas upload minimal dengan validasi aplikasi (maksimal 10 file x 10 MB per kelompok dokumen). Contoh Nginx memiliki batas 250 MB untuk menampung dua kelompok file pada expense.
7. Batasi hak NTFS folder data/backup ke akun service dan operator yang berwenang. Jangan menaruh database atau daftar password di folder `public`.

## Acuan

- https://nextjs.org/docs/app/guides/self-hosting
- https://nodejs.org/docs/latest-v24.x/api/sqlite.html
- https://docs.docker.com/compose/

Konfigurasi DNS/TLS, Docker/Linux dan reverse proxy harus diuji pada infrastruktur IT sebenarnya sebelum layanan dinyatakan aktif untuk karyawan.
