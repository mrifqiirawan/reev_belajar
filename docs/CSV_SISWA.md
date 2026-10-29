# Impor CSV siswa — v1.7.2

Format file mentah yang diterima (contoh sintetis, ganti dengan data Anda):

```csv
nisn,name,registered_phone
"0123123123",Nama Siswa,"6285399809980"
"0012345678",Siswa Tanpa Telepon,
```

## Ketentuan

- NISN wajib tepat 10 digit, diapit tanda kutip ganda ASCII `"`. Nol awal dipertahankan sebagai teks.
- Nomor telepon yang terisi wajib diapit tanda kutip ganda juga. Gunakan digit, misalnya `"6285399809980"` atau `"085399809980"`. Awalan + juga diterima. Nomor dinormalisasi ke +62 untuk nomor Indonesia berawalan 0.
- Telepon opsional. Isi `""` bila belum ada nomor; sel kosong juga diterima. NISN dan nama tetap wajib.
- Header resmi: nisn,name,registered_phone. Header PHONE_REGISTERED diterima sebagai alias registered_phone, tanpa membedakan huruf besar/kecil. Jangan memakai kedua header telepon sekaligus.
- Pemisah koma maupun titik koma diterima. Kutip di dalam nama ditulis sebagai dua kutip, misalnya `"Nama ""Panggilan"""`.
- Notasi ilmiah seperti `"6.285E+12"`, rumus Excel, NISN pendek, header duplikat, dan jumlah kolom salah ditolak sebelum pratinjau.
- Tidak ada penambahan nol otomatis karena dapat menciptakan NISN yang salah. Cocokkan dengan sumber asli jika nol sudah hilang.
- Maksimal 500 siswa dan ukuran file 1 MB seperti sebelumnya. Pilih kelas tujuan. Impor hanya membuat siswa baru; NISN duplikat ditolak. Periksa pratinjau sebelum konfirmasi.

## Penting ketika memakai Excel

CSV tidak menyimpan tipe kolom. Tanda kutip ganda adalah pembatas nilai CSV, bukan jaminan Excel membaca isinya sebagai teks. Excel bisa menghilangkan nol awal ketika file CSV dibuka langsung, meskipun angkanya diapit tanda kutip.

1. Sebelum mengetik atau menempel data, atur kolom NISN dan telepon sebagai **Text**. Mengubah format setelah nol hilang tidak mengembalikannya.
2. Saat membuka CSV di Excel, gunakan impor **From Text/CSV** dan tetapkan kolom tersebut sebagai Text sebelum dimuat, bukan membuka file lewat klik ganda.
3. Setelah Save As CSV, buka hasilnya di editor teks seperti Notepad. Excel mungkin tidak menuliskan tanda kutip untuk semua sel meskipun sel berasal dari kolom Text.
4. Pastikan nilai mentah terlihat persis seperti `"0123123123"` dan `"6285399809980"`. Tambahkan pembatas kutip melalui editor teks bila Excel tidak menyertakannya. Jangan mengetik kutip literal ke dalam sel Excel: hasil ekspornya dapat menjadi tiga kutip dan akan ditolak sebagai angka tidak valid.
5. Pastikan NISN masih 10 digit sebelum mengimpor ke aplikasi. Jika sudah berubah menjadi 9 digit atau notasi ilmiah, kembalikan dari sumber asli, jangan menebak.

Buka bagian **Impor CSV**, lalu tombol **Template CSV** mengunduh header kosong. Contoh di atas dapat disalin ke editor teks dan diganti dengan data nyata, lalu disimpan sebagai UTF-8 CSV. Format header template harus dipertahankan.

## Ekspor dan pemasangan

Unduh CSV memberi kutip wajib hanya pada NISN dan telepon terisi. Header, nama biasa, kelas, dan nilai tidak diapit kutip; koma, kutip, atau baris baru di dalam nilai tetap memerlukan escaping CSV. Tidak ada mode rumus Excel; nomor telepon diekspor sebagai digit tanpa tanda + untuk menghindari interpretasi rumus spreadsheet. Ekspor rekap tetap memuat kolom rekap tambahan, sehingga bukan template impor siswa langsung. Jika akan diimpor, sisakan tiga kolom resmi dan pastikan siswa tersebut belum ada.

Dari v1.7.0/v1.7.1, cukup deploy source v1.7.2 tanpa migrasi SQL. Lihat UPGRADE_v1.7.2.md.
