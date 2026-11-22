# Verifikasi Rencana Usaha Tani

Tanggal: 21 November 2026, Asia/Jakarta. Cakupan: implementasi fitur baru pada salinan PM dan tabel Supabase PM. Pemeriksaan ini tidak menyatakan UAT pengguna telah selesai atau fitur telah dipublikasikan ke Vercel.

## Bukti fungsional

| Pemeriksaan | Hasil dan bukti |
| --- | --- |
| Regresi otomatis | PASS: 122 tes, 0 gagal; 24 tes khusus pada `tests/farm-plans.test.cjs`. Kasus mencakup dua jalur, kebutuhan berdasarkan luas, pengeluaran tanpa hitung ganda, kelebihan anggaran, penjualan sebagian, tebasan, hasil 0 kg, validasi, sesi, dan konflik versi. |
| Database PM | PASS: tabel `farm_plans` dibuat melalui migrasi `pm_farm_business_plans`, disusul batas ukuran `pm_farm_plan_payload_limit`; RLS aktif. |
| Akses database lintas akun | PASS: pemilik membaca/mengubah sendiri; Petani lain tidak dapat membaca/mengubah/menghapus; Admin tidak dapat membaca keuangan milik akun lain; pemalsuan pemilik dan pengubahan versi klien ditolak. Bukti eksekusi `docs/database/pm_farm_plans_rollback_test.sql`; seluruh fixture dibatalkan. |
| Validasi database | PASS: versi naik saat ubah; penjualan melebihi hasil aktual, penutupan musim tanpa konfirmasi, kategori null, dan tanggal tidak valid ditolak dalam uji rollback. |
| API lokal tanpa sesi | PASS: `/dashboard/rencana` mengarahkan ke `/login` (307); GET dan POST `/api/farm-plans` mengembalikan 401 dengan `Cache-Control: private, no-store`. |
| Build | PASS menggunakan `npm run build -- --webpack`. Mode Turbopack pada komputer ini mengalami kegagalan proses pekerja lokal; tidak diatasi dengan mengubah konfigurasi produksi. Build final diulang setelah penyempurnaan terakhir. |
| Advisor keamanan Supabase | Tidak ada temuan tabel/fungsi baru. Peringatan yang sudah ada mengenai leaked-password protection Auth tetap tercatat; tidak ada pengubahan pengaturan Auth dalam pekerjaan ini. |
| Uji simpan melalui UI Petani | BELUM DIVERIFIKASI: sesi lokal memerlukan login pengguna. Tidak dinyatakan lulus berdasarkan pratinjau visual. |

## Pemeriksaan tampilan

Komponen aktual dirender secara terpisah untuk pemeriksaan visual, memakai data contoh yang ditandai jelas. Pratinjau tidak menulis ke database dan tidak menggantikan pengujian sesi Petani. Bukti gambar berada di folder `../output/` dari root repositori:

- `SIMANTRI_Rencana_Usaha_Tani_Pratinjau_Desktop.jpg` — 1440 × 1000.
- `SIMANTRI_Rencana_Usaha_Tani_Pratinjau_Mobile.jpg` — 375 × 900.
- `SIMANTRI_Rencana_Usaha_Tani_Pratinjau_Dark.jpg` — 1440 × 1000.

Lebar dokumen pada viewport 375, 768, 1024, dan 1440 tidak melebihi viewport. Tabel rincian memakai wadah gulir tersendiri. Semua kontrol data awal yang terlihat memiliki label terkait.

## Audit antarmuka dan aksesibilitas

| Item | Status | Bukti / batas pemeriksaan |
| --- | --- | --- |
| Palet sesuai merek, tanpa aksen ungu atau teks gradien baru | PASS | `src/app/farm-plans.css`; hijau SIMANTRI dari palet aplikasi yang sudah ada. |
| Tipografi judul dan isi dibedakan | PASS | Manrope untuk judul, Plus Jakarta Sans dari aplikasi untuk isi; sumber font `src/app/layout.tsx`. |
| Kontras teks | PASS | Tampilan gelap: teks bantuan/surface 11,16:1; hasil dan tombol utama 8,16:1; isian 14,30:1. Palet terang memakai teks #435349 pada putih dan #17241d pada putih; panel utama #0e5b38 dengan putih. |
| Tata letak sesuai isi, tanpa pengulangan tiga kartu generik | PASS | Dua jalur awal, tabel rincian, formulir, dan panel hasil; pratinjau desktop/mobile. Full-bleed pemasaran N-A untuk formulir dalam dashboard. |
| Radius dan umpan balik kontrol konsisten | PASS | Skala radius 4/8/12 px; perubahan warna 150 ms; tidak menambah hover berskala, kaca, atau ikon emoji. |
| Angka aktual/estimasi/contoh dibedakan | PASS | Biaya dan hasil awal kosong; label estimasi dan hasil tercatat; banner data contoh pada bukti visual. |
| Landmark | PASS | Fitur berada dalam main pada DashboardShell; formulir menggunakan section, heading, dan fieldset. Tidak membuat main/header/nav kedua di editor. |
| Tombol dan tautan semantik | PASS | `PlanEditor.tsx`, `PlanLedgers.tsx`, dan `PlanList.tsx`; tidak memakai div yang diklik. |
| Dialog | PASS | Penghapusan menggunakan dialog native `showModal`, judul terkait, tombol Batal autofocus, dan Escape native. Tidak ada penghapusan data pengguna dalam uji visual. |
| Pilihan input | PASS | Native select dan checkbox berlabel; grup pilihan bagian memakai button dengan aria-pressed. |
| Label ikon dan gambar | PASS / N-A | Ikon Lucide dekoratif aria-hidden dan tombol berteks. Tidak ada gambar konten baru dalam fitur ini. |
| Rahasia dan injeksi HTML | PASS | Komponen tidak memiliki key/rahasia, HTML mentah, maupun akses service-role. Perhitungan dan teks dirender oleh React. |
| Pembacaan data | PASS | Daftar dan detail dibaca di Server Component menggunakan sesi serta filter pemilik; mutasi melalui API terautentikasi. |
| Fokus, label, dan validasi | PASS | Gaya fokus aplikasi dipertahankan; input berlabel; batas numerik/tanggal dan pesan kesalahan tersedia; ringkasan kesalahan menerima fokus. |
| Status tidak bergantung warna | PASS | Untung/rugi, tersimpan, dan kesalahan dinyatakan dalam teks. |
| Reduced motion | PASS | Semua animasi/transisi dalam `.farm-page` dinonaktifkan pada preferensi reduced motion. |
| Uji klik/simpan lintas akun melalui UI penuh | BELUM DIVERIFIKASI | Menunggu sesi Petani. Keamanan database diuji terpisah; tidak diklaim sebagai UAT antarmuka. |

Tidak ada perubahan pada aplikasi/database SIMANTRI lomba, tidak ada biaya layanan berbayar baru, dan tidak ada klaim transaksi atau laba petani yang direkayasa sebagai aktual.
