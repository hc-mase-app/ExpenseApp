# Unggah ke repository

Ekstrak ZIP. Isinya adalah kode aplikasi, bukan program EXE atau database.

Untuk GitHub Desktop: gunakan folder repository lokal, masukkan isi hasil ekstraksi ke folder tersebut, tinjau daftar perubahan, commit lalu push. Sertakan seluruh folder app, config, deploy, docs, lib, public, scripts, tests serta file konfigurasi di tingkat utama. Jangan hanya mengunggah file ZIP jika repository akan dipakai untuk build aplikasi.

Jangan menyalin folder node_modules, .next, data, data-test, database, backup, dokumen klaim, .env atau password ke repository. File .gitignore sudah mengecualikan data runtime. SOURCE_MANIFEST.json berisi checksum file sumber untuk pengecekan kelengkapan, bukan data pelanggan.

Jika memakai repository yang sudah berisi versi sebelumnya, tinjau dan hapus aset/logo serta file sumber lama yang tidak ada pada paket baru agar tidak tertinggal. Jangan mencampurkan ZIP produk ini dengan backup operasional. Instalasi produk baru dimulai kosong dan memerlukan setup pelanggan.
