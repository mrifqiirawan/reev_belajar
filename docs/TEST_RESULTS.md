# Hasil uji REEV Belajar v1.1.0

Tanggal: 19 Oktober 2026. Runtime lokal Node 24.19.0; PostgreSQL embedded PGlite. Data tes sintetis.

| Pemeriksaan | Status | Bukti / lingkup |
|---|---|---|
| `npm test` | PASS | 28 tes, 0 gagal |
| `npm run lint` | PASS | Pemeriksaan syntax Node dan pemisahan secret frontend |
| `npm run build` | PASS | Vite 8.3.4 |
| Regresi RLS, nilai nol/NULL, rubrik, transaksi, ledger dan bot lama | PASS | tests/database.test.mjs dan tests/domain.test.mjs |
| Migrasi 006 pada database versi sebelumnya | PASS | NISN, nilai nol, identitas dan tautan lama dipertahankan |
| Nomor salah, NISN nol awal, preview tanpa tautan, YA/expiry | PASS | tests/gateway-functions.test.mjs |
| Perubahan verifikasi saat pending, pembatalan, unlink | PASS | Challenge dibatalkan / konfirmasi ditolak |
| Akses akademik hanya pemilik, argumen identitas lain ditolak | PASS | Enam fungsi akademik dan akun nonaktif |
| Idempotensi/replay dan payload event berbeda | PASS | RPC mempertahankan hasil per event; payload berbeda ditolak |
| RPC/tabel baru tidak dapat diakses anon/authenticated langsung | PASS | Role nyata dalam PostgreSQL embedded |
| Endpoint HMAC, timestamp, batas body, metode dan action | PASS | Request Web API dengan backend RPC fixture |
| Guard command siswa lama | PASS | Siswa tidak dapat menggunakan wrapper legacy guru |
| Status tautan di view website | PASS | Query sebagai guru authenticated |
| Supabase hosted/Auth hosted dan migrasi produksi | NOT_RUN | Tidak ada akses produksi yang digunakan |
| Visual browser dan sinkronisasi realtime | NOT_RUN / NOT_APPLICABLE | Status dimuat ulang melalui Segarkan; tidak menjanjikan realtime push |
| WhatsApp nyata dan deploy Vercel/VPS | NOT_RUN | Perlu verifikasi setelah pemasangan |

Tes SQL embedded tidak membuktikan konfigurasi Supabase hosted, networking, Auth hosted, atau transaksi multi-koneksi pada deployment produksi. Ikuti docs/UPGRADE_v1.1.0.md dan panduan lengkap Gateway sebelum aktivasi.
