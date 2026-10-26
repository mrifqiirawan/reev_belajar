# Upgrade REEV BELAJAR v1.2.0 → v1.2.1

## Penyebab dan perbaikan
Pada versi lama, input skor tidak mengubah status siswa. RPC `reev_mutate` mengosongkan score/components jika status bukan Dinilai. Umpan balik tetap tersimpan dan trigger audit mencatat perubahan tersebut, sehingga nilai lama/baru sama-sama kosong. Tampilan formatif juga mengambil nilai tersimpan, bukan pratinjau input.

Versi ini memperbaiki alur frontend: mengisi skor/aspek otomatis memilih Dinilai; nilai normalisasi tampil sebagai pratinjau; semua aspek sumatif wajib lengkap; input kosong tidak dianggap nol. Penyimpanan tetap memakai RPC transaksi dan audit yang sama. Nilai / 100 adalah hasil hitung, bukan kolom input; masukkan angka di Skor atau setiap aspek rubrik.

## Langkah pemasangan
1. Ekstrak ZIP. Simpan salinan source versi sebelumnya untuk rollback.
2. Ganti source aplikasi pada proyek Vercel yang sama dengan isi folder REEV_BELAJAR_v1.2.1. Gunakan root berisi package.json, src, dan api. Pertahankan environment variables proyek Anda.
3. Build command `npm run build`, output directory `dist`; install memakai `npm ci`.
4. Deploy ulang, lalu muat ulang halaman. Cek versi v1.2.1 pada Pengaturan.
5. Untuk penggunaan lokal: pertahankan .env privat Anda, jalankan `npm ci`, `npm run build`, lalu `npm start`.

**Tidak ada SQL/migrasi baru untuk upgrade dari v1.2.0. Jangan menjalankan ulang 001–007 atau reset database.** Jika masih v1.1.0, selesaikan langkah migrasi 007 pada panduan v1.2.0 terlebih dahulu. Instalasi database baru tetap memakai 001–007 berurutan.

## Pemeriksaan setelah deploy
- Pilih tugas formatif dengan skor maksimum 100. Dari status Belum, isi skor 80 serta umpan balik. Status otomatis Dinilai dan pratinjau 80. Simpan batch.
- Muat ulang halaman, pilih kembali tugas: nilai harus tetap 80. Ubah menjadi 90 lalu simpan; riwayat terbaru harus menampilkan 80 → 90.
- Perubahan umpan balik saja harus mempertahankan nilai. Pada riwayat seperti ini, angka lama dan baru memang sama.
- Uji skor 0; harus tersimpan sebagai 0. Untuk maksimum 50, skor 40 menghasilkan Nilai / 100 sebesar 80.
- Sumatif: isi seluruh aspek, simpan, lalu baca ulang. Aspek kosong harus ditolak, bukan dianggap nol.
- Mengubah status ke Belum/Selesai mengosongkan nilai ketika batch disimpan. Gunakan hanya jika memang ingin membatalkan penilaian.

## Nilai lama yang kosong
Skor yang sudah terhapus oleh alur lama tidak dapat direkonstruksi dari history yang score-nya null. Masukkan ulang berdasarkan catatan guru. Rilis ini tidak menebak angka atau mengubah data historis.

## Rollback dan batas verifikasi
Rollback source/deployment ke v1.2.0 bila diperlukan; database tidak berubah. Bug lama kembali jika memakai frontend lama. Paket ini belum dipasang ke Vercel atau Supabase hosted pengguna. Hasil pengujian lokal tersedia di TEST_RESULTS_v1.2.1.md.
