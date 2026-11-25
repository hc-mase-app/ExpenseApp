# Revisi PT penanggung biaya Expense - 19 Nov 2026

- Pengajuan Expense menyediakan dropdown PT yang menanggung biaya dari master perusahaan aktif.
- Perusahaan asal karyawan tetap mengikuti profil; tidak diubah saat memilih PT lain.
- Satu pengajuan untuk satu PT. Kode Company Payment Request mengikuti snapshot pilihan pada klaim.
- Pilihan tersimpan pada klaim, ditampilkan pada detail dan PDF, serta tetap digunakan saat revisi/pembayaran.
- Medical Benefits serta klaim lama tidak dimigrasikan. Tidak ada perubahan data, saldo, plafon, historical atau nomor Payment Request yang sudah tersimpan.
- Uji salinan: 17 pemeriksaan berhasil, 172 klaim lama dan 50 profil tetap sama; desktop 1440 px/HP 390 px berhasil; PDF HJI satu halaman.
- Paket ZIP ini memuat revisi setelah commit awal Bitbucket 6711adb. Gunakan kode ZIP ini untuk fitur terbaru; repository awal belum diperbarui oleh revisi lokal ini.

Untuk instalasi yang sudah bertransaksi, backup dan perbarui kode saja sesuai prosedur IT; jangan mengganti database aktif dengan snapshot lama dari ZIP.
