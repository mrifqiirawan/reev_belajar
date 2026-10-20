# Keputusan arsitektur dan audit — 13 Oktober 2026

Website + API singkat: React/Vite dan Vercel. Identitas/data: Supabase Auth + PostgreSQL + RLS. Baileys: Gateway v2.7.3 di VPS atau Windows, satu socket per sesi. Alternatif seluruh website di VPS tetap memakai Supabase cloud. Mode Windows membutuhkan internet dan komputer menyala. Ini aplikasi satu mata pelajaran per project Supabase; seluruh guru aktif merupakan pengelola ruang tersebut. Untuk banyak mapel terisolasi, gunakan project terpisah; jangan menganggap aplikasi ini multi-tenant.

## Hasil audit referensi

INPRO: 27 entri arsip; modul nilai, siswa, kehadiran, semester, bintang, hati, audit dan backup. CalculationService memasukkan status Belum ke pembagi dengan nilai nol dan mengalikan nilai dengan faktor hati. Perilaku itu bertentangan dengan PRD baru dan tidak disalin. REEV BELAJAR mengabaikan nilai NULL, mempertahankan nol, memisahkan rata-rata formatif/sumatif, dan tidak menggunakan hati sebagai pengurang nilai. Data siswa/akun lama tidak dimigrasikan otomatis; instalasi memakai database proyek baru. Database lama tidak disentuh.

Gateway: 63 entri arsip; Node >=22.12 <25; autentikasi REST Bearer untuk POST /api/messages/send, bukan GET status perangkat. Webhook HMAC SHA256 atas JSON bytes asli, header X-REEV-Signature berbentuk sha256=hex. Payload {id,event,timestamp,deviceId,data}; pesan masuk menggunakan data.sourceMessageId, remoteJid, senderNumber, messageText. dispatch dapat membuat dua event berbeda untuk satu pesan asli: deduplikasi memakai deviceId + remoteJid + sourceMessageId. Gateway melarang target webhook HTTP privat; mode lokal menggunakan adapter dalam proses yang sama.

Tidak ditemukan berkas LICENSE pada kedua ZIP. Karena hak redistribusi tidak dinyatakan, paket ini tidak menyertakan ulang source atau aset gateway/INPRO. Aplikasi ditulis terpisah; operator memasang adapter pada salinan Gateway miliknya sendiri. Tidak ada perubahan pada sesi, dashboard autentikasi, atau transport Baileys referensi. Sebelum mendistribusikan ulang Gateway, periksa hak/lisensi dengan pemiliknya.

Excel acuan memiliki sheet formatif/sumatif, kehadiran, partisipasi, dan nilai akhir. Acuan rubrik digunakan, tetapi data pribadi siswa dan rumus rapor berbobot Excel tidak otomatis diimpor. Ada label kelas yang tidak seragam dalam workbook; kelas dipilih eksplisit saat impor CSV. PRD tetap menentukan formula aplikasi. NISN adalah teks 5–20 digit untuk mempertahankan contoh PRD yang lebih panjang dari 10 digit.

## Kontrak, integritas dan batas akses

