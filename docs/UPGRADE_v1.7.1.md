# Upgrade v1.7.0 → v1.7.1 — Ekspor CSV

Tidak ada migrasi SQL atau perubahan database. Deploy source v1.7.1 dan muat ulang browser. Pastikan /api/health dan footer menunjukkan 1.7.1. Pertahankan environment Vercel; nilai VITE harus terisi saat build. Jangan menjalankan ulang migrasi 001–011 jika sudah terpasang. Rollback cukup redeploy source v1.7.0 karena tidak ada perubahan skema/data.

## Pilihan ekspor

Di Siswa dan Kelas serta Rekap Nilai tersedia:

- **CSV untuk Excel**: NISN dan telepon divalidasi sebagai string digit, lalu ditulis sebagai ekspresi teks konstan, misalnya `="0012345678"`. Setelah escaping CSV, isi file mentahnya menjadi `"=""0012345678"""`. Excel dapat menampilkan hasil teks `0012345678`, bukan mengubahnya menjadi angka. Gunakan pilihan ini untuk membaca rekap di Excel, kemudian simpan sebagai `.xlsx` bila ingin menyimpan format kerja.
- **CSV standar**: seluruh field, termasuk header, diapit kutip ganda; contohnya `"0012345678"`. Tidak ditambahkan formula pada identifier. Cocok untuk pemrosesan data. Saat membuka melalui Excel, gunakan Data → From Text/CSV → Transform Data dan tetapkan kolom nisn serta registered_phone sebagai Text sebelum memuat data; hapus langkah Changed Type otomatis bila sudah mengubahnya menjadi angka.

Nol awal tidak dapat dipulihkan bila sudah hilang pada data sumber. Ekspor menolak identifier bertipe angka atau format rusak, bukan menambahkan nol tebakan. Nomor database yang dinormalisasi menjadi +62 tetap diekspor sebagai digit 62 seperti versi sebelumnya. Nomor sumber 08 tetap 08. Perbedaan 08 dan 62 merupakan format lokal/internasional, bukan kehilangan digit oleh CSV.

CSV tidak menyimpan tipe sel seperti XLSX. Tanda kutip adalah pembatas CSV dan biasanya tidak ditampilkan di dalam sel Excel. Untuk melihat kutip asli, buka CSV dengan editor teks. Source v1.7.0 yang dilampirkan sudah memakai quotes:true; tidak ada contoh CSV hasil unduhan pengguna yang tersedia untuk memastikan apakah deployment lama, pembacaan Excel, atau penyimpanan ulang menyebabkan kasus awal.

**Batas kompatibilitas:** CSV untuk Excel memakai ekspresi teks konstan, bukan format impor siswa REEV. Jangan unggah kembali file itu melalui Impor CSV. File rekap juga memiliki kolom tambahan sehingga bukan template impor tiga kolom. Gunakan Template CSV dan isi nisn,name,registered_phone sebagai teks untuk impor. Jika spreadsheet membuka formula sebagai teks mentah atau mode protected tidak mengevaluasinya, gunakan CSV standar lewat impor Text. Menyimpan ulang ke CSV dapat menghilangkan format; gunakan XLSX untuk hasil kerja Excel.

Hanya NISN/telepon yang lolos whitelist digit dan panjang yang diubah menjadi ekspresi konstan. Nama/kolom lain tidak dijadikan formula. Semua field tetap di-quote/escape oleh Papa Parse. File memakai UTF-8 BOM dan CRLF.

## Verifikasi penerimaan setelah deploy

1. Ekspor siswa uji dengan NISN berawalan 00. Buka CSV standar di editor teks: harus ada kutip dan seluruh digit awal.
2. Buka CSV untuk Excel: pastikan NISN/telepon tampil lengkap. Periksa nomor format 62 sesuai database.
3. Uji nama mengandung koma, kutip dan baris baru; semua harus tetap satu sel yang benar.
4. Uji ekspor dari direktori dan rekap dengan filter kelas/nama: seluruh hasil filter harus tetap tercakup sesuai batas lama.
5. Hindari perubahan data selama ekspor berhalaman. Batas ekspor dan filter mengikuti versi sebelumnya.

Rujukan Microsoft tentang konversi otomatis dan impor Text:
https://support.microsoft.com/en-us/excel/keeping-leading-zeros-and-large-numbers

Status: instalasi, tes parser/byte unduhan, sintaks dan build lokal diuji. Excel desktop asli, browser interaktif, Supabase hosted dan deploy Vercel belum diuji. Tidak ada klaim bahwa file di website aktif sudah berubah sebelum redeploy.
