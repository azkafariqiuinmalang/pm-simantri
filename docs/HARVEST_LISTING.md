# Harvest Listing — implementasi prototype PM

Pembaruan: 2 November 2026. Hanya folder dan database SIMANTRI PM; versi lomba tidak diubah.

## Halaman

| Halaman | Alamat | Fungsi |
| --- | --- | --- |
| Marketplace Panen | `/dashboard/panen` | Penawaran published, pencarian judul/lokasi/varietas, filter varietas, urutan harga/terbaru, paginasi 12 item. |
| Kelola Panen Saya | `/dashboard/panen/saya` | Penawaran pemilik, filter status, edit, tarik pengajuan, tandai habis, hapus penawaran tidak aktif. |
| Penawaran baru | `/dashboard/panen/baru` | Detail komoditas, stok/harga, lokasi, foto, kontak; simpan draf atau ajukan. |
| Detail | `/dashboard/panen/[id]` | Foto, harga per kg, stok, tanggal panen, deskripsi dan kontak WhatsApp/telepon saat published. |
| Sunting | `/dashboard/panen/[id]/edit` | Pemilik memperbarui informasi; perubahan memerlukan pengajuan ulang. |
| Moderasi Admin | `/admin/panen` | Tinjau detail/foto, publikasikan pending, atau kembalikan dengan alasan perbaikan. |

Semua halaman dashboard memerlukan login. Admin tetap dapat mengakses halaman pengguna, tetapi perubahan konten milik orang lain tidak dilakukan melalui moderasi.

## Data dan status

Tabel `public.harvest_listings` dipertahankan; migrasi menambahkan `moderation_note`. Kepemilikan memakai `seller_id` dari sesi, bukan klaim browser. GET memakai RLS, mode marketplace selalu memfilter published; draf/pending/hidden/sold milik orang lain tidak muncul.

- Draf → pending setelah ada foto; pengajuan tidak langsung terbit.
- Pending → published oleh Admin, atau hidden disertai alasan 5–500 karakter.
- Pemilik dapat menarik pending/published menjadi draf.
- Published → sold oleh pemilik; sold dikeluarkan dari marketplace.
- Sunting/simpan → draf; pengajuan ulang → pending. Pemilik tidak dapat menerbitkan sendiri.
- Hapus hanya draft/hidden/sold milik sendiri. Tombol meminta konfirmasi pengguna terlebih dahulu.
- Pembaruan memakai `updated_at`; perubahan bersamaan mendapat 409 dan perlu muat ulang.

Server memvalidasi judul, lokasi, stok/harga positif, tanggal kalender, deskripsi, serta nomor WhatsApp Indonesia. Identitas, status publikasi dan catatan Admin tidak diterima sebagai bagian data form bebas.

## Foto

Bucket **pm-harvest bersifat privat**. Maksimal tiga foto per penawaran, 3 MB per foto; JPG/PNG/WebP. API memeriksa MIME dan signature berkas. Penawaran harus sudah menjadi draf sebelum unggah. Jalur foto: `seller_id/listing_id/random_uuid.ext`.

Pemilik hanya mengunggah ke draf sendiri. Foto disajikan melalui API yang memeriksa sesi dan hak baca listing, dengan cache privat/no-store. Pengguna lain hanya dapat membaca foto penawaran published. Tidak ada URL bucket publik atau service-role key di browser. Upload yang gagal tidak dilaporkan sebagai sukses; draf yang sudah tersimpan dipertahankan agar bisa dicoba lagi. Pembersihan objek yang tidak terpakai dilakukan setelah metadata dilepas; pemantauan orphan jangka panjang belum dijadwalkan.

## API

| Metode | Endpoint | Keterangan |
| --- | --- | --- |
| GET/POST | `/api/harvest` | Daftar sesuai scope; buat draf sendiri. |
| GET/PATCH/DELETE | `/api/harvest/[id]` | Detail, tindakan status/edit, dan penghapusan terbatas. |
| POST/GET | `/api/harvest/[id]/photos` | Unggah foto atau baca foto pada indeks yang boleh diakses. |

