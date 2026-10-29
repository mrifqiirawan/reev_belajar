# Verifikasi v1.7.1 — 29 Oktober 2026

- PASS: `npm ci` dengan lockfile; dependency tetap.
- PASS: `npm run lint` (sintaks server dan pemisahan secret).
- PASS: build cabang aplikasi lengkap dengan URL Supabase dan key publik placeholder. Warning ukuran chunk >500 kB tetap tercatat, bukan error build.
- PASS: `npm test` — 87 tes, 0 gagal. Termasuk regresi SQL/akun/tugas lama.
- PASS: byte CSV standar memakai kutip untuk NISN dan telepon berawalan nol; BOM UTF-8, CRLF, nama file unduhan.
- PASS: CSV Excel dibaca ulang oleh parser menjadi ekspresi teks konstan dengan digit lengkap; nama berkoma/kutip/multiline, nilai nol, telepon kosong tetap utuh.
- PASS: identifier angka, formula, notasi ilmiah, quote/newline berbahaya ditolak; kolom nama tidak dijadikan formula.
- PASS: CSV Excel ditolak oleh impor siswa, sedangkan CSV standar tiga kolom tetap dapat round-trip.
- NOT_RUN: pembukaan file pada Microsoft Excel desktop asli dan versi Excel lainnya.
- NOT_RUN: unduhan lewat browser interaktif, Supabase hosted, deployment Vercel.
- NOT_APPLICABLE: migrasi SQL baru dan TypeScript typecheck (source JavaScript).

Source CSV v1.7.0 sudah menggunakan quotes:true. Tidak ada file CSV hasil unduhan pengguna untuk reproduksi kejadian spesifik. Patch menambah mode presentasi Excel serta memusatkan validasi/pembentukan file; tidak mengklaim nol yang sudah hilang di database dapat dipulihkan.
