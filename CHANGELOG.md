# Revisi CSV — tetap v1.3.0

- Validasi sintaks kutip ganda pada NISN dan telepon terisi sebelum pratinjau impor.
- NISN impor wajib 10 digit; angka notasi ilmiah/rumus ditolak tanpa menebak nol yang hilang.
- Alias PHONE_REGISTERED, header case-insensitive, BOM, koma/titik koma didukung.
- Tombol template CSV, ekspor dengan seluruh field berkutip, input file dapat dipilih ulang setelah error.
- Panduan Excel Text/CSV dan keterbatasan kutip CSV di docs/CSV_SISWA.md.
- Tidak mengubah versi aplikasi, data, atau migrasi SQL.

# v1.3.0 — 26 Oktober 2026

- Rekap Nilai: tombol Isi semua tugas per siswa, urutan pembuatan paling awal sampai terbaru, formatif dan aspek sumatif, preview /100 dan umpan balik.
- Simpan lintas tugas atomik, idempotensi retry, validasi sasaran/semester/role, serta pemeriksaan nilai dan revisi tugas agar perubahan sesi lain tidak tertimpa.
- Nama siswa di direktori, dashboard, rekap, daftar nilai tugas, kehadiran dan ekspor diurutkan A–Z tanpa membedakan huruf besar/kecil dan spasi tepi. Pengurutan dilakukan sebelum batas/pagination.
- Ketuntasan formatif: seluruh tugas formatif yang ditugaskan pada siswa di semester terpilih harus sudah Dinilai dengan skor non-null, dan rata-rata memenuhi KKTP kelas/default. Progres dinilai/total ditampilkan; dashboard memakai syarat yang sama.
- Edit Pengaturan: ID boolean singleton tidak dikonversi menjadi UUID; payload UI hanya memuat field yang dapat diubah.
- Migrasi incremental 008 diperlukan, tidak menghapus atau mengubah nilai lama. Dependency tetap.

# v1.2.1 — 26 Oktober 2026

- Memperbaiki skor yang hilang saat status masih Belum/Selesai: input skor/aspek otomatis memilih Dinilai.
- Pratinjau Nilai / 100 untuk formatif dan sumatif mengikuti draft dan normalisasi skor.
- Aspek kosong tidak diubah menjadi nol; batch tidak valid ditolak dengan nama siswa.
- Umpan balik saja mempertahankan nilai yang tersimpan; nilai nol tetap sah.
- Input dinonaktifkan saat memuat/menyimpan dan pada semester arsip.
- Tidak ada perubahan SQL/dependensi. Tes regresi meliputi payload frontend sampai tabel nilai, riwayat, dan rekap.

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
