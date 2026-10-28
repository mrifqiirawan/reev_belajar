# Upgrade REEV BELAJAR v1.5.0 → v1.6.0

## Perubahan

- Siswa dan Kelas → **Koreksi NISN**: Guru Operator aktif dapat mengubah NISN siswa yang sudah mempunyai akun. NISN baru harus 10 digit, termasuk nol di depan. Akun yang sudah tertaut menggunakan NISN baru sebagai login; sandi tidak diubah. Akun lama berbasis email juga beralih ke login NISN setelah dikoreksi.
- **Edit** tetap untuk nama, kelas, telepon dan status siswa. Koreksi NISN dipisahkan agar konsekuensi perubahan login terlihat jelas sebelum disimpan.
- Siswa dan Kelas → **Hapus akun**: ketik NISN untuk konfirmasi. Akun Supabase Auth dan profil login siswa dihapus, siswa dinonaktifkan, tautan WA dilepas. Data siswa, kelas, nilai, kehadiran, bintang, pelanggaran, hati dan riwayat belajar tetap disimpan. Ini bukan fitur penghapusan permanen seluruh data siswa.
- Pengaturan → **Akun & akses** hanya mengambil dan menampilkan Guru Operator. Tidak ada lagi daftar siswa yang berulang di sana.

## Pemasangan pada database yang sudah berjalan

1. Simpan source v1.5.0 dan backup database termasuk data aplikasi serta Auth melalui prosedur pengelola yang sudah digunakan. CSV rekap saja tidak mencakup akun Auth.
2. Uji terlebih dahulu pada project uji terpisah. Jangan sambungkan preview publik ke database sekolah aktif.
3. Pada Supabase SQL Editor dengan hak pengelola database, jalankan **hanya** `supabase/migrations/010_student_account_management.sql` untuk upgrade dari v1.5.0 yang telah memakai migrasi 001–009. Jangan menjalankan ulang migrasi fresh-install pada database aktif. Migrasi 010 membuat tabel privat, RPC privat serta trigger Auth; tidak mengganti NISN atau menghapus akun saat dipasang.
4. Ganti source Vercel dengan isi paket v1.6.0. Sertakan folder `api/`, `server/`, `src/` dan konfigurasi; jangan unggah `dist` saja. Build `npm run build`, output `dist`, Root Directory folder yang berisi `package.json`.
5. Pertahankan environment v1.5.0: `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` di frontend; `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` hanya di server. Nilai URL harus menunjuk project yang sama. Service key tidak boleh memakai awalan `VITE_`.
6. Redeploy Vercel. Untuk server lokal: `npm ci`, `npm run lint`, `npm test`, `npm run build`, lalu `npm start` dengan `.env` lokal. Vite dev server saja tidak melayani endpoint akun.
7. Jalankan checklist penerimaan di bawah sebelum digunakan pada data sekolah.

Instalasi baru memakai migrasi **001–010 secara berurutan**; langkah bootstrap/aktivasi di panduan lama tetap berlaku. Tidak perlu menjalankan aktivasi massal ulang hanya karena upgrade ini.

## Checklist penerimaan hosted

Gunakan akun siswa uji dengan nilai dan kehadiran yang diketahui.

- Login guru → Koreksi NISN → ubah menjadi NISN 10 digit berawalan nol. Periksa login NISN baru dengan sandi lama; NISN lama harus gagal. Pastikan nilai, kelas dan riwayat tetap sama.
- Coba NISN milik siswa lain: harus ditolak; kedua akun tetap dapat login seperti semula.
- Login siswa dan guru nonaktif: endpoint pengelolaan akun harus menolak. Siswa tidak boleh mengubah identitas login langsung lewat API Auth tanpa koreksi yang diotorisasi guru.
- Hapus akun uji: konfirmasi NISN salah harus ditolak. Konfirmasi benar menghapus akun Auth/profil, menonaktifkan siswa, melepas WA, dan menjaga riwayatnya. Sesi lama siswa tidak boleh membaca data aplikasi melalui RLS; token JWT yang sudah terbit tidak otomatis lenyap dari perangkat.
- Pengaturan → Akun & akses tidak menampilkan siswa, tetapi guru dan pengelolaan nomor WA guru tetap tersedia.
- Uji dialog dan tabel pada desktop/ponsel serta jaringan terputus. Status sukses hanya tampil setelah server mengonfirmasi hasil.

