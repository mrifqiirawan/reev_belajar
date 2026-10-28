# Upgrade REEV BELAJAR v1.6.0 → v1.7.0

## Tiga perubahan utama

### Hapus siswa permanen

Siswa dan Kelas → **Hapus siswa** kini benar-benar menghapus akun Supabase Auth, profil login, baris siswa, keanggotaan kelas, nilai, riwayat nilai, peserta tugas, kehadiran, bintang, pelanggaran, hati, tautan WhatsApp dan konfirmasi penautan siswa tersebut. Penghapusan berlaku di **seluruh semester**, termasuk semester arsip. Definisi kelas/tugas/pertemuan dan siswa lain tidak dihapus.

Siswa yang dihapus tidak lagi muncul di direktori, ringkasan atau daftar peserta tugas. Penghapusan juga tersedia untuk siswa tanpa akun Auth atau siswa yang sudah dinonaktifkan oleh v1.6.0. Tidak ada penghapusan massal otomatis saat migrasi: siswa nonaktif lama hanya dihapus ketika guru memilih Hapus siswa dan mengonfirmasi.

Dialog meminta NISN yang tepat serta persetujuan bahwa data belajar ikut terhapus. Gunakan **Edit → Aktif** bila hanya ingin menonaktifkan tanpa menghapus. Simpan backup sebelum menggunakan penghapusan pada data asli; CSV rekap bukan backup akun Auth/riwayat lengkap. Penghapusan permanen tidak dapat dipulihkan dengan redeploy source lama.

**Batas retensi:** audit administrasi, catatan idempotensi internal dan log teknis tetap dipertahankan untuk penelusuran tindakan. Ini bukan fitur penghapusan seluruh jejak data pribadi dari audit/backup/chat WhatsApp yang sudah terkirim. Siswa dan data belajarnya di tabel operasional serta akun Auth benar-benar dihapus. Balasan Gateway tersimpan untuk nomor terkait diubah menjadi pemberitahuan data dihapus; event ID tetap dipertahankan agar pesan lama tidak dieksekusi ulang. Pengiriman yang sudah berjalan/terkirim tidak dapat ditarik kembali oleh paket ini.

### Koreksi NISN dan WhatsApp

Koreksi tetap memperbarui `students.nisn` dan email Auth menggunakan API resmi, tanpa mengganti ID siswa. Relasi tugas, nilai, kelas dan tautan WA memakai ID siswa, sehingga tidak memerlukan penggantian NISN pada setiap tabel. Tidak ada tabel NISN lain di source REEV Belajar ini yang perlu disalin ulang.

v1.7.0 membatalkan respons Gateway tersimpan dan konfirmasi lama setelah koreksi, tetap menjaga ikatan nomor terverifikasi ke ID siswa. Perintah daftar menerima spasi tepi, mempertahankan nol di depan, dan membaca NISN terbaru. Pesan kegagalan kini membedakan nomor belum terdaftar, belum terverifikasi, siswa nonaktif, akun nonaktif, dan NISN yang tidak cocok dengan nomor pengirim. Nomor lain tidak mendapat nama/NISN siswa yang dicari.

**Penyebab pesan pada Gateway aktif belum dapat dipastikan dari source ini saja.** Pesan literal “NISN tidak ditemukan” tidak terdapat di fungsi Gateway paket v1.6.0 yang diperiksa. Kemungkinan jalur Gateway/konfigurasi berbeda harus diperiksa, bukan diasumsikan masalah salinan NISN. Paket ini tidak berisi source proses Gateway eksternal Anda dan tidak mengubahnya otomatis.

Setelah deploy:

1. Guru membuka Edit siswa: pastikan Aktif, nomor WhatsApp benar, dan verifikasi nomor dicentang setelah diperiksa. Jangan menghapus nol awal NISN atau mengubah NISN menjadi angka di spreadsheet.
2. Jika profil login sebelumnya dinonaktifkan, pengelola perlu memeriksa profil itu; koreksi NISN tidak otomatis mengaktifkan akses yang dicabut.
3. Siswa mengirim **pesan baru** `.infodaftar NISN_BARU` dari nomor yang terdaftar, kemudian `YA` sesuai instruksi Gateway. Jangan memakai NISN lama atau sekadar mengirim ulang event tersimpan.
4. Perintah `.infodaftar` pada Gateway Functions harus memanggil action `register` ke **`https://DOMAIN_BELAJAR/api/gateway-functions`** milik deployment v1.7.0, dengan secret `REEV_GATEWAY_FUNCTION_SECRET` yang sama. Jangan mengarahkannya ke deployment REEV lama.
5. Pastikan `SUPABASE_URL` server Vercel menunjuk project yang sama dengan `VITE_SUPABASE_URL` frontend. Jika Gateway memakai koneksi database langsung/adapter lokal, URL Supabase Gateway juga harus sama. Jangan membagikan service key dalam chat.
6. Uji `.infodaftar` dan profil dari nomor siswa asli. Bila masih muncul pesan lama, periksa rule/handler Gateway yang menangani `.infodaftar` dan log endpoint. Jangan menjalankan dua auto-responder sekaligus. Integrasi Functions mempertahankan mekanisme pricing/signature yang ada.

### Siswa baru otomatis mengikuti tugas kelas

