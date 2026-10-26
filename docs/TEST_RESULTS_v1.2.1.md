# Hasil pengujian v1.2.1

Tanggal: 26 Oktober 2026. Source dari ZIP v1.2.0 pengguna. Tidak memakai data atau kredensial produksi.

| Pemeriksaan | Status | Bukti / batas |
|---|---|---|
| Instalasi lockfile | PASS | npm ci --no-audit --no-fund, 31 paket |
| Sintaks dan pemisahan secret | PASS | npm run lint |
| Build React/Vite | PASS | npm run build, 62 modul |
| Seluruh tes | PASS | npm test: 37 lulus, 0 gagal |
| Regresi formulir nilai | PASS | tests/grade-entry.test.mjs: auto Dinilai, pratinjau, nol, desimal, rentang, aspek kosong, feedback-only, pembatalan status |
| Integrasi payload → SQL → baca ulang | PASS | PostgreSQL embedded PGlite: reproduksi bug lama, perbaikan 80 → 90, riwayat angka, rekap, idempotensi, nol dan sumatif |
| RLS, transaksi, pengelolaan tugas | PASS | Tes bawaan dijalankan ulang; tanpa perubahan kebijakan akses |
| WhatsApp | PASS (mock/SQL) | Tes bawaan; bukan pengiriman pesan nyata |
| Migrasi baru | NOT_APPLICABLE | SQL 001–007 tidak berubah |
| Typecheck TypeScript | NOT_APPLICABLE | Proyek JavaScript/JSX |
| Browser nyata, mobile, Auth hosted, deploy Vercel | NOT_RUN | Tidak ada pengujian interaktif maupun akses proyek operasional; ikuti checklist upgrade |

PGlite memakai fixture auth.uid() dan role uji. Ini memverifikasi SQL/RLS lokal, bukan login Supabase hosted, PostgREST, jaringan, atau konkurensi multi-koneksi. Modul grade-entry digunakan langsung oleh handler input, preview dan batch pada main.jsx; tes tidak menjalankan klik DOM. Tidak ada klaim aplikasi sudah diperbarui secara live.
