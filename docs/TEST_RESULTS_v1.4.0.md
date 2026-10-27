# Hasil pengujian v1.4.0

Tanggal: 27 Oktober 2026. Lingkungan: Node lokal, Vite, PostgreSQL embedded PGlite. Data tes sintetis. Tidak menggunakan credential produksi.

| Pemeriksaan | Status | Bukti / batas |
|---|---|---|
| Instalasi lockfile | PASS | npm ci --no-audit --no-fund |
| Sintaks server dan pemisahan secret frontend | PASS | npm run lint |
| Build React/JSX | PASS | npm run build |
| Seluruh suite regresi dan fitur baru | PASS | npm test: 58 tests, 58 pass, 0 fail |
| Login NISN, nol awal, email kompatibel | PASS | student-auth.test.mjs; pemetaan identitas lokal |
| Validasi dan kegagalan update password | PASS | Helper Auth dengan mock; hasil SDK harus sukses sebelum pemberitahuan berhasil |
| Resume provisioning setelah timeout | PASS | Mock SDK; hanya satu createUser, penautan diulang tanpa reset password |
| Auth gagal tidak menautkan siswa | PASS | Mock SDK |
| Migrasi 009 menjaga siswa yang ada | PASS | Perbandingan baris sebelum/sesudah pada PGlite |
| Fungsi provisioning ditolak untuk anon/authenticated | PASS | Role PostgreSQL nyata dalam PGlite |
| Penautan akun salah, duplikat, dan ganti NISN | PASS | Penolakan identitas tidak cocok; retry idempotent; NISN login terlindungi |
| Akses siswa lain dan eskalasi role | PASS | RLS pada role authenticated; siswa A hanya membaca dirinya |
| Siswa/profil nonaktif | PASS | RLS menolak data siswa |
| Regresi nilai, CSV, ledger, gateway | PASS | Suite lama; fixture Auth diperluas dengan kolom email dan app metadata sesuai kebutuhan 009 |
| Login hosted dan sandi lama ditolak setelah perubahan | NOT_RUN | Memerlukan project Supabase uji dan kebijakan Auth aktual |
| Dua proses provisioning bersamaan pada hosted Auth | NOT_RUN | Unique email Auth dan FK/lock penautan dirancang untuk rekonsiliasi; belum diuji multi-koneksi hosted |
| Browser mobile/desktop dan interaksi formulir | NOT_RUN | Tidak ada pengujian UI browser pada sesi ini |
| Vercel/VM live dan WhatsApp nyata | NOT_RUN | Tidak ada akses deployment atau gateway produksi |

Mock SDK bukan bukti layanan Auth hosted berfungsi. PGlite menguji SQL/RLS, bukan kebijakan password, throttling, pengiriman email, atau token Supabase hosted. Pengelola harus menyelesaikan checklist setelah deploy pada panduan upgrade.
