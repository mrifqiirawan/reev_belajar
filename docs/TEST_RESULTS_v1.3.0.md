# Pengujian v1.3.0

26 Oktober 2026 · Node v24.22.1 · React/Vite sesuai lockfile · PostgreSQL embedded PGlite 0.5.9.

| Pemeriksaan | Status | Bukti |
|---|---|---|
| npm ci --no-audit --no-fund | PASS | Instalasi lockfile tanpa mengganti dependency |
| npm run lint | PASS | Sintaks Node dan pemisahan secret |
| npm run build | PASS | 65 modul; build juga dijalankan dengan VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY placeholder agar kode aplikasi lengkap ikut dibundel |
| npm test | PASS | 53 tes, 0 gagal, 0 dilewati |
| Upgrade 001–007 → 008 | PASS | Data students/tasks/grades/task_targets/grade_history/settings sebelum-sesudah identik |
| Error UUID true | PASS | Error direproduksi sebelum migrasi; payload boolean id diterima sesudah migrasi; perubahan settings terbaca ulang |
| Input per siswa lintas tugas | PASS | Payload UI/helper → RPC → SQL → baca ulang, formatif/sumatif, audit old/new, rekap |
| Atomicity dan retry | PASS | Baris invalid membatalkan nilai/history sebelumnya; request sama tidak menggandakan history |
| Konflik dan otorisasi | PASS | Revisi/nilai kedaluwarsa, duplikasi tugas, semester/sasaran salah, anon/siswa/guru nonaktif, semester arsip ditolak |
| Kelengkapan formatif | PASS | Parsial, lengkap, di bawah KKTP, pembatalan status, nilai nol, tanpa tugas |
| Urutan dan pagination | PASS | Nama campuran kapital/spasi; tugas kronologis; 204 tugas terbaca di dua halaman tanpa duplikasi |
| Regresi lama | PASS | Nilai, pengelolaan tugas, ledger, RLS, gateway dengan mock/SQL |
| Browser interaktif/mobile dan Auth/PostgREST hosted | NOT_RUN | Tidak ada sesi uji atau credential proyek nyata; ikuti checklist upgrade |
| Deployment Vercel, pengiriman WhatsApp nyata | NOT_RUN | Paket source, bukan deployment otomatis |
| Typecheck TypeScript | NOT_APPLICABLE | Proyek JavaScript/JSX |

Tes utama baru: tests/gradebook.test.mjs. Tes memakai auth.uid() fixture dan role PostgreSQL untuk allow/deny. PGlite bukan verifikasi Supabase Auth hosted atau konkurensi multi-koneksi. Pemeriksaan konflik menguji perubahan berurutan dari snapshot lama. Build tidak membuktikan interaksi browser; tidak ada klaim seluruh alur live telah diuji. Placeholder build bukan kredensial pengguna dan dist tidak disertakan dalam ZIP.

## Pengujian tambahan revisi CSV
PASS: tests/student-csv.test.mjs (5 pengujian) mencakup kutip wajib, nol awal, alias header, BOM, koma/titik koma, kutip dalam nama, multiline, baris kosong, telepon opsional, NISN pendek, notasi ilmiah/rumus, struktur rusak, duplikat, serta round-trip ekspor/impor identifier. Seluruh suite: 53 lulus. Lint dan build dengan environment publik placeholder berhasil. Build memberi peringatan ukuran chunk sekitar 502 kB, bukan error; dependensi tidak diubah. Pengujian Excel desktop dan klik browser tetap NOT_RUN.
