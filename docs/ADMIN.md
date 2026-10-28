> **Versi terbaru v1.7.0:** ikuti [UPGRADE_v1.7.0.md](UPGRADE_v1.7.0.md). Hapus siswa kini permanen di seluruh semester; migrasi 011 wajib. Keterangan versi lama di bawah adalah referensi historis bila bertentangan.

> **v1.6.0:** baca [UPGRADE_v1.6.0.md](UPGRADE_v1.6.0.md) untuk koreksi NISN, penghapusan akun, migrasi 010, dan panduan terbaru. Untuk instalasi baru jalankan 001–010; upgrade dari v1.5.0 hanya 010.

# Akun siswa v1.4.0

Setelah input/import siswa, jalankan `npm run provision:students` dari komputer pengelola dengan environment privat. Akun baru login menggunakan NISN dan sandi awal 123456. Siswa mengganti sandi di Pengaturan. Akun yang sudah tertaut tidak direset. Baca `UPGRADE_v1.4.0.md` sebelum menjalankan aktivasi.

> Untuk perubahan v1.1.0 dan integrasi menu custom Gateway, baca [UPGRADE_v1.1.0.md](UPGRADE_v1.1.0.md). Dokumen berikut mempertahankan panduan dasar v1.0.0.

# Panduan guru dan siswa

## Urutan awal

1. Masuk dengan email dan password dari bootstrap. Buka Pengaturan, isi nama mapel/madrasah, KKTP, target klasikal dan hati awal. Tanpa hati awal, pelanggaran sengaja ditolak.
2. Tambahkan semester, centang aktif. Hanya satu semester aktif. Arsip semester menghentikan input nilai/kehadiran pada periode itu.
3. Tambahkan kelas; KKTP kosong memakai default sekolah. Tambahkan siswa atau impor CSV pada kelas yang telah dipilih.
4. Buat tugas formatif/sumatif. Anggota kelas saat pembuatan menjadi sasaran. Kode tugas unik dan tetap; rubrik tidak diubah setelah dibuat.
5. Input nilai: pilih asesmen, isi skor/aspek (status otomatis Dinilai), periksa pratinjau Nilai / 100, lalu simpan batch. Semua aspek sumatif wajib lengkap. Status Belum/Selesai menyimpan nilai kosong. Nilai 0 sah dan dihitung. Feedback menyertai koreksi pada audit.
6. Buat pertemuan dan catat Hadir/Sakit/Izin/Alpa; data kosong berarti belum dicatat. Tombol semua Hadir hanya memengaruhi anggota yang ditampilkan; tinjau sebelum simpan.
7. Bintang diberikan dengan alasan. Pembatalan mencatat transaksi negatif satu kali, tidak menghapus record.
8. Pelanggaran mengurangi satu hati. Pilih Dalam proses/Selesai/Dibatalkan dan catatan tindakan. Untuk pulih saat Selesai, aktifkan aturan pemulihan dan centang konfirmasi. Dibatalkan mengembalikan pengurangan melalui transaksi koreksi.

## CSV

Header wajib `nisn,name,registered_phone`. Pilih kelas dan semester aktif dahulu. Maksimum 500 baris, 1 MiB. Kolom NISN harus teks, jangan biarkan Excel menghilangkan nol awal. Nomor opsional; impor selalu memerlukan verifikasi guru sebelum penautan WA. Pratinjau menampilkan semua baris. Duplikat membuat seluruh batch ditolak; tidak menimpa berdasarkan nama. Template kosong: `templates/template-siswa.csv`.

Ekspor mencakup semua hasil filter, hingga 10.000 siswa, dengan proteksi formula spreadsheet. Kolom nomor diawali apostrof jika diperlukan agar aplikasi spreadsheet tidak mengeksekusinya sebagai formula. Ini ekspor laporan, bukan format backup lengkap atau impor timbal balik tanpa pemetaan kolom. Jangan mengubah data selama ekspor jika membutuhkan keseragaman snapshot; gunakan backup DB untuk konsistensi transaksi.

