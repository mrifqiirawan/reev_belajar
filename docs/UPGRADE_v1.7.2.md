# Upgrade v1.7.2

Dari v1.7.0 atau v1.7.1: deploy seluruh source baru ke Vercel memakai environment yang sama, lalu muat ulang browser dan pastikan label v1.7.2. Tidak ada migrasi SQL atau perubahan dependency. Database versi lebih lama tetap perlu urutan migrasi dalam panduan v1.7.0. Rollback patch ini cukup memakai source sebelumnya.

## CSV

- Satu tombol **Unduh CSV** pada direktori dan rekap nilai. Mode Excel/standar dihapus.
- Template dan unggah tersedia di bagian **Impor CSV** yang dapat dibuka; nama tombol unggah **Pilih file CSV**.
- NISN dan registered_phone terisi selalu dikutip dengan kutip ASCII ganda, tanpa rumus, tanpa apostrof tambahan. Nol awal tetap ada di file.
- Kolom lain tidak dipaksa memakai kutip. Nilai dengan koma, kutip, baris baru, atau spasi di tepi tetap di-escape sesuai CSV agar struktur tidak rusak.
- Header tanpa kutip; telepon kosong dibiarkan kosong. Null nilai kosong; angka 0 tetap 0. Telepon internasional tetap diekspor tanpa + seperti sebelumnya, bukan dikonversi kembali ke 08.
- UTF-8 BOM dan CRLF dipertahankan. Ekspor mengikuti filter dan pagination sebelumnya.
- Impor menerima nama tanpa kutip; hanya NISN dan telepon terisi wajib dikutip. Tetap tiga header nisn,name,registered_phone (alias PHONE_REGISTERED diterima). File rekap delapan kolom bukan template impor. Pilih kelas tujuan dan periksa pratinjau; impor membuat siswa baru, bukan memperbarui siswa lama.

Contoh sintetis ekspor:

```csv
nisn,name,class_name,registered_phone,formative,summative,stars,hearts
"0012345678",SISWA UJI,7A,"6281234567890",89.33333333,,0,10
"0142373659",SISWA DUA,7A,,80,,0,10
```

CSV tidak menyimpan tipe kolom. Tanda kutip tidak menjamin Excel mempertahankan nol saat dibuka langsung; impor melalui Text/CSV dan pilih tipe Text untuk NISN/telepon. Aplikasi tidak menebak nol yang sudah hilang dari data sumber.

Validasi dan batas uji: TEST_RESULTS_v1.7.2.md. Belum diterapkan ke website pengguna.
