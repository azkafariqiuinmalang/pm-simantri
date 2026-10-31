# Catatan perapian SIMANTRI PM

## Pembersihan lanjutan — 26 Oktober 2026

Atas permintaan pengguna, pembersihan dibatasi pada D:/SEMESTER 5/PROJECT MANEJEMEN/PM (SIMANTRI). Tidak ada tindakan terhadap database cloud, folder lomba, artefak proposal/PPT di direktori induk, atau arsip pemulihan 20 Oktober.

- Dihapus permanen karena dapat dibuat ulang: .next lama, tsconfig.tsbuildinfo, dependensi/build/render proyek video, dan dependensi Python eksperimen forecasting.
- Dipindahkan ke Recycle Bin: sisa proyek video (sumber dan asetnya), scratch (termasuk hasil evaluasi dan backup environment lama), ml referensi, dokumen/diagram/desain/skema lomba, PRD/progress/query guidelines versi lomba, mockup UI, video lomba dan aset template Next yang tidak digunakan.
- Komponen tidak terhubung dikeluarkan: TiltCard dan experience.tsx lama. Dunia Brambang aktif memakai iframe public/dunia-brambang.html beserta audio-nya; keduanya tidak dihapus. Dependensi npm gsap/tone tidak lagi diperlukan oleh aplikasi setelah komponen lama dikeluarkan; HTML edukasi tetap memiliki implementasi animasi dan audio sendiri.
- PlatformVideoDemo diganti ringkasan PlatformModules untuk empat modul PM. Tidak menampilkan video CV/forecasting lagi. Referensi logo disatukan ke aset logo_simantri.png yang tersedia; tidak menyisakan URL file yang baru dihapus. Status Harvest Listing tetap jujur: belum aktif.
- Panduan lokal diganti instruksi PM tanpa Python/layanan CV, tanpa kunci versi lomba. tsconfig/eslint tidak lagi menunjuk proyek video yang dihapus.
- Tetap dipertahankan: .git, .agents, dependensi Next/React/Supabase utama, konfigurasi PM aktif, seluruh knowledge_base, data PM, CSV PIHPS referensi, kode/API empat modul, pengujian, dokumen PM dan aset yang masih dirujuk.

Hasil penghapusan awal: 3.384.123.381 menjadi 722.492.713 byte, selisih 2.661.630.668 byte (sekitar 2,66 GB desimal), sebelum build verifikasi baru dan pengurangan dependensi npm. Jumlah file 63.715 menjadi 35.854. Angka mencakup .git dan node_modules; bukan ukuran source saja. Detail target, ukuran awal, dan metode pemulihan tersedia di PM_CLEANUP_2026-10-26.json. Sebanyak 50 file dilindungi dengan perbandingan hash, termasuk 39 knowledge base, aset Dunia Brambang, konfigurasi PM dan kode modul utama. Hash konfigurasi lomba juga tetap sama.

File sumber lama dapat dipulihkan melalui Recycle Bin selama belum dikosongkan. Cache/dependensi/output yang dihapus permanen tidak ada di Recycle Bin dan harus dibuat ulang bila diperlukan. Berkurangnya ukuran folder PM tidak persis sama dengan ruang disk kosong karena file recoverable masih berada di Recycle Bin. Pembersihan tidak mengosongkan Recycle Bin atau mengubah riwayat Git.

Skrip scripts/cleanup-pm-workspace.ps1 tanpa argumen hanya mengaudit. Opsi -Apply dibatasi ke folder PM yang tepat, memakai daftar target eksplisit, menolak junction/symlink/repository tertanam, serta menolak penghapusan output saat Node berjalan. Jangan menjalankan ulang sekadar untuk menghitung ukuran: opsi -Apply juga menghapus build baru.

### Verifikasi akhir

- 72 tes otomatis lulus; lint terarah dan diff whitespace check lulus. Tes baru memeriksa ketiadaan sisa lomba, pelestarian modul/data, aset lokal yang dirujuk TSX, dan panduan lokal PM.
- Build produksi dari nol berhasil menggunakan mode --webpack bawaan Next.js. Percobaan awal terbatas jaringan gagal mengunduh Google Fonts; Turbopack dengan jaringan mengalami kegagalan proses internal di Windows. Kode/config aplikasi tidak diubah untuk menyembunyikan masalah ini; perintah fallback dicantumkan pada panduan lokal. Peringatan middleware/Edge bawaan framework tetap ada.
- Server hasil build tersedia di http://127.0.0.1:3000. Landing, Dunia Brambang, dan HTML edukasi masing-masing merespons 200. Halaman penyakit tanpa sesi merespons 307 ke /login; tidak ada bypass autentikasi.
- Browser menampilkan empat modul PM tanpa video lomba. Bukti: D:/SEMESTER 5/PROJECT MANEJEMEN/output/SIMANTRI_PM_Setelah_Pembersihan_2026-10-26.png.
- Setelah menghapus lima paket npm tak terpakai dan cache build verifikasi baru, snapshot ukuran akhir 716.272.331 byte, 30.905 file. Pengurangan bersih sekitar 2,67 GB (78,8%). Node_modules utama 479.342.308 byte, .git 218.695.060 byte, sisanya source/aset/hasil build yang diperlukan 18.234.963 byte. Akses aplikasi berikutnya dapat membuat cache kecil kembali.
- Tidak ada perubahan database cloud atau folder lomba. Hash environment lomba tetap sama. Manifest akhir: PM_CLEANUP_FINAL_2026-10-26.json.

