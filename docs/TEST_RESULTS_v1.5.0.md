# Hasil uji v1.5.0

27 Oktober 2026: npm run lint PASS; build Vite dengan konfigurasi publik placeholder PASS; npm test 67 tes lulus, 0 gagal.

Tes tambahan memeriksa penolakan siswa, guru nonaktif, token tidak valid, target akun guru, siswa tanpa akun, parameter tidak valid, reset berotorisasi, kegagalan Auth, dan kegagalan audit. Tes endpoint menggunakan mock SDK; suite SQL/RLS sebelumnya menggunakan PGlite. Tidak ada password pada payload audit.

NOT_RUN: Supabase Auth hosted, login setelah reset pada layanan nyata, UI browser, dan deploy Vercel/VM. Periksa kebijakan password pada project sebelum penggunaan. Build bukan bukti deploy berhasil.
