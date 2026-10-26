# REEV BELAJAR v1.3.0

**Revisi CSV (tetap v1.3.0):** NISN/telepon wajib berkutip, NISN 10 digit, alias PHONE_REGISTERED diterima, ekspor berkutip. Baca `docs/CSV_SISWA.md`. Tidak ada migrasi tambahan setelah 008.

Pembuat aplikasi: **M. Rifqi Irawan, S.Pd.**

**Upgrade dari v1.2.0/v1.2.1:** jalankan hanya `supabase/migrations/008_student_gradebook.sql`, kemudian deploy source v1.3.0. Panduan: `docs/UPGRADE_v1.3.0.md`. Jangan reset database atau menjalankan ulang migrasi lama.

**Dari v1.1.0:** terapkan 007 dahulu, kemudian 008. Instalasi database kosong memakai 001–008 berurutan.

**Fitur baru:** Rekap Nilai → Isi semua tugas per siswa, urutan nama A–Z, ketuntasan formatif berdasarkan kelengkapan nilai, dan perbaikan Edit Pengaturan.


Aplikasi satu mata pelajaran untuk guru dan siswa sesuai PRD REEV BELAJAR 1.0.0. Nama mapel dapat diubah di Pengaturan. Paket source baru, bukan update langsung database INPRO atau Gateway.

**Arsitektur:** React/Vite di Vercel; Supabase Auth/PostgreSQL/RLS; Gateway Baileys v2.7.3 tetap hidup di VPS/Windows. Baileys tidak dijalankan di function serverless.

## Mulai di sini

1. Baca `docs/DEPLOY.md`: buat project Supabase baru, terapkan migrasi 001–008 berurutan, matikan signup publik, bootstrap guru.
2. Salin `.env.example` ke `.env` dan isi nilai lokal. Jangan mengirim secret melalui chat atau commit.
3. Node >=22.12 <25; jalankan `npm ci`, `npm run lint`, `npm test`, `npm run build`.
4. Windows: klik `run.bat`. Linux/macOS: `npm start`, lalu http://localhost:3001. Vercel memakai source + `api`, build output `dist`.
5. Login → Pengaturan → semester aktif + aturan hati → kelas → siswa/CSV → tugas → input nilai/kehadiran.
6. Pilih **salah satu** integrasi WA: webhook HTTPS untuk hybrid, atau adapter langsung pada Gateway untuk lokal. Baca panduan sebelum menautkan akun.

## Isi paket

- `src/`: tujuh menu responsif, login guru/siswa, terang/gelap, formulir, impor/ekspor CSV, batch nilai/kehadiran.
- `supabase/migrations/`: skema, RLS, transaksi, audit, chatbot dan receipt.
- `server/`, `api/`: API webhook tervalidasi, server lokal, adapter in-process.
- `scripts/`: bootstrap akun, pemasangan adapter, launcher Windows dan pemeriksaan source.
- `tests/`: rumus, keamanan event, transaksi dan RLS pada PostgreSQL embedded.
- `docs/`: audit, arsitektur, panduan admin, pemasangan dan matriks penerimaan.

## Status rilis

Source, migration, build dan pengujian lokal disertakan. **Belum dideploy atau diuji dengan Supabase hosted/WhatsApp nyata.** Detail bukti dan batas ada di `docs/TEST_RESULTS_v1.3.0.md`. Ini bukan klaim siap produksi tanpa konfigurasi dan uji penerimaan lingkungan Anda.

Batas eksplisit: input batch maksimum 200 siswa; impor CSV 500 siswa; satu mapel per database; perintah nilai WhatsApp hanya formatif, sumatif diisi melalui rubrik website; bootstrap akun lewat skrip operator privat; Gateway tidak disertakan ulang karena ZIP referensi tidak memiliki LICENSE. Tidak ada data siswa asli, secret, sesi WA, atau password bawaan dalam paket.