## Catatan historis — 20 Oktober 2026

> Catatan ini merekam tahap sebelum pemisahan database. Tahap lanjutan pada tanggal yang sama sudah membuat proyek Supabase PM terpisah dan mengganti .env.local PM. Status terbaru ada di PM_DATABASE_SETUP.md; pernyataan koneksi bersama di bawah merupakan kondisi historis sebelum pemisahan.

## Perubahan yang dilaksanakan

- Dunia Brambang beserta HTML, foto, dan audio tetap dipertahankan.
- Rute CV, feedback hasil deteksi, prediksi harga, sinyal wilayah, verifikasi Penyuluh, usulan dan tinjau usulan dikeluarkan dari aplikasi aktif.
- Layanan/model/dataset CV serta forecasting Python dipindahkan ke arsip pemulihan. Ini termasuk perubahan training yang sebelumnya belum terlacak Git; tidak ditimpa atau dibuang.
- Dashboard, navigasi, profil, registrasi, metadata, dan deskripsi layanan disesuaikan. Registrasi hanya Petani; Admin diperiksa melalui profil database di server.
- Pipeline PIHPS dipisahkan dari cuaca dan forecasting. Harga nasional/angka Rp15.000 tidak lagi dijadikan pengganti harga Jawa Timur.
- Tombol sinkronisasi Admin memakai endpoint PIHPS, bukan menyimpan Rp29.000 konstan.
- Data kosong dan kegagalan API ditampilkan sebagai status; tidak diisi harga contoh.
- Market Insight memiliki perbandingan harga produsen antarprovinsi per tanggal dan riwayat provinsi sampai 30 hari kalender.
- Katalog penyakit awal membaca knowledge_entries terpublikasi. Foto bercak ungu memakai aset referensi yang sudah ada; gambar untuk penyakit lain dan CRUD Admin belum dilengkapi.
- Harvest Listing tetap pekerjaan berikutnya, bukan fitur yang diklaim selesai.
- RAG dipertahankan. Prompt menegaskan tidak ada analisis foto, ramalan harga, harga live percakapan, atau transaksi yang belum diimplementasikan.
- Video landing diberi label arsip lomba. Mockup harga pada landing diberi label data simulasi; bukan data Market Insight.

## Data dan lingkungan

Koneksi Supabase salinan PM terdeteksi sama dengan versi lomba. .env.local tidak diubah dan tidak ada migrasi, penghapusan tabel, sinkronisasi live, ataupun perubahan data yang dijalankan dalam perapian.

.env.example kini hanya berisi placeholder. Pisahkan database/storage, terapkan skema/RLS PM pada proyek baru, dan tinjau sumber data lama sebelum migrasi. Label source=scraping tidak cukup untuk memverifikasi provenance catatan lama. Periksa juga apakah RPC upsert yang digunakan sudah tersedia di database PM baru.

## Arsip dan pemulihan

Arsip: D:/SEMESTER 5/PROJECT MANEJEMEN/archive/SIMANTRI_PM_before_cleanup_2026-10-20

- src/: salinan kode sebelum perapian.
- disabled/src/: rute fitur lomba yang dinonaktifkan.
- disabled/ml/: layanan dan aset model yang tidak digunakan PM.
- README.md dan PROJECT_CONTEXT.md: versi dokumen sebelum perapian.
- stale-next-dev-types/: cache tipe rute lama yang sudah tidak sesuai.

Tidak ada perubahan yang dilakukan pada D:/SIMANTRI (Sistem Informasi).
Perubahan pengguna sebelumnya pada eslint.config.mjs, tsconfig.json, dan remotion-video dipertahankan.

## Verifikasi dan pekerjaan berikutnya

Tes unit lokal memeriksa parser PIHPS, tanggal, data kosong, wilayah tanpa publikasi, kegagalan upstream/RPC, peran pengguna, absennya rute lama, RAG, i18n, tema, carousel, serta audio Dunia Brambang. Semua akses eksternal dalam tes tersebut menggunakan mock.

Belum dilakukan: audit data Supabase, pembuktian integrasi live PIHPS/RAG pada database PM baru, pengujian pengguna terautentikasi, migrasi skema PM, CRUD katalog, dan implementasi Harvest Listing.

Hasil verifikasi lokal: 33 tes lulus, TypeScript lulus, dan build produksi berhasil. Build pertama terhambat unduhan Google Fonts; pengulangan dengan akses jaringan berhasil tanpa mengubah konfigurasi font. Pemeriksaan HTTP lokal memastikan halaman publik dan Dunia Brambang merespons 200, halaman Admin/Dashboard tanpa login mengarah ke login, API harga tanpa login merespons 401, serta endpoint CV/prediksi dan halaman deteksi lama merespons 404. Tidak dilakukan uji visual browser atau transaksi pengguna terautentikasi. Middleware lama masih memunculkan peringatan deprecation bawaan Next.js; migrasi ke proxy belum termasuk perubahan ini.
