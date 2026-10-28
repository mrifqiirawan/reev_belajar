> **Versi terbaru v1.7.0:** ikuti [UPGRADE_v1.7.0.md](UPGRADE_v1.7.0.md). Hapus siswa kini permanen di seluruh semester; migrasi 011 wajib. Keterangan versi lama di bawah adalah referensi historis bila bertentangan.

> **v1.6.0:** baca [UPGRADE_v1.6.0.md](UPGRADE_v1.6.0.md) untuk koreksi NISN, penghapusan akun, migrasi 010, dan panduan terbaru. Untuk instalasi baru jalankan 001–010; upgrade dari v1.5.0 hanya 010.

# Catatan rilis v1.4.0

Untuk upgrade database v1.3.0, ikuti `UPGRADE_v1.4.0.md`: jalankan hanya migrasi 009, aktivasi akun siswa, lalu deploy. Instalasi database kosong memakai 001–009. Petunjuk versi lama di bawah perlu ditambah migrasi 009 dan aktivasi akun tersebut.

> Untuk perubahan v1.1.0 dan integrasi menu custom Gateway, baca [UPGRADE_v1.1.0.md](UPGRADE_v1.1.0.md). Dokumen berikut mempertahankan panduan dasar v1.0.0.

# Instalasi, operasi dan pemulihan

## 1. Prasyarat

Node.js >=22.12.0 <25 (pengujian paket memakai 24.19.0), npm dengan dukungan lockfile v3, Supabase project **baru**, akun Vercel untuk hybrid, serta Gateway v2.7.3 milik Anda. Buat salinan staging Gateway sebelum memasang adapter. Jangan gunakan sesi WA yang sama di dua proses.

## 2. Supabase

1. Buat project baru. Tidak ada perintah drop/reset database lama dalam paket ini.
2. Jalankan `supabase/migrations/001_core.sql` sampai `008_student_gradebook.sql` secara berurutan melalui SQL Editor atau migration runner Anda. Setiap berkas memakai transaksi. Untuk project baru saja; jangan jalankan ulang 001 pada database operasional.
3. Di Authentication, matikan Allow new users to sign up. Aktifkan pengendalian rate limit login yang disediakan Supabase; pembatasan client saja tidak cukup. Atur Site URL dan redirect URL sesuai deployment.
4. Isi `.env` dari `.env.example`. `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` adalah konfigurasi browser publik. `SUPABASE_SERVICE_ROLE_KEY`, `GATEWAY_API_KEY`, dan `WEBHOOK_SECRET` hanya server. Gunakan legacy anon key atau publishable key yang didukung project pada variabel anon. Jangan memakai service key sebagai anon.
5. Buat guru pertama melalui skrip privat di terminal operator. Tambahkan sementara `BOOTSTRAP_EMAIL` dan `BOOTSTRAP_PASSWORD` ke `.env` privat, password minimal 12 karakter, lalu:

```bash
npm ci
npm run bootstrap -- --name "Guru Pengelola" --role teacher
```

6. Hapus BOOTSTRAP_PASSWORD dari environment setelah selesai. Skrip tidak mencetak password. Jika terjadi timeout/kompensasi gagal, periksa UUID pada Auth/profiles/students sebelum mencoba lagi; jangan membuat akun duplikat.
7. Login dan buat semester aktif, kelas dan siswa. Untuk membuat akun siswa, isi sementara email/password yang berbeda, kemudian:

```bash
npm run bootstrap -- --name "Siswa Uji" --role student --nisn 0012345678
```

Akun harus ditautkan ke NISN yang sudah ada; NISN sendiri tidak menjadi password. Pengelola dapat mengganti password lewat Supabase Auth dashboard; sampaikan secara privat. Setelah reset, access token lama mungkin masih berlaku sampai expiry; nonaktifkan profil untuk memblokir akses aplikasi segera jika diperlukan.

8. Verifikasi di hosted: guru membaca/mengubah, siswa A hanya datanya sendiri, siswa B tidak terlihat, anon ditolak, akun nonaktif ditolak, siswa tidak bisa memanggil reev_bot/reev_mutate atau mengubah role. Test embedded bukan pengganti uji Auth hosted.

## 3. Windows

Ekstrak ke folder mana saja, misalnya `D:\Aplikasi Sekolah\REEV-BELAJAR`. `run.bat` menggunakan `%~dp0`; tidak perlu mengubah path proyek. Klik dua kali: script memeriksa Node, membuat `.env` hanya bila belum ada, memasang dependency bila belum tersedia, menjalankan build, server, lalu membuka port dari `.env` setelah health sukses. Default port 3001, host 127.0.0.1.

