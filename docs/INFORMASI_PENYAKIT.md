# Informasi penyakit — versi PM

## Implementasi

- Petani: /dashboard/penyakit, pencarian nama/alias/gejala, filter bagian tanaman, empat kartu dengan gejala, pencegahan, tindakan awal, ciri pembeda dan sumber.
- Admin: /admin/penyakit, editor judul/ringkasan/gejala/pencegahan/tindakan awal serta draft/published. Bukan form tambah/hapus penyakit atau unggah foto.
- PATCH /api/diseases memeriksa sesi dan profiles.role=admin; RLS tetap aktif menggunakan client sesi, tanpa service-role. Metadata rujukan dan kredit tidak diterima dari browser. Versi updated_at mencegah penimpaan perubahan bersamaan.
- Simpan menyusun ulang content Markdown pada knowledge_entries, sehingga materi tetap dapat ditemukan retrieval teks SIMA. Tidak ada klaim vector search atau prioritas otomatis atas seluruh materi lama.
- Katalog mengambil category=Penyakit Tanaman, metadata.catalogue=pm-disease-v1 dan status=published. Editor Admin dapat melihat draft.

## Materi dan provenance

Empat materi baru: moler/layu Fusarium; bercak ungu/trotol; antraknosa/otomatis; embun bulu/tepung palsu. Istilah trotol ditempatkan pada bercak ungu, tidak diduplikasi sebagai label utama antraknosa.

Data awal: data/pm-diseases.json. Ringkasan ditulis ulang, bukan salinan lengkap artikel. Rujukan: Dinas Pertanian, Ketahanan Pangan dan Perikanan Kabupaten Buleleng (2019/2020), PDF Budidaya Bawang Merah BRMP Banten (tahun dokumen belum diketahui), serta buku Balitsa oleh Udiarto, Setiawati dan Suryaningsih (2005). Artikel/buku lama tidak dijadikan daftar dosis, merek atau status izin pestisida terkini. Materi belum divalidasi ahli dan bukan diagnosis lapangan.

Dataset Nganjuk yang ditemukan sebelumnya adalah statistik luas tambah serangan OPT 2025, bukan katalog foto/gejala. Implementasi ini tidak mengklaim koneksi API database dinas, kerja sama resmi, pemeriksaan POPT, atau statistik kejadian lokal yang belum dibaca/terverifikasi.

Foto tidak direhost, tidak dibuat AI, dan tidak disimpulkan dari nama file lama. Setiap kartu menyediakan tautan PDF resmi Balitsa: bercak ungu Gambar 9 (PDF 25), antraknosa Gambar 10 (PDF 26), embun bulu Gambar 11 (PDF 28), moler Gambar 12 (PDF 29), dengan kredit asli dan keterangan izin belum dikonfirmasi. Foto dalam halaman sumber tidak sama dengan izin menyalin. Kelengkapan galeri in-app menunggu foto berizin/hasil dokumentasi yang identitas penyakitnya dapat diverifikasi. Aset lama tidak dihapus, tetapi tidak dipakai sebagai foto terverifikasi pada katalog baru.

## Database dan pengulangan seed

Hanya proyek PM fdprawhpeoefpcnlbiya. Empat doc_id baru PM-DISEASE-* ditambahkan, tidak menimpa empat draft penyakit lama atau 35 dokumen lainnya. Total knowledge_entries menjadi 43 (39 lama + 4 katalog baru). Materi lama tetap published seperti kondisi sebelumnya; peninjauan keseluruhan KB RAG merupakan pekerjaan terpisah. Jangan menyebut seluruh KB telah terkurasi ahli.

scripts/print-disease-seed.cjs hanya mencetak SQL dari JSON dan helper content; tidak terhubung database. Snapshot SQL: docs/database/pm_disease_catalogue_seed.sql. ON CONFLICT DO NOTHING mempertahankan perubahan Admin pada pengulangan seed. Tidak ada perubahan skema/RLS, layanan berbayar, akun, bucket Storage atau kunci server baru.

## Verifikasi

- tests/diseases.test.cjs: data, pencarian, URL resmi, validasi input, peran, konflik versi, kegagalan database dan pelestarian provenance.
- docs/database/pm_disease_rls_rollback_test.sql: Admin edit/publish, Petani tidak dapat menulis, draft tidak terlihat oleh pembaca; semua fixture di-rollback.
- Sesudah seed dan uji rollback: 43 KB, 4 katalog, 2.685 regional, 22 legacy; 0 fixture tersisa.
- Galeri foto berizin, validasi agronomi, tambah/hapus katalog dan uji pengguna Petani dengan akun terpisah belum selesai.

Hasil akhir: 68 tes otomatis lulus, lint terarah lulus, build produksi lulus. Browser sesi Admin memverifikasi empat materi tampil, pencarian moler (1/4), pencarian kosong (0/4), reset (4/4), filter akar/umbi (1/4), dan perluasan panduan beserta rujukan foto. Tombol Simpan perubahan berhasil; updated_at berubah sementara hash content dan metadata tetap sama pada uji simpan tanpa perubahan isi. Uji ini tidak mengubah publikasi atau menambahkan akun. Perbandingan Origin menggunakan request Host karena URL internal Next dapat berbeda dari alamat browser; origin asing tetap ditolak (tes regresi tersendiri). Endpoint PATCH tanpa sesi mengembalikan 401. Hash konfigurasi lomba tetap sama.

Security advisor tidak menemukan temuan baru. Peringatan lama Leaked Password Protection Disabled masih ada; tidak diubah dalam pekerjaan ini. Panduan: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.

Bukti tampilan di folder output: SIMANTRI_Informasi_Penyakit.png dan SIMANTRI_Admin_Informasi_Penyakit.png.
