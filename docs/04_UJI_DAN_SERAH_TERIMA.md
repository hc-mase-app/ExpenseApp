# Uji penerimaan dan serah terima

Uji perubahan transaksi menggunakan Mode Uji/salinan fiktif. Pada data asli, periksa hasil snapshot dan baca data yang ada; jangan membuat klaim pembayaran contoh atas nama karyawan asli.

## Data dan akun

- Manifest database sama setelah pemulihan, termasuk seluruh lampiran dan salt/hash akun.
- Jumlah profil/akun, rincian klaim per status, data Finance, Payment Request dan sequence sama dengan snapshot.
- Saldo/plafon rawat jalan dan kacamata sesuai rekonsiliasi bertanggal, termasuk historical dan hak tahunan yang tersimpan.
- Role HR dan karyawan bekerja sesuai aksesnya. Karyawan tidak dapat melihat karyawan lain atau menyetujui klaim.
- Login, logout, ubah password dan reset oleh HR berfungsi. Gunakan akun uji untuk pengujian password.

## Alur klaim pada data uji

1. Ajukan klaim dan lampirkan dokumen; notifikasi untuk memberi tahu HR tetap tampil.
2. Klaim baru muncul pada Pengajuan - Menunggu Pemeriksaan HR.
3. Kembalikan untuk dilengkapi, lalu kirim ulang pengajuan yang sama. Nomor klaim tidak dibuat ulang.
4. Setujui klaim: muncul Belum Dikirim ke Finance. Nomor Payment Request dibuat tanpa duplikasi.
5. Buka pratinjau/unduh PDF. Hal ini tidak otomatis mengubah status pengiriman.
6. Catat tanggal pengiriman Finance; klaim masuk Riwayat - Menunggu Pembayaran.
7. Catat bukti transfer dan pembayaran; status menjadi Dibayar, nomor/nominal tetap tersimpan.
8. Uji penolakan, pembatalan duplikat, arsip/pengembalian arsip, dan pengembalian alokasi saldo yang berlaku.
9. Uji peringatan duplikat; bila tetap diajukan, alasan wajib terisi.
10. Uji revisi Payment Request setelah dikirim: penanda Perlu Kirim Ulang dan filter Belum Dikirim ke Finance bekerja. Nomor tidak berubah.

## Tampilan, unduhan dan operasional

- Desktop dan HP: menu, baris ringkas, filter, 10/25/50 baris, detail popup, pratinjau lampiran, rawat jalan/kacamata/expense.
- Ringkasan/unduhan mencakup semua hasil filter, bukan hanya halaman saat ini. Riwayat impor tidak dihitung sebagai bukti Dibayar baru.
- PDF Payment Request memiliki seluruh field SOP dan rincian klaim; PDF/Excel riwayat serta format tanggal tetap sesuai versi yang disetujui.
- Mode Uji memiliki hostname dan database sendiri. Reset tidak memengaruhi data/nomor utama.
- HTTPS valid pada domain sebenarnya; cookie Secure/HttpOnly/SameSite; HTTP diarahkan ke HTTPS; Node port tidak terbuka publik; limiter login bekerja di proxy.
- Backup dapat dipulihkan pada folder/volume baru. Hak akses dan pemantauan kapasitas/log sudah ditetapkan oleh IT.
- Setelah server direstart atau image diganti, data tetap ada pada volume persisten.

## Hasil pemeriksaan saat persiapan paket

Lihat `HASIL_VALIDASI.json` untuk hasil aktual. Persiapan dilakukan pada Windows dengan Node 24.22.3, memakai salinan snapshot. Docker Engine/Linux, DNS, sertifikat, Nginx/IIS, akses antarperangkat pada domain perusahaan, serta restore backup pada infrastruktur IT **tetap memerlukan uji IT**, karena infrastruktur itu belum tersedia pada laptop ini. Paket belum dipublikasikan dan belum dikirim otomatis kepada siapa pun.

## Penerimaan IT/HR

Catat hostname utama/test, waktu snapshot final/cutover, lokasi data/backup, operator service, jadwal backup, hasil rekonsiliasi, hasil uji dan tanggal persetujuan operasional. Nilai/formulasi benefit dan kebijakan expense tidak diubah melalui dokumen serah terima ini.