Jika `.env` baru dibuat, isi dahulu lalu jalankan ulang. Jika port dipakai, server memberi pesan; ubah PORT. Saat upgrade selalu jalankan `npm ci` lagi karena launcher tidak mengecek perubahan lockfile di node_modules lama. Tutup browser tidak menghentikan server. Gunakan Ctrl+C di jendela launcher. Mode ini masih membutuhkan internet ke Supabase dan WhatsApp; PC mati/sleep membuat chatbot berhenti.

`npm run dev` hanya Vite UI development, bukan API webhook; untuk API lokal gunakan build + `npm start`. Menjalankan website lokal **tidak otomatis memulai Gateway**. Jalankan Gateway terpisah dengan service manager/terminalnya, memakai adapter langsung di bawah.

## 4. Vercel hybrid

Push source ke repo privat tanpa `.env`, sessions, node_modules atau backup. Impor project pada Vercel:

- Root: folder `reev-belajar` (atau root setelah isi dipindah ke repo).
- Node: 24.x atau versi kompatibel yang tersedia.
- Install command: `npm ci`; build: `npm run build`; output: `dist`.
- Isi semua env yang diperlukan dari `.env.example`. Abaikan HOST/PORT di Vercel.
- WEBHOOK_SECRET minimal 32 karakter acak dan sama dengan konfigurasi webhook Gateway.
- GATEWAY_URL harus base URL HTTPS Gateway Anda. GATEWAY_API_KEY milik integrasi Gateway, device default `device_primary`.
- Redeploy setiap perubahan variabel VITE_ karena masuk saat build.

Endpoint `/api/health` adalah liveness, bukan bukti koneksi database/WA. `/api/webhook` memakai Web-standard fetch handler dan raw bytes. Uji preview Vercel: HMAC salah ditolak 401, body lebih 64 KiB ditolak 413, waktu event terlalu lama ditolak 400. Deployment protection perlu dikonfigurasi agar Gateway dapat mengakses webhook; jangan melemahkan HMAC.

Gateway dashboard → webhook URL `https://DOMAIN_BELAJAR/api/webhook` → secret yang sama → aktifkan message.received, message.sent, message.delivered, message.failed, device.status. Nonaktifkan auto-responder/fallback yang membalas command belajar agar tidak ada balasan ganda. Hindari sekaligus rule forward_webhook dan global forwarding; deduplikasi tetap melindungi event ganda.

Jalankan Gateway sebagai service di VPS; pairing/QR dilakukan di dashboard Gateway yang diamankan. Token integrasi tidak bisa membaca status perangkat Gateway, sehingga website mendapatkan status melalui event device.status beserta waktunya. Setelah mengaktifkan webhook, lakukan reconnect terencana jika perlu memperoleh event baru; jangan hapus sesi.

## 5. Adapter in-process: lokal atau satu VPS

Jalur ini memakai event langsung dalam **proses Gateway yang sudah ada**, tidak membuka socket Baileys tambahan. Hentikan service Gateway, backup `.env`, `server.ts` dan seluruh DATA_DIR. Di root REEV BELAJAR:

```bash
node scripts/attach-gateway.mjs "/path/ke/REEV_WA_Gateway_v2.7.3"
```

Script memeriksa versi dan anchor source; menolak jika berbeda dan menyimpan `server.ts.before-reev-belajar`. Tidak menimpa `.env` atau sesi. Tambahkan ke `.env` Gateway:

```dotenv
REEV_BELAJAR_ADAPTER=/path/absolut/reev-belajar/server/gateway-adapter.mjs
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=
GATEWAY_DEVICE_ID=device_primary
```

Windows gunakan path absolut dengan `/`, misalnya `D:/Aplikasi Sekolah/reev-belajar/server/gateway-adapter.mjs`. Path ini memang lintas proyek; launcher website sendiri tetap portabel. Dependency REEV BELAJAR harus sudah terpasang dengan npm ci. Shared secret webhook tidak dibutuhkan oleh jalur in-process. **Matikan webhook chatbot** pada Gateway saat memakai adapter; jangan mengaktifkan dua jalur. Adapter mengambil alih pesan masuk untuk command belajar, sehingga rule/fallback gateway biasa tidak dijalankan pada jalur ini.

Di folder Gateway jalankan `npm ci`, `npm run lint`, `npm test`, `npm run build`, lalu start dengan proses yang sudah Anda gunakan. Pengujian regressi ini wajib sebelum mengganti service produksi. Jangan menjalankan gateway produksi kedua saat pengujian. Adapter tidak menyertakan perbaikan akun dibatasi/error 463; itu tetap kondisi transport/account Gateway.

## 6. Website dan Gateway di VPS

Pasang website di `/opt/reev-belajar` milik user service `reev`, `.env` mode 600. Sesuaikan Node path pada `deploy/reev-belajar.service`; jangan menyalin mentah jika Node diinstall melalui nvm. Jalankan npm ci/build dengan user yang berhak. Copy unit ke systemd, daemon-reload, enable/start service. Kelola Gateway dengan unit/PM2 miliknya sendiri dan satu instance.

