# Hasil uji v1.7.3 — 29 Oktober 2026

PASS: npm ci --offline; npm run lint; npm test — 89 tes lulus, 0 gagal.
PASS: VITE_SUPABASE_URL=https://example.supabase.co VITE_SUPABASE_ANON_KEY=test-public-key npm run build (compile lokal aplikasi lengkap, bukan koneksi produksi).
PASS: byte CSV memakai escaping tiga kutip; parser membaca NISN/telepon sebagai isi sel dengan kutip literal; tidak ada ekspresi =. Nol awal, nilai 0/null, telepon kosong, nama khusus dan urutan kolom tetap benar. Impor format lama dan baru berhasil serta tidak menyimpan kutip. Rumus/notasi ilmiah/kutip bertingkat ditolak.
PASS: SQL identik dengan v1.7.2, dependency tidak diubah.

File pengguna diperiksa secara lokal: v1.7.2 memiliki kutip pembatas CSV yang hilang setelah parsing, bukan kutip literal dalam isi sel. Data pengguna tidak disertakan dalam paket source/fixture.
Warning: bundle 508.79 kB melebihi ambang 500 kB; build berhasil.
NOT_RUN: Excel desktop, interaksi browser, deployment Vercel, Supabase hosted dan WhatsApp nyata. Tidak mengklaim pengujian produksi.
