# Hasil uji v1.2.0
Tanggal: 21 Oktober 2026. Node 24.19.0; dependencies sesuai package-lock.json, tanpa upgrade versi dependency.

| Pemeriksaan | Status | Bukti / batas |
|---|---|---|
| Instalasi lockfile | PASS | npm ci --ignore-scripts |
| Tes regresi dan fitur | PASS | npm test: 33 tes, 0 gagal |
| Sintaks dan pemisahan secret | PASS | npm run lint |
| Build frontend | PASS | npm run build |
| Upgrade database berisi data | PASS | Fixture 001–006 dengan tasks/grades/targets/history, lalu 007; isi lama identik |
| Edit metadata tanpa mengubah nilai | PASS | Verifikasi database dan revisi |
| Rubrik sebelum dinilai / validasi / kode duplikat | PASS | Update sah; input tidak sah rollback |
| Proteksi struktur setelah nilai termasuk nol | PASS | Formatif dan sumatif ditolak server |
| Konflik revisi dan retry idempotent | PASS | Revisi lama ditolak; retry tidak menggandakan perubahan |
| Hapus terkait dan riwayat audit | PASS | Nilai/sasaran hilang; audit DELETE dan nilai lama tersimpan |
| Akses anon/siswa/guru nonaktif | PASS | Kedua operasi ditolak; guru aktif diizinkan |
| Semester arsip | PASS | Edit dan hapus ditolak |
| Tenant terpisah | NOT_APPLICABLE | Aplikasi sumber satu sekolah/database; peran guru mencakup sekolah |
| Browser, fokus dialog, mobile, visual nama pembuat | NOT_RUN | Source ditinjau dan JSX build lulus; tanpa pengujian browser |
| Hosted Auth/Supabase, Vercel deployment, WA nyata | NOT_RUN | Tidak ada akses deployment/integrasi hidup |
| Konkurensi multi-koneksi | NOT_RUN | PGlite satu koneksi; penguncian baris dan revisi diuji secara berurutan |

Laporan lama dalam TEST_RESULTS.md mencatat baseline paket sebelumnya. Laporan ini menjadi acuan perubahan v1.2.0.
