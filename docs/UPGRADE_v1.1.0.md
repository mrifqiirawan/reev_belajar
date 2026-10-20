# REEV Belajar v1.1.0 — pendamping Gateway v2.8.0

Gunakan panduan lengkap `PANDUAN_UPDATE_v2.8.0.md` dalam folder Gateway pada paket upgrade.

## Instalasi yang sudah memakai v1.0.0

1. Backup database/source/environment terlebih dahulu.
2. Jalankan hanya `supabase/migrations/006_gateway_functions.sql` di project Supabase Belajar yang sama.
3. Pertahankan environment lama. Tambahkan `REEV_GATEWAY_FUNCTION_SECRET` minimal 32 karakter; nilainya sama dengan `BELAJAR_FUNCTION_SECRET` di Gateway.
4. Salin source baru, jalankan `npm ci`, `npm test`, `npm run lint`, `npm run build`, lalu redeploy/restart target hosting yang sudah digunakan.
5. Pastikan `/api/gateway-functions` dapat dijangkau melalui HTTPS publik. Setiap request tetap memerlukan HMAC valid dan timestamp maksimal selisih lima menit.
6. Daftarkan/verifikasi nomor siswa melalui direktori siswa, kemudian uji `.infodaftar NISN` → `YA` → `.infoprofil` dari nomor siswa tersebut.

Untuk project Belajar kosong, jalankan migrasi 001–006 berurutan, lalu ikuti bootstrap/admin/deploy pada dokumen instalasi. Jangan jalankan skema fresh-install pada project yang sudah berisi data.

## Perubahan

- Endpoint function menghasilkan respons JSON untuk Gateway; endpoint ini tidak mengirim WhatsApp sendiri, sehingga penagihan dan pengiriman dikoordinasikan Gateway.
- Fungsi tersedia: register, confirm, cancel, profile, tasks, grades, stars, hearts, attendance.
- Registrasi menggunakan NISN teks dan nomor yang sudah diverifikasi guru. Konfirmasi berlaku lima menit, terikat nomor dan siswa, dan diperiksa ulang sebelum menulis tautan.
- Tampilan direktori siswa menunjukkan status tertaut dan tanggal tautan setelah data dimuat ulang.
- Custom endpoint tidak membuat akun web atau memberi akses data siswa lain. Login Supabase Auth web tetap mengikuti sistem lama.
- Jika secret baru aktif, webhook lama memakai RPC khusus guru yang memeriksa allowlist/profil aktif. Siswa tidak dapat mengakses perintah lama untuk menghindari biaya point. Guru dapat tetap menggunakan command lama ketika Gateway meneruskannya.
- `.batal` custom membatalkan konfirmasi penautan serta konfirmasi lama milik nomor yang sama.
- Source `scripts/attach-gateway.mjs` adalah adapter lama yang hanya diaudit untuk Gateway v2.7.3; jangan jalankan pada Gateway v2.8.0. Integrasi baru memakai HTTPS endpoint di atas.

## Data dan akses

Migrasi tidak mengubah nilai atau NISN lama. Tabel baru `gateway_link_pending` dan `gateway_function_events` hanya diakses service role. Eksekusi RPC baru juga dibatasi service role. View `student_summary` tetap security invoker dan memakai kebijakan baca lama. Nomor terverifikasi harus cocok saat preview, konfirmasi, dan setiap pembacaan akademik. Perubahan verifikasi/NISN/status membatalkan challenge yang masih berjalan.

## Rollback

Kembalikan source dan lockfile sebelumnya lalu build/deploy. Tabel tambahan dapat dipertahankan; jangan hapus data siswa/akun/tautan. Lihat panduan Gateway untuk mengembalikan bot lama. Pengujian lokal dijelaskan dalam `docs/TEST_RESULTS.md`.
