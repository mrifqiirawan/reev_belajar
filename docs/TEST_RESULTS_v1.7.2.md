# Hasil uji v1.7.2 — 29 Oktober 2026

PASS: npm ci --offline; npm run lint; npm test (87 lulus, 0 gagal).
PASS: build aplikasi lengkap dengan VITE_SUPABASE_URL=https://example.supabase.co dan VITE_SUPABASE_ANON_KEY=test-public-key, npm run build. Nilai ini hanya untuk compile lokal, bukan koneksi produksi.
PASS: format mentah header tanpa kutip, identifier dengan kutip, field umum tanpa kutip, telepon kosong, null vs nol, BOM, CRLF, nama khusus dan urutan kolom berbeda, round-trip impor tiga kolom, penolakan identifier rusak/rumus, netralisasi formula nama, ekspor kosong dengan header.
PASS: semua file SQL sama dengan v1.7.1. Dependency tidak diubah.

Warning build: bundle utama sekitar 508.64 kB melebihi ambang 500 kB; tidak menghalangi build. Tidak ada klaim optimasi bundle pada patch ini.
NOT_RUN: interaksi browser, Excel desktop, deployment Vercel, Supabase hosted, WhatsApp nyata. Tes lokal bukan bukti integrasi produksi.
