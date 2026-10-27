# Upgrade REEV BELAJAR v1.3.0 → v1.4.0

Rilis ini menambahkan aktivasi akun siswa massal, login NISN, dan Pengaturan → Ganti sandi. Data nilai, kelas, tugas, kehadiran, bintang, hati, serta integrasi WhatsApp tetap memakai struktur dan identitas lama.

## Perilaku akun

| Kondisi | Perilaku |
|---|---|
| Siswa aktif tanpa akun | Skrip aktivasi membuat akun dengan NISN dan sandi awal `123456` |
| Siswa sudah memiliki akun | Akun, email, sandi dan status profil dipertahankan; login memakai email lama |
| Siswa/profil nonaktif | Tidak mendapatkan akses data siswa melalui RLS; aktivasi massal tidak mengaktifkan kembali akun |
| Siswa baru dari input atau CSV | Jalankan kembali `npm run provision:students` setelah data tersimpan |
| Sandi sudah diganti | Aktivasi ulang tidak mengubahnya |
| Koneksi terputus saat aktivasi | Jalankan ulang; akun yang dibuat proses ini dikenali lewat metadata server dan ditautkan kembali |

Aktivasi tidak berjalan otomatis hanya dengan mengunggah source ke Vercel. Pengelola perlu menjalankan skrip privat setelah migrasi. Semua siswa aktif yang belum punya akun diproses menggunakan halaman data 100 siswa dan request Auth berurutan. Siswa tetap membutuhkan keanggotaan kelas/semester agar data pembelajarannya muncul.

## 1. Persiapan

1. Cadangkan database dan akun Auth melalui prosedur backup Supabase yang digunakan sekolah. Ekspor CSV siswa bukan backup lengkap. Simpan source v1.3.0 untuk rollback.
2. Ekstrak ZIP v1.4.0 ke folder baru. Gunakan Node.js sesuai `package.json`, minimal 22.12 dan di bawah 25.
3. Pertahankan project Supabase produksi yang sama. Jangan membuat database kosong atau menghapus tabel.
4. Matikan pendaftaran publik di Supabase Auth. Akun siswa dibuat oleh pengelola, bukan lewat signup.
5. Sandi awal yang diminta adalah enam digit. Kebijakan password Supabase harus menerima panjang 6 dan tidak mewajibkan kombinasi karakter yang menolak `123456`. Jika proteksi sandi bocor menolaknya, aktivasi akan gagal dengan pesan Auth. Jangan menganggap akun sudah dibuat jika ada kegagalan. Kebijakan ini berlaku pada project, bukan hanya siswa. Sandi bersama mudah ditebak; distribusikan akses secara terkontrol dan arahkan siswa segera menggantinya.
6. Alamat teknis `NISN@siswa.reev.invalid` hanya identitas Auth, bukan kotak email. Reset sandi lewat email tidak tersedia untuk akun tersebut. Pengelola menangani lupa sandi secara privat setelah memverifikasi siswa. Jangan mengaktifkan konfirmasi perubahan sandi via email/nonce untuk akun tanpa mailbox sebelum menyediakan jalur pemulihan yang cocok.

## 2. Migrasi database

Untuk database v1.3.0 yang sudah menerapkan 001–008, buka SQL Editor Supabase dan jalankan **hanya**:

```text
supabase/migrations/009_student_accounts.sql
```

Migrasi membuat fungsi penautan khusus `service_role` dan pelindung perubahan NISN akun baru. Tidak ada reset, penghapusan data, atau penggantian sandi massal. NISN yang sudah menjadi identitas login tidak dapat diedit melalui formulir biasa. Koreksi NISN memerlukan penyesuaian terkoordinasi oleh pengelola pada data siswa dan email Auth; jangan menonaktifkan pelindung hanya untuk melewati pesan error.

Untuk instalasi baru gunakan 001–009 berurutan. Untuk versi lebih lama, terapkan migrasi yang belum dijalankan secara berurutan. Jangan menjalankan ulang 001 pada database operasional.

## 3. Siapkan environment privat

Salin `.env.example` menjadi `.env` di folder aplikasi dan isi nilai project yang sama:

```dotenv
VITE_SUPABASE_URL=https://PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=ISI_KUNCI_PUBLIK
SUPABASE_URL=https://PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=ISI_KUNCI_SERVICE_ROLE
```

Pertahankan konfigurasi gateway dari versi sebelumnya. Jangan mengirim `.env` ke orang lain atau memasukkannya ke Git. `SUPABASE_SERVICE_ROLE_KEY` hanya untuk server/komputer pengelola, tanpa awalan `VITE_`.

