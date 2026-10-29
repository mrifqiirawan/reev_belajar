# Upgrade v1.7.3

Deploy source baru dengan environment yang sama, lalu muat ulang dan pastikan versi v1.7.3. Dari v1.7.0/v1.7.1/v1.7.2 tidak perlu migrasi SQL. Untuk versi lebih lama, ikuti urutan migrasi panduan v1.7.0. Rollback patch ini memakai source sebelumnya.

## Hasil unduhan

Satu tombol Unduh CSV dipertahankan. Isi sel NISN menjadi `"0012345678"`, bukan `0012345678` dan bukan `="0012345678"`. Telepon terisi mengikuti aturan sama. Tanda kutip merupakan karakter data sehingga identifier tidak hanya berisi angka. Nama/kelas/nilai normal tetap tanpa kutip literal. Telepon kosong tetap kosong. Null bukan nol. Tidak ada pembulatan nilai atau penggantian nomor telepon.

Teks mentah CSV yang benar (contoh sintetis):

```csv
nisn,name,class_name,registered_phone,formative,summative,stars,hearts
"""0012345678""",SISWA UJI,7A,"""6281234567890""",89.33333333,,2,10
```

Setelah dibaca oleh parser CSV, isi sel pertama adalah `"0012345678"` dan sel telepon `"6281234567890"`. Tiga kutip di file mentah adalah escaping standar CSV untuk satu kutip literal di tiap sisi. Menulis hanya `"0012345678"` di file mentah akan membuat parser menghapus kutip pembatas; hal itulah yang terjadi pada v1.7.2. Tidak ada rumus, karakter = atau tab tambahan pada identifier.

## Impor

Template tetap tiga header nisn,name,registered_phone. Format lama `"0012345678",Nama,"6281234567890"` tetap diterima. Format baru `"""0012345678""",Nama,"""6281234567890"""` juga diterima. Parser membuang tepat satu pasangan kutip literal pada identifier digit, lalu memvalidasi dan menormalisasi telepon seperti sebelumnya. Rumus, notasi ilmiah dan kutip bertingkat tidak diterima. Kutip tidak masuk ke data Supabase atau identitas login.

Rekap delapan kolom bukan format impor: sisakan tiga kolom resmi untuk impor siswa baru dan pilih kelas tujuan. NISN duplikat ditolak, tidak memperbarui siswa lama. Impor file baru harus memakai aplikasi v1.7.3.

Uji lokal membuktikan isi byte CSV dan nilai sel setelah parsing. Excel desktop dan deployment pengguna belum diuji; lihat TEST_RESULTS_v1.7.3.md. File hanya mengekspor data yang tersimpan, tidak memulihkan digit yang sudah hilang atau mengganti nomor berdasarkan contoh percakapan.