Mutasi memeriksa origin, sesi, peran dan kepemilikan. Aturan penting juga dijaga trigger database sehingga REST langsung tidak dapat dipakai menerbitkan penawaran sendiri atau menyunting data published tanpa peninjauan baru.

## Migrasi dan verifikasi

- `database/pm_harvest_listing_migration.sql` sudah diterapkan pada **fdprawhpeoefpcnlbiya** melalui SQL Editor Supabase. Bucket privat, kolom catatan, trigger dan tiga policy Storage diverifikasi tersedia.
- `database/pm_harvest_rollback_test.sql` lulus **17 pemeriksaan otorisasi** dalam transaksi rollback. RLS tetap aktif; fixture pengguna, listing dan metadata foto tidak disimpan. Mencakup kepemilikan, publikasi Admin, draf/foto privat, larangan mengubah published tanpa review, serta sold.
- Tes offline: **83 lulus**, termasuk validasi, origin, penolakan publikasi oleh pemilik, perubahan silang, konflik versi dan pengajuan tanpa foto.
- Pemeriksaan TypeScript, lint pada berkas yang diubah, dan build produksi lulus.
- Browser nyata: simpan draf → upload foto Supabase → muat ulang → ajukan → antrean Admin → publikasikan → marketplace/detail; foto termuat dari API dan nomor kontak membentuk tautan WhatsApp/telepon. Tidak ada pesan dikirim ke nomor contoh. Status published → sold dan sold → draft juga diuji melalui halaman pemilik; data contoh ditinggalkan sebagai draf, bukan penawaran aktif.
- Pencarian tanpa hasil ditampilkan dengan jelas, tanpa mengisi data contoh otomatis. Tampilan desktop 1440 px dan mobile 390 px diperiksa. Grid modul dibatasi minmax(0,1fr) agar konten tabel tidak memperlebar kartu pada layar kecil. Launcher SIMA disembunyikan pada modul baru agar tidak menutupi kontrol; panel tetap dapat dibuka dari pencarian/Ctrl+K dan halaman SIMA tetap ada di navigasi.

Satu penawaran browser diberi judul **UJI COBA PROTOTYPE — Panen Tajuk** dan deskripsi yang menjelaskan bahwa stok, harga dan nomor kontak adalah contoh. Data ini digunakan hanya untuk pemeriksaan aplikasi, bukan penawaran komersial atau hasil observasi petani.

## Desain dan batas

Sembilan HTML dan screenshot asli Stitch tersimpan di `../output/stitch-pm-ui` (di luar root aplikasi). Desain diadaptasi ke komponen React yang memakai data nyata. Contoh rating, jumlah kontak masuk, SLA respons, sertifikasi mutu, transaksi dan harga Nganjuk pada hasil generate tidak dijadikan klaim aplikasi.

PIHPS tetap memisahkan empat jenis harga beserta tanggal/cakupannya, dengan riwayat maksimal 60 hari. Kartu harga membaca provinsi yang dipilih; angka kosong tidak diganti seri lain atau estimasi nasional. Katalog penyakit mempertahankan rujukan pemerintah dan tautan foto PDF. Foto penyakit hasil generate tidak digunakan sebagai foto ilmiah terverifikasi.

Prototype belum diuji bersama petani di lapangan dan belum disebarluaskan. Pembayaran, checkout, logistik, rating, jaminan mutu fisik, audit moderasi historis lengkap, dan penjualan aktual tidak termasuk implementasi ini. Teks baru Harvest Listing memakai bahasa Indonesia; konten pengguna dan istilah teknis tidak diterjemahkan otomatis. Uji skala besar dan peninjauan izin foto penyakit lanjutan belum dilakukan.
