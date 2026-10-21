# Upgrade REEV BELAJAR v1.1.0 → v1.2.0

Pembuat aplikasi: M. Rifqi Irawan, S.Pd.

## Pemasangan pada aplikasi yang sudah berjalan
1. Simpan backup database Supabase dan source v1.1.0 sebelum upgrade.
2. Buka Supabase proyek yang sama → SQL Editor → New query.
3. Salin seluruh isi supabase/migrations/007_task_management.sql, lalu Run **sekali**. Database harus sudah memiliki migrasi 001–006 dari v1.1.0. Jangan menjalankan ulang 001–006 atau membuat database baru.
4. Ganti source aplikasi dengan isi folder paket v1.2.0 (termasuk src, api, package.json dan package-lock.json). Pertahankan environment proyek Vercel yang sudah digunakan.
5. Redeploy Vercel dengan Build Command npm run build dan Output Directory dist. Instalasi lokal menggunakan npm ci.
6. Refresh halaman, masuk sebagai guru, buka Tugas dan Nilai → Formatif/Sumatif → klik kartu asesmen. Tombol Edit asesmen dan Hapus asesmen berada di samping judul.
7. Uji pada asesmen percobaan: ubah judul, simpan, buka kembali, lalu hapus dengan mengetik kode asesmen. Pastikan rekap sesuai.

Migrasi 007 hanya menambah revisi data dan fungsi pengelolaan asesmen serta memperbaiki audit penghapusan nilai. Tidak menghapus data yang sudah ada. Instalasi baru memakai 001–007 berurutan; ikuti docs/DEPLOY.md untuk konfigurasi lainnya.

## Perilaku fitur
- Guru/admin dapat mengedit kode, judul, materi, tenggat, tanggal asesmen, KKTP dan target ketuntasan.
- Skor maksimum formatif atau rubrik sumatif dapat diubah sebelum ada nilai tersimpan. Setelah ada nilai (termasuk nol), struktur penilaian terkunci; buat asesmen baru jika membutuhkan struktur berbeda.
- Kelas, semester, jenis asesmen dan daftar sasaran tetap. Perubahan KKTP memengaruhi indikator ketuntasan, bukan nilai akademik tersimpan.
- Semester arsip terkunci. Buka arsip melalui Pengaturan bila memang hendak mengubahnya.
- Hapus membutuhkan kode asesmen yang tepat. Sasaran dan nilai terkait dihapus secara atomik, sehingga tidak lagi masuk rekap; audit dan riwayat nilai tetap disimpan. Tidak tersedia tombol undo.
- Dua editor tidak boleh menimpa revisi lama: jika ditolak, tutup dialog dan segarkan.
- Permintaan ulang dengan ID yang sama tidak menggandakan operasi.
- Identitas pembuat muncul di login, footer aplikasi dan Pengaturan.

## Pemulihan
Jika frontend baru bermasalah, deploy ulang source v1.1.0. Kolom tambahan dan RPC baru boleh tetap ada karena frontend lama tidak memakainya. Jangan menghapus migrasi atau tabel untuk rollback.
Rollback source tidak mengembalikan asesmen yang telah dihapus. Pemulihan data memerlukan backup database sebelum penghapusan dan prosedur restore pada lingkungan uji terlebih dahulu.

## Status verifikasi
Pengujian lokal menggunakan Node dan PGlite; bukan Supabase hosted. Browser/perangkat nyata, deploy Vercel, dan WhatsApp nyata belum diuji. Lihat TEST_RESULTS_v1.2.0.md.
