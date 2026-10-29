# REEV BELAJAR v1.7.1

**Patch ekspor CSV dari v1.7.0:** tersedia CSV untuk Excel dan CSV standar bertanda kutip. Baca `docs/UPGRADE_v1.7.1.md`. Tidak ada migrasi SQL baru; cukup deploy source baru.

Bagian upgrade v1.6.0 → v1.7.0 di bawah tetap berlaku hanya jika migrasi 011 belum terpasang.

## Mulai upgrade

1. Backup database aplikasi dan Auth, lalu baca **docs/UPGRADE_v1.7.0.md**.
2. Database dengan migrasi 001–010: jalankan **hanya `supabase/migrations/011_student_lifecycle.sql`**. Dari v1.5.0: jalankan 010 lalu 011. Instalasi baru memakai 001–011 berurutan.
3. Deploy seluruh source ke Vercel, termasuk `api/` dan `server/`; build `npm run build`, output `dist`. Environment sebelumnya tetap digunakan.
4. Muat ulang browser dan pastikan endpoint Gateway Functions mengarah ke deployment baru serta project Supabase yang sama.

## Perubahan

- **Hapus siswa permanen:** akun Auth/profil, siswa dan data belajarnya di seluruh semester benar-benar dihapus; siswa hilang dari direktori. Konfirmasi NISN dan checkbox wajib. Catatan audit administrasi tetap disimpan.
- **NISN WhatsApp:** respons/konfirmasi lama dibatalkan setelah koreksi; pendaftaran memakai NISN terbaru, dengan pesan status nomor/akun yang lebih jelas.
- **Peserta tugas otomatis:** siswa aktif yang ditambahkan lewat formulir/CSV mendapat tugas formatif/sumatif kelas dan semester yang belum diarsipkan. Migrasi memperbaiki peserta lama yang terlewat tanpa menimpa nilai.
- Pengaturan → Akun & akses tetap khusus Guru Operator.

**Peringatan perubahan perilaku:** untuk menonaktifkan tanpa kehilangan nilai, gunakan Edit → Aktif. Tombol Hapus siswa menghapus data belajar permanen. Penghapusan v1.6.0 yang sekadar menonaktifkan tidak otomatis dijalankan ulang oleh migrasi.

## Menjalankan dan memeriksa

Node >=22.12 <25. Jalankan `npm ci`, `npm run lint`, `npm test`, `npm run build`. Isi `.env` dari `.env.example` melalui konfigurasi privat; `npm start` menjalankan server lokal. Jangan memasukkan service key ke variabel `VITE_`. Nilai VITE harus sudah tersedia saat build agar aplikasi lengkap dibundel.

Framework React/Vite, Supabase Auth/PostgreSQL/RLS dan integrasi Gateway yang sudah ada dipertahankan. Gateway/Baileys tetap berjalan terpisah dari Vercel functions. Source Gateway eksternal tidak disertakan atau dimodifikasi oleh paket ini.

Panduan: `docs/DEPLOY.md`, `docs/ADMIN.md`, `docs/UPGRADE_v1.7.0.md`. Bukti dan batas uji terbaru: **docs/TEST_RESULTS_v1.7.1.md**. Laporan/upgrade versi sebelumnya bersifat historis.

Build dan 87 tes lokal lulus. **Belum dideploy, diuji pada Supabase hosted, atau diuji melalui WhatsApp nyata.** Pesan dari Gateway aktif pengguna tetap perlu dicocokkan dengan endpoint dan konfigurasi pada checklist upgrade.

Batas lama tetap: satu mata pelajaran per database, batch nilai 200 siswa, impor CSV 500 siswa, provisioning akun melalui skrip pengelola. Reset/provisioning siswa tetap memakai sandi awal 123456 sesuai source sebelumnya; siswa perlu menggantinya. Tidak ada data siswa asli, secret operasional atau sesi WA dalam paket.

Pembuat aplikasi: **M. Rifqi Irawan, S.Pd.**
