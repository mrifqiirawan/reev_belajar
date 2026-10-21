# v1.2.0 — 21 Oktober 2026
- Edit/hapus asesmen formatif dan sumatif untuk guru/admin.
- Validasi server, revisi untuk mencegah penimpaan edit, konfirmasi kode saat menghapus.
- Pertahankan audit penghapusan nilai; kunci struktur penilaian setelah ada nilai.
- Kredit pembuat: M. Rifqi Irawan, S.Pd. pada login, footer dan Pengaturan.
- Migrasi incremental 007; fitur lama dipertahankan.

# v1.1.0 — 19 Oktober 2026

- Endpoint HMAC khusus fungsi Gateway, deduplikasi dan pembatasan akses siswa.
- Penautan NISN dengan preview, konfirmasi YA, expiry dan revalidasi.
- Status tautan/tanggal pada direktori siswa.
- Guard perintah siswa lama agar tidak melewati point, sambil mempertahankan akses guru terdaftar.
- Migrasi tambahan 006; data siswa/nilai/akun lama dipertahankan.

# 1.0.0 — 13 Oktober 2026

Implementasi awal berdasarkan PRD REEV BELAJAR. Website React/Vite, Supabase Auth/RLS, semester dan kelas, CSV siswa, penilaian formatif/sumatif, kehadiran, ledger bintang/hati, audit, chatbot dengan konfirmasi, webhook dan adapter Gateway v2.7.3. Launcher Windows dan panduan hybrid/VPS.

Berbeda dari INPRO: tugas kosong bukan nilai nol dan hati tidak mengurangi nilai akademik. Paket tidak berisi data operasional, akun bawaan, sesi, atau source referensi yang lisensinya tidak dinyatakan. Batas implementasi dan pemeriksaan belum dijalankan dicatat dalam docs/ACCEPTANCE.md dan docs/TEST_RESULTS.md.