Siswa baru melalui formulir **atau CSV** otomatis mendapat peserta tugas berstatus `Belum` untuk seluruh tugas formatif/sumatif yang sudah ada pada **kelas dan semester keanggotaannya**, selama semester belum diarsipkan dan siswa aktif. Tidak ada nilai nol otomatis. Nilai/status yang sudah tersimpan tidak ditimpa.

Migrasi juga menambahkan peserta tugas yang terlewat bagi siswa aktif yang sudah ada. Tugas kelas lain dan semester arsip tidak disentuh. Mengaktifkan kembali siswa menambahkan tugas yang belum tertaut. Memindahkan kelas menambahkan tugas kelas tujuan; peserta/nilai kelas asal tetap dipertahankan sebagai riwayat. Pembuatan tugas baru tetap menargetkan siswa aktif kelas tersebut.

## Langkah pemasangan

1. Backup database aplikasi, Auth dan source v1.6.0 dengan prosedur pengelola yang teruji. Jadwalkan pemasangan ketika tidak ada input siswa/tugas berjalan. Uji pada project terpisah dahulu.
2. Untuk database yang sudah memakai **001–010**, jalankan **hanya** `supabase/migrations/011_student_lifecycle.sql` di Supabase SQL Editor. Jangan ulangi skema 001. Dari v1.5.0 yang baru memakai 001–009, jalankan 010 lalu 011. Instalasi baru: 001–011 berurutan.
3. Deploy seluruh source v1.7.0 ke Vercel, termasuk `api/` dan `server/`. Build `npm run build`, output `dist`. Pertahankan environment sebelumnya. Tidak ada secret baru.
4. Redeploy setelah environment frontend diisi. Build tanpa `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` hanya menghasilkan layar belum dikonfigurasi; jangan menganggapnya deployment aplikasi lengkap.
5. Pastikan `/api/health` menunjukkan versi `1.7.0`, muat ulang browser, dan cocokkan endpoint Gateway seperti bagian di atas.
6. Untuk lokal: `npm ci`, `npm run lint`, `npm test`, `npm run build`, `npm start` dengan `.env` yang sesuai. `npm run dev` Vite saja tidak menjalankan API akun.

**Kompatibilitas:** penghapusan permanen menggunakan operasi baru `purge`. Permintaan `delete` dari UI v1.6.0 ditolak setelah migrasi 011 agar dialog lama yang menjanjikan riwayat disimpan tidak tiba-tiba menghapus data. Selesaikan redeploy dan refresh halaman sebelum menggunakan menu penghapusan.

## Checklist penerimaan

Gunakan data uji, bukan siswa asli untuk pengujian hapus.

- Buat formatif dan sumatif di kelas A, lalu tambahkan siswa A lewat formulir/CSV. Pastikan keduanya tampil berstatus Belum; tugas kelas B tidak ikut.
- Periksa siswa lama yang semula terlewat: tugas ditambahkan, nilai/status yang sudah ada tidak berubah, arsip tidak bertambah.
- Koreksi NISN berawalan nol. Login website memakai NISN baru dan sandi lama; kirim `.infodaftar NISN_BARU` → YA → profil. NISN lama harus ditolak.
- Coba nomor lain, nomor belum diverifikasi, siswa nonaktif, dan NISN duplikat. Harus ditolak tanpa membuka identitas siswa lain.
- Hapus siswa uji yang mempunyai nilai, kehadiran, bintang dan pelanggaran. Periksa siswa hilang dari seluruh menu, akun Auth/profil hilang, data siswa lain/tugas tetap ada, dan sesi lama tidak bisa membaca data melalui RLS.
- Salah ketik NISN atau tidak mencentang persetujuan: tidak boleh menghapus. Guru nonaktif/siswa/anon tidak boleh memanggil operasi istimewa.
- Setelah koneksi putus, muat ulang sebelum mengulangi tindakan. Retry penghapusan yang sama dapat dikonfirmasi melalui catatan internal tanpa menghapus siswa lain. Dialog Edit lama tidak dapat membuat ulang UUID siswa yang telah dihapus.

## Rollback dan kegagalan

Migrasi berada dalam transaksi. Jika SQL gagal, perbaiki penyebabnya sebelum deploy; jangan menjalankan sebagian potongan migrasi. Kegagalan Auth/constraint ketika menghapus akun membatalkan penghapusan operasional dalam transaksi yang sama. Kepemilikan objek Storage eksternal dapat menghalangi penghapusan Auth; paket tidak menghapus objek tersebut otomatis.

Intent lama yang belum selesai dapat menolak operasi berbeda selama maksimal 10 menit. Muat ulang dan ulangi operasi yang sesuai atau tunggu masa intent berakhir. Jangan menghapus penjagaan database secara manual.

Jika frontend bermasalah, source lama dapat dipasang sementara, tetapi tombol hapus v1.6.0 akan ditolak dan fitur permanen tidak tersedia. Biarkan migrasi terpasang sampai pengelola menyiapkan rollback teruji; jangan mencoba membuat ulang fungsi lama di database aktif. Siswa yang sudah dihapus perlu backup teruji untuk dipulihkan. Target tugas yang ditambahkan migrasi tidak dihapus otomatis saat rollback, karena mungkin sudah diisi nilai setelah upgrade.