Gunakan `deploy/nginx.conf.example`, domain sendiri, TLS valid, reverse proxy ke localhost:3001. Konfigurasi contoh adalah HTTP awal; aktifkan sertifikat TLS dan redirect HTTPS sebelum akses publik. Gateway punya reverse proxy/domain dan port lokal tersendiri (default 3000). Firewall hanya SSH dan HTTPS/HTTP yang diperlukan untuk sertifikat; jangan membuka port development/internal. Uji SSH ditutup, reboot, restart, koneksi WA dan backup. Log menggunakan journald/PM2 dengan rotasi sesuai kapasitas disk; jangan mencetak env.

## 7. Backup, restore, upgrade, rollback

Gunakan backup database konsisten lewat connection string privat atau fasilitas backup Supabase. Untuk data aplikasi pada project yang sama:

```bash
pg_dump --format=custom --no-owner --no-acl --schema=public --schema=reev_private --file=reev-app.dump "$DATABASE_URL"
pg_restore --list reev-app.dump
```

DATABASE_URL diisi lewat secret manager/terminal privat; jangan mencantumkan password literal di dokumentasi atau Git. Dump ini mencakup data bisnis dan audit/private idempotency, **tidak** akun Auth, Storage, secret, atau sesi WA. Catat versi migrasi/source. Untuk disaster recovery, sertakan backup Auth yang didukung Supabase dan prosedur resmi pemulihan project; dump public saja tidak cukup untuk project baru karena FK auth.users. Tidak ada Storage yang dipakai aplikasi versi ini.

Backup `.env` terpisah secara terenkripsi dan DATA_DIR Gateway saat service dihentikan agar snapshot konsisten. Beri izin 600/700, jangan taruh di web root atau repo. Verifikasi SHA256 dan `pg_restore --list`; lakukan restore uji di project staging dengan akun Auth yang identitasnya sesuai. Jangan mengeksekusi dump dari sumber tidak dipercaya.

Restore hanya ke lingkungan uji/kosong yang disiapkan operator; hentikan worker, tinjau isi dump, jalankan pg_restore --single-transaction sesuai target. Jangan menambahkan --clean pada database aktif tanpa persetujuan penghapusan dan backup terverifikasi. Sebelum menghidupkan worker hasil restore, jangan kirim outbox historis: tandai queued/sending lama menjadi unknown via SQL operator setelah review. Uji jumlah record, login, RLS, nilai, audit, dan satu koneksi WhatsApp. Uji backup/restore hosted belum dijalankan dalam paket.

Upgrade: hentikan worker, snapshot, pertahankan .env/DATA_DIR, pasang source versi baru, npm ci, migrasi incremental yang memang disediakan, lint/test/build, start staging, lalu produksi. Paket ini adalah fresh install; belum ada migrasi dari INPRO. Rollback aplikasi memakai release sebelumnya; rollback DB mengikuti backup/forward-fix dan tidak menghapus riwayat sembarangan. Lepas adapter dengan mengembalikan server.ts.before-reev-belajar setelah service dihentikan; hapus variabel adapter saja, bukan sesi.

## 8. Troubleshooting

- run.bat tertutup: jalankan dari Command Prompt dan baca error; cek node/npm PATH dan versi.
- npm ci gagal: cek internet, versi Node dan ruang disk. Pertahankan package-lock.json.
- Halaman tidak terbuka: cek PORT/HOST, konflik port dan log. Default 3001, Gateway 3000.
- Login gagal: cek URL/key, signup off, Auth user + profiles, active, RLS. Pastikan service key tidak masuk VITE_.
- Siswa belum terlihat: buat semester aktif dan membership kelas; akun user_id hanya dari bootstrap.
- WhatsApp putus: cek jaringan, proses tunggal, DATA_DIR dan status Gateway. Backup sebelum relink.
- SENT tidak berarti delivered/read. Error 463 atau gagal tidak diatasi dengan retry massal. Uji satu nomor dengan izin penerima.
- Bot diam: periksa event, signature, beda secret, waktu mesin, deviceId, allowlist, resolusi LID, rate limit dan logs. Payload yang tidak dikenali/nomor belum resolved tidak dipaksakan.
- .daftar ditolak: guru harus memverifikasi registered_phone dan siswa aktif, lalu periksa normalisasi +62. Jangan menonaktifkan validasi NISN.
- Outbox sending lama/unknown: periksa log Gateway dan receipt sebelum tindakan manual. Tidak ada retry otomatis karena hasil kirim bisa sudah diterima. Minta pengguna mengirim command baru jika aman; transaksi lama yang telah dikonfirmasi tetap tercatat.
- Sumatif WA: masukkan aspek di website, bukan satu skor scalar lewat chat.