## 4. Aktifkan seluruh siswa

Jalankan terminal dari folder yang memuat `package.json`:

```bash
npm ci
npm run provision:students
```

Tunggu ringkasan akhir. Setiap keberhasilan dilaporkan dengan UUID siswa, tanpa sandi/token. Jika ada kegagalan, periksa penyebabnya, lalu jalankan perintah yang sama lagi. Proses menghasilkan exit code 1 bila ada siswa gagal. Akun tertaut sebelumnya tidak diproses ulang dan sandinya tidak direset.

Jika Auth berhasil dibuat tetapi penautan gagal/timeout, jangan langsung menghapus akun. Jalankan ulang agar proses merekonsiliasi akun lewat metadata server `reev_student_id`. Benturan dengan akun email yang bukan dibuat proses ini ditolak dan perlu diperiksa pengelola. Jika email Auth atau NISN diubah manual di tengah aktivasi, hentikan perubahan dan rekonsiliasi sebelum mengulang.

Untuk siswa yang diimpor kemudian, cukup jalankan kembali perintah ini. Siswa nonaktif sengaja dilewati.

## 5. Build dan deploy

```bash
npm run lint
npm test
npm run build
```

Deploy seluruh source ke project Vercel REEV Belajar yang sama. Gunakan pengaturan Vite: Build `npm run build`, Output `dist`. Pertahankan environment publik dan server yang sudah ada. Jangan hanya mengunggah `dist` bila endpoint WhatsApp digunakan.

Jika memakai VM, tempatkan source baru sesuai `WorkingDirectory` service yang benar, isi `.env`, jalankan build, lalu restart service REEV Belajar sesuai konfigurasi server. Paket ini tidak mengubah service Gateway.

## 6. Cara siswa login dan mengganti sandi

1. Buka web REEV Belajar v1.4.0.
2. Isi **NISN siswa / Email guru** dengan NISN lengkap, termasuk nol di depan.
3. Isi sandi awal **123456**, lalu pilih **Masuk**.
4. Buka **Pengaturan → Ganti sandi**.
5. Isi sandi baru minimal 8 karakter dan konfirmasinya. Kebijakan Supabase yang lebih ketat tetap berlaku.
6. Klik **Simpan sandi baru**. Tunggu pesan berhasil.
7. Keluar, kemudian login ulang dengan NISN dan sandi baru. Pastikan sandi lama tidak lagi bisa login.

Ganti sandi menggunakan Supabase Auth. Aplikasi tidak menyimpan password pada tabel siswa, profil, atau audit. Pengaturan siswa hanya menampilkan formulir sandi; pengaturan sekolah, akun lain, dan WhatsApp tetap untuk guru. Ganti sandi tidak diklaim mencabut seluruh access token yang sudah terbit. Tombol Keluar mengakhiri sesi perangkat ini.

## 7. Pemeriksaan setelah deploy

- Uji akun siswa A dan B: masing-masing hanya melihat nilai, kehadiran, bintang, dan hati miliknya.
- Uji login NISN dengan nol awal dan login email guru.
- Uji ganti sandi, konfirmasi tidak cocok, sandi terlalu pendek, dan login ulang.
- Uji siswa nonaktif tidak memperoleh data pribadi. Supabase Auth mungkin masih menerima kredensial, tetapi RLS menolak data operasional.
- Jalankan aktivasi dua kali: jumlah akun tidak bertambah untuk siswa yang sudah tertaut dan sandi baru tetap berlaku.
- Uji setelah impor siswa baru: jalankan aktivasi, lalu login siswa tersebut.
- Pastikan menu guru, input nilai, CSV, dan WhatsApp masih berjalan.

## 8. Rollback

Jika frontend bermasalah, deploy ulang source v1.3.0 tanpa menghapus akun atau menjalankan restore yang menimpa data baru. Migrasi 009 bersifat tambahan dan dapat dibiarkan. Frontend lama hanya menerima email, sehingga akun baru perlu memasukkan `NISN@siswa.reev.invalid` sebagai identitas login sementara. Fitur ganti sandi tidak tersedia di frontend lama. Jangan hapus akun Auth secara massal; profil dan siswa memiliki relasi FK ke akun.

## Batas verifikasi

Source, build, dan tes lokal telah diperiksa. Login/ganti sandi Supabase hosted, pengiriman WhatsApp nyata, tampilan browser/perangkat, serta deploy Vercel belum dijalankan dalam pengerjaan paket ini. Lihat `docs/TEST_RESULTS_v1.4.0.md`.