## Bila proses gagal atau koneksi terputus

Muat ulang daftar dahulu. Bila NISN/status sudah berubah, tidak perlu mengulangi tindakan. Bila belum berubah, ulangi operasi yang sama. Persiapan akun tersimpan di tabel privat selama 10 menit. Operasi berbeda selama waktu itu ditolak agar dua koreksi tidak saling menimpa. Setelah kedaluwarsa, guru dapat mengajukan koreksi baru. Tidak ada perubahan Auth parsial dari trigger yang gagal: perubahan tabel siswa dan penghapusan profil berjalan dalam transaksi Auth yang sama.

Benturan NISN di tabel siswa ditolak sejak persiapan; benturan email Auth juga dapat menolak perubahan. Jika terus gagal, periksa log Auth, pemasangan migrasi 010, dan email yang sudah dipakai. Jangan mengubah `auth.users` secara manual untuk melewati penjagaan. Akun yang memiliki objek Storage mungkin perlu penanganan kepemilikan Storage oleh pengelola sebelum dapat dihapus; aplikasi ini tidak menghapus objek tersebut secara otomatis.

Jika muncul pesan aktivasi belum selesai, selesaikan provisioning sebelumnya melalui `npm run provision:students`. Untuk siswa nonaktif yang memiliki aktivasi tertunda, pengelola harus memeriksa keadaan Auth dan mengaktifkan siswa yang memang hendak dipulihkan sebelum menjalankan provisioning.

Siswa yang akunnya sudah dihapus tetap tampak sebagai Nonaktif di direktori. Untuk memberi akses lagi secara sengaja, aktifkan siswa lewat Edit lalu jalankan aktivasi akun. Itu membuat akun baru dengan sandi awal sesuai mekanisme provisioning yang sudah ada; akun dan sandi lama tidak dipulihkan.

## Desain dan batas verifikasi

API memvalidasi JWT dengan `getUser`, mengecek role/active dari profil database, lalu menyiapkan intent lewat RPC khusus service_role. RPC mengecek ulang aktor dan target. Auth Admin API resmi memperbarui email atau menghapus user. Trigger Auth hanya menyinkronkan operasi yang cocok dengan intent guru aktif, dan mencatat audit dalam transaksi yang sama. Perubahan NISN langsung pada siswa tertaut tetap ditolak.

Pengujian SQL menggunakan PostgreSQL embedded PGlite, termasuk role `supabase_auth_admin` simulasi. Ini tidak menggantikan uji GoTrue/Supabase hosted, Vercel, email login nyata, browser atau konkurensi multi-koneksi. Status lengkap ada di `TEST_RESULTS_v1.6.0.md`.

Rujukan resmi yang diperiksa 28 Oktober 2026:
- https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid
- https://supabase.com/docs/reference/javascript/auth-admin-deleteuser
- https://supabase.com/docs/guides/auth/managing-user-data

## Rollback

Jika frontend/API bermasalah, redeploy source v1.5.0 dan biarkan migrasi 010 terpasang. Koreksi NISN yang sudah selesai tetap berlaku; v1.5.0 tidak menyediakan tombol koreksi atau hapus akun. Jangan menjalankan migration 009 ulang atau menghapus trigger di database aktif. Membatalkan koreksi NISN dapat dilakukan lewat v1.6.0 dengan NISN lama jika belum dipakai akun lain. Penghapusan akun tidak dapat dibatalkan dengan rollback source. Pemulihan akun lama memerlukan prosedur backup Auth yang teruji; alternatifnya aktivasi akun baru seperti dijelaskan di atas.
