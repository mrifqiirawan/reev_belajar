# v1.7.3 — 29 Oktober 2026

- NISN dan telepon ekspor memuat kutip literal sebagai isi sel; tanpa awalan = atau rumus Excel.
- Impor menerima pasangan kutip literal dari ekspor serta format lama, membersihkannya sebelum validasi dan penyimpanan.
- Pertahankan satu tombol Unduh CSV, nilai kosong/nol, filter dan nomor sumber.
- Tanpa perubahan SQL/dependency.

# v1.7.2 — 29 Oktober 2026

- Satukan ekspor menjadi Unduh CSV; pindahkan template dan unggah ke bagian Impor CSV.
- Kutip wajib hanya NISN/telepon terisi; escaping otomatis untuk karakter khusus pada kolom lain.
- Hapus ekspresi teks Excel. Perbarui header template, petunjuk impor, tes round-trip dan format mentah.
- Tidak ada perubahan SQL atau dependency.

# v1.7.1 — 29 Oktober 2026

- Tambah CSV untuk Excel dengan identifier sebagai ekspresi teks konstan dari digit tervalidasi; CSV standar bertanda kutip tetap tersedia.
- Satukan format byte unduhan UTF-8 BOM, CRLF, nama file dan validasi identifier.
- Tambah petunjuk bahwa quote CSV tidak memaksa tipe sel Excel; pertahankan format telepon internasional sebelumnya.
- Tanpa perubahan SQL/database/dependency.

# v1.7.0 — 28 Oktober 2026

- Hapus siswa permanen di seluruh semester, termasuk Auth/profil dan relasi belajar; konfirmasi NISN + checkbox. Audit administrasi tetap disimpan.
- Operasi API baru `purge` mencegah klien v1.6.0 menghapus permanen memakai dialog lama. Retry aman dan stale Edit tidak menghidupkan kembali UUID terhapus.
- Koreksi NISN membatalkan payload Gateway/konfirmasi lama; register memakai nomor terdaftar dan NISN terkini, dengan diagnosis akses tanpa membocorkan identitas ke nomor lain.
- Formulir, CSV, aktivasi kembali dan perpindahan kelas menambahkan peserta tugas yang sesuai; migrasi memperbaiki target lama yang hilang tanpa menimpa nilai/arsip.
- Migrasi 011, tes lifecycle end-to-end SQL dan checklist Gateway/deployment ditambahkan.

# v1.6.0 — 28 Oktober 2026

- Koreksi NISN siswa aktif melalui API guru dengan sinkronisasi Auth dan audit atomik.
- Hapus akun login siswa dari Siswa dan Kelas, konfirmasi NISN, nonaktifkan siswa dan lepas WA; riwayat belajar dipertahankan.
- Akun & akses hanya mengambil profil guru.
- Migrasi incremental 010, endpoint Vercel/lokal, serta tes izin, rollback, duplikasi dan pemulihan respons hilang.
- Panduan upgrade dan batas pengujian hosted disertakan.

# v1.5.0 · 27 Oktober 2026

- Reset sandi siswa dari menu Siswa dan Kelas dengan konfirmasi NISN.
- Endpoint Vercel/VM memverifikasi JWT dan role teacher aktif, serta menolak target akun guru.
- Audit tanpa password dan penanganan kegagalan Auth/audit.

# v1.4.0 · 27 Oktober 2026

- Aktivasi akun siswa aktif massal melalui Supabase Auth Admin, sandi awal 123456.
- Login NISN dengan nol awal tetap utuh; login email lama tetap tersedia.
- Menu Pengaturan siswa dan formulir ganti sandi dengan konfirmasi.
- Penautan profil/siswa atomik, rekonsiliasi setelah timeout, tanpa reset akun tertaut.
- Migrasi tambahan 009 dan pelindung perubahan NISN identitas login.
- Panduan upgrade serta pengujian Auth helper, provisioning, dan RLS.

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