- Client hanya SELECT sesuai RLS. INSERT/UPDATE/DELETE melalui reev_mutate(op,p,request_id) dengan teacher aktif dari auth.uid(). Role tidak bersumber dari user_metadata.
- private.mutate menyimpan transaksi, ledger/history, audit, idempotency dalam transaksi PostgreSQL. ID permintaan yang sama dengan payload lain ditolak. Batch invalid rollback seluruhnya.
- Rekap/view security_invoker mengikuti RLS. Guru mengakses satu ruang mapel; siswa aktif hanya data sendiri. Tidak ada pendaftaran publik. Bootstrap privat membuat Auth dan profil dengan kompensasi.
- Data task_targets adalah snapshot anggota kelas saat tugas dibuat. Perpindahan kelas mempertahankan sasaran tugas lama. Siswa baru tidak otomatis menjadi sasaran tugas lama.
- Skor formatif mentah 0..max_score dinormalisasi 0..100. Sumatif = sum(skor × bobot)/sum(maksimum × bobot) ×100. Bobot default 1; bukan asumsi selalu empat aspek. Rubrik tugas yang sudah dibuat tidak diubah agar histori tetap dapat dibandingkan.
- Rata-rata formatif hanya nilai numerik. Ketuntasan formatif kelas dibagi seluruh siswa aktif; rekap satu asesmen dibagi peserta dengan hasil valid. Persentase tanpa denominator ditampilkan —.
- Bonus bintang tersimpan sebagai aturan opsional. Nilai akademik asli tidak diubah. Rumus bonus = saldo bintang/stars_per_percent persen; gunakan laporan asli saat menilai akademik.
- Hati awal wajib dikonfigurasi; saat pelanggaran pertama dibuat saldo awal dibukukan satu kali untuk siswa/semester. Tiap pelanggaran membukukan -1, termasuk ketika tampilan mencapai minimum. Pemulihan Selesai + restore=true membutuhkan aturan restore_hearts=true; pembatalan mencatat +1 koreksi. Minimum hanya batas tampilan, tidak menghapus utang ledger. Mengubah hati awal tidak menulis ulang ledger yang telah ada.
- Nomor terdaftar harus disetujui guru. .daftar hanya cocok untuk nomor tersebut. Nomor yang tidak cocok diminta verifikasi guru; tidak ada OTP yang dapat ditebak. Penggantian nomor/nonaktif/penarikan verifikasi melepas tautan.
- Guru WA: allowlist harus terhubung profil teacher aktif. Token UUID konfirmasi (acak), 5 menit, sekali pakai, terikat actor dan nomor. Konfirmasi baru membatalkan yang lama. Batas 12 perintah/nomor/menit tersimpan di database. Setelah limit, tidak mengirim balasan tambahan.
- .nilai via WhatsApp berlaku untuk formatif; sumatif harus diisi per aspek melalui website agar tidak menciptakan komponen rubrik fiktif. Ini pembatasan eksplisit versi ini terhadap format perintah nilai umum dalam PRD.
- Event webhook valid maksimal selisih 5 menit, satu device terkonfigurasi, HMAC raw body, maksimum 64 KiB. JID grup/broadcast ditolak. LID diterima hanya dengan nomor hasil resolusi Gateway terpercaya; tidak menebak nomor dari LID. Shared secret minimum 32 karakter.
- Balasan persisten via outbox; claim atomik queued→sending. Timeout/kegagalan tanpa receipt pasti menjadi unknown; tidak diulang otomatis. Crash setelah claim menyisakan sending; operator menandainya unknown setelah memeriksa Gateway. Tidak menjanjikan exactly-once pengiriman ke provider. Receipt tidak menurunkan read/delivered menjadi sent.
- Audit berisi data operasional; hanya guru dapat membaca. Batasi retensi sesuai kebijakan sekolah. Secret dan password tidak ditulis ke audit aplikasi.

## Kinerja dan batas yang terlihat

Daftar utama 25 baris per halaman; pencarian nama/materi server dengan debounce. Rekap dashboard dihitung DB. Master kelas maksimum 200, semester 100, akun 200, anggota tabel batch 200, impor CSV 500 baris/1 MiB. CSV seluruh filter maksimal 10.000 siswa, bukan hanya halaman aktif. Hindari perubahan data saat ekspor berhalaman; untuk snapshot konsisten gunakan pg_dump. Target dua detik belum diukur pada hosted deployment. Tidak ada cache data lintas akun, polling otomatis, atau dukungan offline.

## Dokumentasi resmi diperiksa

- https://vercel.com/docs/functions/limitations — durasi eksekusi terbatas, bukan daemon.
- https://supabase.com/docs/guides/functions/limits — wall clock/resource Edge Functions terbatas.
- https://supabase.com/docs/guides/database/postgres/row-level-security — RLS dan identitas pengguna.
- https://github.com/WhiskeySockets/Baileys — transport tetap milik paket Gateway pengguna.

Versi paket benar-benar terpasang berada di package-lock.json; versi diperiksa via npm registry. Tidak ada asumsi kuota/harga hosting tetap. Status pengujian hosted, browser, dan perangkat ada di TEST_RESULTS.md.
