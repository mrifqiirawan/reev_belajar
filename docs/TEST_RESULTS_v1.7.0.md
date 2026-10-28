# Verifikasi v1.7.0 — 28 Oktober 2026

| Pemeriksaan | Status | Bukti dan batas |
|---|---|---|
| Instalasi | PASS | `npm ci`; versi dependensi sama dengan v1.6.0 |
| Sintaks server dan pemisahan secret | PASS | `npm run lint` |
| Seluruh tes | PASS | `npm test`: 84 tes, 0 gagal |
| Build aplikasi terkonfigurasi | PASS | `VITE_SUPABASE_URL=https://example.supabase.co VITE_SUPABASE_ANON_KEY=test-public-key npm run build`; placeholder publik, bukan credential. Bundle aplikasi penuh terkompilasi. Warning ukuran chunk >500 kB dicatat; bukan error build. |
| Backfill incremental 010 → 011 | PASS | Target yang hilang ditambahkan; status Dinilai dan nilai 85 tidak berubah; kelas lain/arsip/nonaktif tidak ikut |
| Formulir dan CSV | PASS | RPC aplikasi dengan role guru; peserta formatif/sumatif otomatis, edit berulang tidak menggandakan, CSV invalid rollback |
| Reactivasi/pindah kelas/tugas baru | PASS | Peserta baru ditambahkan sesuai kelas; riwayat asal dipertahankan |
| NISN hingga Gateway | PASS | PostgreSQL embedded: prepare koreksi → simulasi Auth update → register baru → confirm → profile memakai NISN baru |
| Pembatalan cache lama | PASS | Event daftar lama menjadi tidak berlaku; event baru memakai NISN terbaru, termasuk nol awal dan spasi tepi |
| Penolakan nomor lain | PASS | Respons tidak membocorkan nama/NISN target |
| Penghapusan permanen | PASS | Auth/profil/siswa hilang; seluruh tabel belajar terkait dan pending WA bersih; siswa lain/tugas tetap |
| Atomisitas penghapusan | PASS | Simulasi rollback transaksi Auth memulihkan siswa/nilai; commit menghapus keduanya |
| Hak akses | PASS | Anon, siswa dan guru browser tidak bisa memanggil RPC privat; service_role memvalidasi guru aktif; operasi lama delete ditolak |
| Replay/stale edit | PASS | Konfirmasi ulang aman; UUID yang telah dihapus tidak dapat dibuat ulang lewat dialog lama |
| UI | PASS terbatas | Review source dan build; konfirmasi NISN + checkbox permanen, pesan cakupan seluruh semester |
| Supabase Auth/GoTrue hosted | NOT_RUN | Database uji memakai PGlite, bukan project hosted |
| WhatsApp/Gateway eksternal | NOT_RUN | Source Gateway eksternal, endpoint aktif dan credential tidak tersedia; akar pesan literal di server pengguna belum terverifikasi |
| Multi-koneksi simultan | NOT_RUN | Advisory lock dipasang pada mutasi aplikasi; pengujian PGlite berurutan bukan bukti concurrency multi-koneksi |
| Vercel deploy/browser/perangkat | NOT_RUN | Paket belum dipublikasikan atau diuji pada perangkat pengguna |

Tes PostgreSQL memakai fixture sintetis dengan role anon, authenticated, service_role dan supabase_auth_admin simulasi. Tes SDK API menggunakan mock. Typecheck TypeScript NOT_APPLICABLE karena source JavaScript. Laporan versi lama merupakan catatan historis, bukan perilaku penghapusan v1.7.0.
