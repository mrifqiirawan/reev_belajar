> **Versi terbaru v1.7.0:** ikuti [UPGRADE_v1.7.0.md](UPGRADE_v1.7.0.md). Hapus siswa kini permanen di seluruh semester; migrasi 011 wajib. Keterangan versi lama di bawah adalah referensi historis bila bertentangan.

# Matriks penerimaan

| requirement | implementation | status | evidence_or_limit |
|---|---|---|---|
| Arsitektur hybrid | React Vercel Supabase dan Gateway persisten | IMPLEMENTED | docs/ARCHITECTURE.md |
| Tujuh menu | src/main.jsx | IMPLEMENTED | Build PASS; browser NOT_RUN |
| Auth guru dan siswa | Supabase Auth plus profiles RLS | IMPLEMENTED | RLS lokal PASS; hosted NOT_RUN |
| Kelas siswa CSV | reev_mutate student class import_students | IMPLEMENTED | Create-only 500 baris; rollback PASS |
| Semester pengaturan | reev_mutate semester settings | IMPLEMENTED | Satu semester aktif; akun via bootstrap privat |
| Formatif nol dan NULL | grades dan student_summary | IMPLEMENTED | Test PASS |
| Sumatif rubrik dinamis | reev_mutate grades | IMPLEMENTED | Normalisasi berbobot PASS |
| Riwayat koreksi | grade_history audit trigger | IMPLEMENTED | Atomic history PASS; tampilan 25 terbaru |
| Kehadiran | meeting attendance dan rekap | IMPLEMENTED | Validasi membership PASS |
| Bintang | star_transactions dan reversal | IMPLEMENTED | Reversal sekali PASS |
| Hati pelanggaran | heart_transactions violations | IMPLEMENTED | Initial deduction restore PASS |
| Penautan WhatsApp | reev_bot daftar | IMPLEMENTED | Nomor disetujui guru wajib; tanpa OTP |
| Perintah siswa | reev_bot bot_profile | IMPLEMENTED | Dibatasi 20 tugas atau 10 riwayat terbaru |
| Perintah guru nilai | reev_bot nilai | PARTIAL | Formatif melalui WA; sumatif lewat rubrik website |
| Konfirmasi dan deduplikasi | pending_confirmations dan command_logs | IMPLEMENTED | Token expired/reuse dan duplicate PASS |
| Webhook HMAC | server/webhook.mjs api/webhook.mjs | IMPLEMENTED | 401 400 413 tests PASS |
| Gateway lokal | attach-gateway.mjs gateway-adapter.mjs | IMPLEMENTED | Regresi Gateway 29 PASS; koneksi aktif NOT_RUN |
| Deploy | vercel.json deploy dan panduan | NOT_RUN | Tanpa akses proyek hosted |
| Windows | run.bat launch.mjs | NOT_RUN | Source tersedia; perangkat Windows belum diuji |
| Backup restore | Prosedur pg_dump DATA_DIR dan staging | NOT_RUN | Tanpa environment hosted untuk restore |
| Performa dua detik | Query terbatas dan aggregate DB | NOT_RUN | Belum benchmark hosted |

## Tambahan v1.2.0

| Kebutuhan | Implementasi | Bukti |
|---|---|---|
| Edit asesmen | Dialog guru dan RPC reev_manage_task | Tes database PASS |
| Hapus asesmen dan nilai | Konfirmasi kode, transaksi, audit | Tes database PASS |
| Identitas pembuat | Login, footer, Pengaturan | Source + build PASS; visual browser NOT_RUN |
| Upgrade data lama | Migrasi 007 | Fixture data 001–006 dipertahankan PASS |

## Tambahan v1.2.1
- Input skor → status Dinilai → payload RPC → nilai tersimpan, history old/new dan rekap: PASS pada tes lokal.
- Nilai nol, pratinjau normalisasi, feedback-only, aspek kosong: PASS.
- Build dan semua 37 tes: PASS.
- Verifikasi browser dan deploy hosted: NOT_RUN; checklist di UPGRADE_v1.2.1.md.

## v1.3.0
| Permintaan | Implementasi | Verifikasi |
|---|---|---|
| Input semua tugas per siswa | Tombol Isi semua tugas; dialog formatif/sumatif; RPC transaksi | PASS lokal |
| Nama A–Z | Pengurutan nama ternormalisasi sebelum limit/pagination | PASS SQL |
| Ketuntasan saat nilai belum lengkap | formative_total / formative_graded + rata-rata KKTP | PASS lokal |
| Error Pengaturan UUID true | Handler mengecualikan ID settings dari konversi UUID + payload whitelist | PASS regresi |
| Data lama aman | Migrasi 008 tanpa mutasi baris data | PASS perbandingan sebelum/sesudah |
| UI interaktif hosted | Checklist UPGRADE_v1.3.0.md | NOT_RUN |

## Revisi CSV v1.3.0
Validasi kutip NISN/telepon, NISN 10 digit, alias header, ekspor berkutip: PASS unit/regresi. Penggunaan langsung Excel dan browser: NOT_RUN. Panduan: CSV_SISWA.md.
