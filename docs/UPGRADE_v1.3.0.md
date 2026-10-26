# Upgrade REEV BELAJAR ke v1.3.0

## Pasang pada aplikasi yang sudah berjalan

1. Simpan source v1.2.1 dan backup database sesuai prosedur pada DEPLOY.md.
2. Ekstrak REEV_BELAJAR_v1.3.0.zip. Buka `supabase/migrations/008_student_gradebook.sql`.
3. Di SQL Editor proyek Supabase yang sama, jalankan seluruh isi **008_student_gradebook.sql sekali**. Migrasi dibungkus transaksi. Jika muncul error, jangan melanjutkan deploy sampai error diselesaikan. Versi ini mengasumsikan 001–007 sudah terpasang.
4. **Jangan menjalankan ulang 001–007 dan jangan reset database.** Versi v1.2.0/v1.2.1 langsung ke 008; versi v1.1.0 perlu 007 dahulu.
5. Ganti source aplikasi dengan isi folder v1.3.0, lalu deploy pada proyek Vercel yang sama. Pertahankan environment variables yang sudah dipakai; tidak ada secret baru.
6. Build: `npm run build`; install: `npm ci`; output: `dist`. Untuk lokal, pertahankan .env privat lalu `npm ci`, `npm run build`, `npm start`.
7. Muat ulang halaman dan pastikan Pengaturan menampilkan v1.3.0. Jika fungsi/kolom baru belum ditemukan, pastikan 008 berhasil pada proyek yang ditunjuk oleh environment aplikasi.

Instalasi baru pada database kosong: terapkan 001 sampai 008 berurutan.

## Cara mengisi semua tugas seorang siswa

1. Masuk sebagai guru, buka Tugas dan Nilai → Rekap Nilai.
2. Pilih semester dan kelas; cari siswa pada daftar yang sudah A–Z.
3. Klik **Isi semua tugas** pada baris siswa tersebut.
4. Tampil seluruh tugas formatif dan sumatif yang memang ditugaskan kepada siswa itu pada semester terpilih, dari tanggal dibuat paling awal ke terbaru. Jika waktu pembuatan sama, ID tugas menjadi pengurut pembeda yang tetap.
5. Isi skor formatif atau seluruh aspek sumatif. Nilai / 100 dihitung otomatis. Skor 0 sah, aspek kosong tidak dianggap 0. Isi umpan balik bila diperlukan.
6. Klik **Simpan semua perubahan**. Seluruh perubahan berhasil bersama atau dibatalkan bersama jika data tidak valid. Siswa lain tidak diubah; tugas yang tidak diedit tetap utuh.
7. Daftar dibaca ulang setelah simpan dan rekap di belakang dialog disegarkan. Tutup dialog untuk melihat progres baru. Riwayat per tugas tetap dapat dibuka lewat kartu tugas.

Batas: satu penyimpanan maksimal 200 tugas yang berubah. Jika ada lebih banyak tugas, seluruhnya tetap dimuat melalui halaman permintaan; simpan 200 perubahan dahulu sebelum mengedit sisanya. Ini berbeda dari batas 200 siswa per tugas yang sudah ada di versi lama. Semester arsip hanya dapat dibaca.

Menutup dialog dengan draft belum tersimpan meminta konfirmasi. Error jaringan mempertahankan draft dan ID percobaan untuk retry payload yang sama. Jika sistem mengatakan nilai/tugas telah berubah, catat draft penting lalu tutup dan buka lagi untuk mengambil data terbaru sebelum mengulang edit. Jangan mengedit tugas bersamaan selama daftar sedang dimuat.

## Aturan ketuntasan formatif

- Total = seluruh tugas FORMATIF yang memiliki sasaran untuk siswa pada semester terpilih. Tugas siswa lain, kelas lain tanpa penugasan, semester lain, dan sumatif tidak dihitung.
- Dinilai = status Dinilai dan skor tersimpan tidak kosong. Nol tetap dihitung sebagai nilai yang sudah masuk.
- Tuntas = total lebih dari nol, semua tugas formatif sudah dinilai, serta rata-rata formatif mencapai KKTP kelas/default seperti kebijakan rekap sebelumnya.
- Ada satu nilai kosong/status Belum atau Selesai → Belum tuntas, walaupun rata-rata sementara tinggi.
- Semua dinilai tetapi rata-rata di bawah KKTP → Belum tuntas.
- Tidak ada tugas formatif → Belum ada tugas.
- Contoh: 1 dari 3 tugas bernilai 90 → Belum tuntas. Setelah ketiganya dinilai dan rata-rata ≥ KKTP → Tuntas.

Penentuan ini memakai rata-rata rekap, bukan mewajibkan setiap tugas melampaui KKTP-nya masing-masing. Nilai kosong tetap tidak dimasukkan sebagai nol dalam perhitungan rata-rata. Dashboard mengikuti aturan kelengkapan yang sama.

## Edit Pengaturan

Masalah lama: `school_settings.id` adalah boolean true, tetapi handler mutasi umum mencoba mengubahnya ke UUID sebelum memproses pengaturan. Migrasi 008 memperbaiki handler tersebut; frontend juga mengirim hanya field pengaturan yang dapat diedit. Akun dan identitas database tidak diubah.

## Pemeriksaan setelah pemasangan

- Buka Pengaturan, ubah nama pengelola/mapel, simpan dan muat ulang; tidak muncul error UUID true.
- Pastikan nama dengan huruf besar/kecil tercampur tetap A–Z pada direktori, rekap, tugas dan kehadiran.
- Dari rekap pilih siswa dengan beberapa tugas. Isi lebih dari satu tugas, simpan, tutup dan buka ulang. Nilai dan umpan balik harus tetap ada.
- Pastikan siswa lain tidak berubah; cek history tugas lama/new sesuai skor yang diubah.
- Biarkan satu formatif belum dinilai: status tetap Belum tuntas. Isi sisanya dan cek rata-rata terhadap KKTP.
- Coba aspek sumatif belum lengkap: simpan ditolak tanpa kehilangan draft.
- Login siswa: tombol input guru tidak muncul; semester arsip tidak dapat diedit.

## Rollback dan batas pengujian

Source lama dapat dideploy kembali jika diperlukan; 008 menambah kolom view/fungsi serta memperbaiki handler tanpa menghapus data. Biarkan migrasi 008 tetap terpasang, jangan menghapus tabel atau fungsi yang masih digunakan. Source lama tidak menampilkan fitur kelengkapan dan input per siswa.

Tidak ada nilai, akun, atau riwayat produksi yang dimodifikasi oleh pengerjaan paket ini. Migrasi diuji pada PostgreSQL embedded PGlite dengan fixture sintetis. Pengujian browser interaktif, PostgREST hosted, login Supabase nyata, dan deployment Vercel belum dijalankan. Lihat TEST_RESULTS_v1.3.0.md.

## Revisi CSV pada versi 1.3.0
NISN (10 digit) dan telepon terisi wajib diapit tanda kutip ganda pada file CSV mentah. Header PHONE_REGISTERED diterima. Baca CSV_SISWA.md untuk contoh dan cara menjaga nol awal saat memakai Excel. Jika 008 sudah berhasil diterapkan, revisi CSV hanya memerlukan deploy ulang source tanpa menjalankan SQL lagi.
