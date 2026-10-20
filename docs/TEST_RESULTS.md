# Bukti pengujian — 13 Oktober 2026

Environment: Linux container, Node.js 24.19.0, npm 11.9.0; versi dependency final pada lockfile. Tidak ada secret hosted, akun WhatsApp atau data siswa asli dipakai sebagai fixture.

| Pemeriksaan | Hasil | Bukti / cakupan |
|---|---|---|
| Instalasi reproducible | PASS | npm ci --ignore-scripts --no-audit --no-fund; lockfile final |
| Pemeriksaan source | PASS | npm run lint; sintaks Node dan larangan referensi secret server pada src |
| Build frontend | PASS | npm run build; Vite 8.3.4, 61 modul, JS ~244 kB / gzip ~77 kB |
| Unit + PostgreSQL | PASS | npm test; 17 test terhitung oleh Node, 0 gagal |
| Rumus | PASS | NULL vs 0, denominator kosong, rubrik berbobot, skor invalid |
| CSV | PASS | NISN nol awal, nomor invalid, duplikat file, SQL batch rollback |
| RLS | PASS lokal | Role anon/authenticated/service_role pada PGlite; guru, siswa sendiri, siswa lain, nonaktif, perubahan role ditolak |
| Nilai & audit | PASS lokal | Nol valid, histori atomik, request idempotent, batch invalid rollback |
| Bintang/hati | PASS lokal | Hati awal wajib, -1 per pelanggaran, restore +1, koreksi sekali, reverse bintang sekali |
| Kehadiran | PASS lokal | Anggota sah diterima, siswa di luar target ditolak |
| WhatsApp command | PASS lokal | Nomor salah tidak tertaut; NISN lain ditolak; event duplikat; token sekali pakai/kedaluwarsa; allowlist dicabut |
| Webhook | PASS lokal | Raw-body HMAC, sender mismatch, timestamp lama, kelompok diabaikan, Web-standard handler 401/400/413 |
| Receipt/outbox | PASS lokal | Claim sekali; receipt READ lebih awal tetap READ sesudah hasil send; tidak turun ke SENT |
| Smoke server lokal | PASS | GET /, /tugas dan /api/health =200; POST webhook tanpa signature =401 pada port uji 3127 |
| Audit dependency runtime | PASS snapshot | npm audit --omit=dev --json: 0 advisori runtime pada waktu pemeriksaan; bukan jaminan kerentanan nihil |
| Instalasi adapter Gateway | PASS lokal | attach-gateway.mjs pada salinan v2.7.3, backup dibuat, anchor dan versi diverifikasi |
| Regresi Gateway sesudah patch | PASS | npm run lint, npm test (29 test, 0 gagal), npm run build pada salinan Gateway |
| Gateway + adapter aktif ke DB hosted | NOT_RUN | Regresi Gateway memakai fixtures/mocks bawaan, bukan bukti branch adapter aktif dengan Supabase |
| Auth/PostgREST/RLS Supabase hosted | NOT_RUN | Tidak tersedia project/akun uji; emulasi auth.uid dan roles pada PGlite bukan hosted Auth |
| Konkurensi banyak koneksi SQL | NOT_RUN | PGlite embedded tidak membuktikan race multi-connection; constraint dan advisory lock tersedia |
| UI browser/mobile/keyboard nyata | NOT_RUN | Build berhasil; belum ada sesi browser yang dipakai untuk uji alur autentikasi dan layout |
| Windows run.bat | NOT_RUN perangkat | Script ditinjau; lingkungan pengujian Linux, bukan Windows |
| Vercel deploy/preview runtime | NOT_RUN | Handler diuji sebagai Request/Response lokal, bukan deployment Vercel |
| WhatsApp pairing/pesan/receipt nyata | NOT_RUN | Tidak memakai akun atau sesi pengguna |
| Backup/restore hosted, VPS reboot | NOT_RUN | Prosedur disediakan, perlu lingkungan staging dan akses operator |
| Multi-tenant | NOT_APPLICABLE | Satu mata pelajaran per project database sesuai scope v1 |
| Storage/kamera di website | NOT_APPLICABLE | Tidak ada upload dokumen/kamera website; pairing dilakukan di Gateway |

Perbaikan saat pengujian: referensi parameter message_id pada SQL receipt ambigu diselesaikan dengan kualifikasi fungsi/constraint; perbandingan floating point memakai toleransi; role siswa nonaktif juga diperiksa dalam penautan/baca WhatsApp. Semua hasil PASS di atas merujuk source final, bukan hasil percobaan yang sebelumnya gagal.

## Uji penerimaan sebelum data produksi

1. Terapkan migrasi pada Supabase staging; jalankan flow signup-off, bootstrap, login, nonaktif/logout dan dua siswa dengan UUID berbeda.
2. Buat semester, kelas, CSV sintetis, formatif (0 dan kosong), sumatif multi-aspek, batch koreksi, pertemuan, bintang, dan pelanggaran/pemulihan. Bandingkan rekap setelah refresh/perangkat lain.
3. Pilih satu jalur WA. Uji .daftar cocok/tidak, .profil sendiri/NISN lain, guru preview → konfirmasi, ulangi event/token. Periksa audit dan receipt.
4. Uji jaringan putus saat simpan/kirim, token kedaluwarsa, status unknown dan larangan retry otomatis.
5. Uji browser lebar ponsel/desktop, fokus modal, tombol Keluar, CSV besar, port Windows dengan spasi, VPS restart dan restore staging.

Paket belum dinyatakan lolos penerimaan produksi sampai pemeriksaan NOT_RUN yang relevan selesai.
