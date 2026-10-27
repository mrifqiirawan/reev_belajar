# Upgrade v1.4.0 ke v1.5.0

Fitur baru: guru/admin dapat mereset sandi siswa melalui menu Siswa dan Kelas. Dalam aplikasi ini akun pengelola menggunakan role `teacher` dan harus aktif.

## Pemasangan Vercel

1. Gunakan source v1.5.0 lengkap, termasuk folder api dan server.
2. Di project Vercel, isi environment server `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` untuk environment deployment yang digunakan. Gunakan project Supabase yang sama dengan `VITE_SUPABASE_URL`. Jangan menambahkan awalan VITE_ pada service role key.
3. Pertahankan environment lainnya dan Build Command `npm run build`, Output Directory `dist`.
4. Deploy ulang agar endpoint dan environment baru tersedia.

Tidak ada migrasi SQL tambahan dari v1.4.0. Database harus sudah menerapkan 001–009. Bila masih v1.3.0, ikuti UPGRADE_v1.4.0.md dahulu, termasuk aktivasi siswa. Reset tidak membuat akun siswa baru.

## Cara reset

1. Login sebagai guru/pengelola aktif.
2. Buka Siswa dan Kelas, cari siswa.
3. Klik Reset sandi pada baris siswa.
4. Periksa nama dan NISN, kemudian ketik NISN lengkap untuk konfirmasi.
5. Klik Reset menjadi 123456 dan tunggu pemberitahuan berhasil.
6. Beri tahu siswa agar login dengan identitas akun yang sudah digunakan dan sandi 123456, lalu menggantinya melalui Pengaturan.

Akun lama yang menggunakan email tetap menggunakan email. Akun NISN tetap memakai NISN. Status aktif akun tidak berubah oleh reset. Siswa yang belum memiliki akun akan mendapat pesan untuk aktivasi dahulu.

Kebijakan password Supabase harus mengizinkan sandi awal 123456. Jika kebijakan menolaknya, endpoint menampilkan kegagalan dan tidak mengklaim berhasil. Reset tidak diklaim langsung mencabut access token yang telah terbit. Audit menyimpan aktor dan ID akun/siswa, tanpa sandi. Bila reset berhasil tetapi audit gagal, UI memberitahukannya; tidak perlu mengulang reset hanya untuk mencatat audit.

## VM dan pengujian

Server lokal produksi juga menyediakan endpoint yang sama melalui `npm start` setelah build. `npm run dev` hanya menjalankan Vite, sehingga pengujian reset memerlukan server lokal produksi atau deployment Vercel.

Uji sebagai guru aktif, siswa, dan akun guru nonaktif. Uji NISN konfirmasi salah, siswa tanpa akun, serta login ulang setelah reset. Akun siswa harus gagal memakai sandi sebelumnya dan berhasil memakai 123456. Pengujian layanan Supabase dan Vercel live perlu dilakukan pada deployment Anda.

Rollback: deploy kembali source v1.4.0. Akun yang sudah direset tetap menggunakan sandi hasil reset; rollback source tidak mengembalikan sandi lama.