## WhatsApp siswa

Guru mengisi nomor +62… dan mencentang telah diverifikasi setelah mengecek identitas di luar bot. Siswa mengirim `.daftar NISN`. Jika nomor tidak cocok, hubungi guru. NISN bukan rahasia login.

- `.menu`: bantuan.
- `.profil`: ringkasan semester aktif.
- `.nilai`: 20 tugas terbaru beserta nilai/status.
- `.tugas`: 20 tugas belum selesai terbaru.
- `.bintang`, `.hati`: saldo dan 10 riwayat terbaru.
- `.absen`: jumlah status kehadiran.

Siswa tidak bisa membaca NISN lain. Untuk riwayat lengkap gunakan website dengan akun sendiri. Melepas tautan dilakukan guru pada direktori siswa; perubahan nomor atau nonaktif juga melepas tautan.

## WhatsApp guru

Nomor harus diverifikasi pada allowlist dan terkait akun guru aktif.

```
.nilai 0012345678 FMT-01 85
.bintang 0012345678 2 Menyelesaikan tugas dengan baik
.pelanggaran 0012345678 P01 Terlambat mengikuti kelas
.profil 0012345678
```

Bot menampilkan pratinjau dan token. Balas `KONFIRMASI <token>` dalam lima menit; token penuh wajib, sekali pakai dan hanya nomor pembuat. `.batal` membatalkan. Sumatif diisi melalui aspek di website. Jika respons hilang, cek nilai/log sebelum membuat perintah baru; konfirmasi token lama yang sudah terpakai tidak menulis ulang transaksi.

## Privasi, logout, dan pemantauan

Guru mengelola seluruh ruang mapel ini. Siswa hanya datanya sendiri. Penonaktifan profil memblokir akses RLS; siswa aktif juga diperlukan untuk WA. Tombol ↪ Keluar mengakhiri sesi perangkat saat ini melalui Supabase dan membersihkan tampilan; bukan klaim mencabut seluruh access token seketika di semua perangkat.

Pengaturan menampilkan waktu status Gateway, perintah, outbox dan audit terbaru. Periksa waktu: connected lama bukan jaminan terkoneksi sekarang. queued/sending/sent bukan delivered/read. Respons yang ambigu tidak dikirim ulang otomatis. UI memakai pagination; angka dashboard berasal dari seluruh semester, bukan hanya halaman tabel atau filter kelas di tabel bawah.

## Pengelolaan asesmen v1.2.0
Pilih kartu pada Tugas dan Nilai, lalu Edit asesmen atau Hapus asesmen. Penghapusan membutuhkan kode dan turut menghapus nilai dari rekap. Lihat UPGRADE_v1.2.0.md untuk batas edit dan semester arsip.

## Rekap dan pengaturan v1.3.0
Pada Rekap Nilai, klik Isi semua tugas di baris siswa untuk mengisi semua tugas formatif/sumatif yang ditugaskan kepadanya dalam semester terpilih. Simpan semua perubahan, lalu tutup dialog untuk melihat rekap terbaru. Semua tugas formatif wajib dinilai dan rata-rata mencapai KKTP agar status Tuntas. Progres dinilai/total ada di kolom ketuntasan. Nama siswa diurutkan A–Z tanpa membedakan kapital/spasi tepi. Edit Pengaturan memerlukan migrasi 008 agar ID boolean tidak dibaca sebagai UUID. Panduan lengkap: UPGRADE_v1.3.0.md.

## Revisi CSV pada versi 1.3.0
NISN (10 digit) dan telepon terisi wajib diapit tanda kutip ganda pada file CSV mentah. Header PHONE_REGISTERED diterima. Baca CSV_SISWA.md untuk contoh dan cara menjaga nol awal saat memakai Excel. Jika 008 sudah berhasil diterapkan, revisi CSV hanya memerlukan deploy ulang source tanpa menjalankan SQL lagi.
