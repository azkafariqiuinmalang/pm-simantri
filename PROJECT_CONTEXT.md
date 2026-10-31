# SIMANTRI — konteks aktif versi PM

Konteks ini menggantikan arah versi lomba untuk salinan di folder PM (SIMANTRI).
Nama: Sistem Informasi Pertanian Bawang Merah Terintegrasi.
Outcome: prototype software untuk uji coba terbatas, bukan peluncuran publik.

PRD khusus PM tersedia di PRD.md (versi 1.0, 26 Oktober 2026), berstatus baseline untuk review tim. Dokumen merinci kebutuhan, kriteria penerimaan dan gap; tidak menyatakan semua fitur telah selesai atau menggantikan WBS/jadwal/RAB. PRD PM baru dipertahankan dan tidak termasuk target pembersihan PRD lomba lama.

## Empat modul yang disepakati

1. Informasi penyakit: katalog empat penyakit berujukan publikasi pemerintah, pencarian nama/gejala, filter bagian tanaman, pencegahan, tindakan awal dan ciri pembeda. Petani membaca katalog published; Admin menyunting empat materi awal dan mengatur draft/published. Foto dirujuk lewat halaman PDF resmi beserta kredit, belum direhost karena izin belum terkonfirmasi. Tidak ada diagnosis otomatis.
2. AI Assistant RAG (SIMA): pencarian knowledge base dan jawaban dengan rujukan. Implementasi saat ini menggunakan pencarian teks/keyword Supabase, bukan klaim vector search.
3. Market Insight PIHPS: empat jenis harga dipisahkan (4 Produsen sebagai default, 3 Pedagang Besar, 1 Pasar Tradisional, 2 Pasar Modern). Pilihan jenis mengubah sumber, cakupan, tabel provinsi, dan grafik tanpa membawa data seri sebelumnya. Tombol utama Admin "Sinkronisasi harga terbaru" mengambil keempat jenis dengan tanggal asli sumber. Opsi rentang 1/7/30/60 hari tersedia untuk pemulihan data; hanya tanggal dalam jendela 60 hari terakhir diterima. Setelah sinkronisasi lengkap tanpa kegagalan/pembatalan dan sedikitnya satu publikasi tersimpan, riwayat kedaluwarsa dibersihkan. Grafik 7/30/60 hari; tanpa forecasting. Data Jumat tidak dilabel ulang sebagai Sabtu/Minggu. Tidak ada cron maupun penghapusan otomatis pada tengah malam.
4. Harvest Listing: listing panen, foto, status, pencarian, kontak penjual, dan moderasi. Belum diimplementasikan; halaman /dashboard/panen hanya penanda pekerjaan berikutnya.

Pendukung: login/profil, peran Petani/Admin, penyimpanan, keamanan, tema dan bahasa.
Dunia Brambang DIPERTAHANKAN sebagai landing page/media edukasi, bukan model AI.

## Di luar scope

Computer Vision/YOLO, diagnosis otomatis foto, XGBoost/forecasting harga, data cuaca pendukung model, akun/verifikasi Penyuluh, sinyal wilayah hasil CV, usulan pengetahuan komunitas. Juga tidak mencakup SAW/TOPSIS, pembayaran, logistik, IoT, atau aplikasi native.

Konsultasi kepada penyuluh di dunia nyata tetap merupakan saran agronomi yang sah; jangan menghapus kata penyuluh dari seluruh referensi secara membabi buta.

## Batas keamanan

- Jangan mengubah folder sumber D:/SIMANTRI (Sistem Informasi).
- Pada 20 Oktober 2026, koneksi PM sudah dipisahkan ke proyek simantri-pm (fdprawhpeoefpcnlbiya), region Singapore, organisasi tpoermyccfoeqdbwslri, paket Free. .env.local PM menggunakan URL dan publishable key proyek baru. Konfigurasi lomba tidak diubah.
- Jangan menjalankan migrasi, seed, pengujian tulis, penghapusan, atau sinkronisasi pada database lomba. Semua perubahan PM harus menargetkan fdprawhpeoefpcnlbiya.
- Sinkronisasi kini hanya harga PIHPS, tanpa cuaca/prediksi; melalui sesi Admin. Header cron saja ditolak sampai jalur server tepercaya tersedia.
- Jangan membuat harga pengganti untuk tanggal/provinsi tanpa data. Sumber nasional bukan harga Jawa Timur.
- Akun, percakapan, dan harga lomba tidak disalin. Ada 39 dokumen lokal pada knowledge_entries. Pengguna membuat akun demo admin@simantri.example.com; perannya Admin dan akses profil serta halaman Admin sudah diamati melalui browser. Sandi ditentukan pengguna, tidak disimpan dalam dokumentasi. Sinkronisasi lewat sesi Admin pada 20 Oktober 2026 mengisi 499 harga regional, 23 provinsi sepanjang riwayat, 22 tanggal publikasi (21 September–20 Oktober 2026), serta 22 riwayat Jawa Timur. Delapan hari tanpa publikasi tidak diisi. Pengulangan sinkronisasi terbaru tidak menambah duplikat. Sumber/data lomba tidak digunakan.
- Admin bukan pilihan registrasi mandiri; server memeriksa peran dari profiles.
- Jangan membuka kredensial ke output atau menaruh kunci nyata di .env.example.

## Arsip pemulihan

Pembersihan lanjutan 26 Oktober 2026 sudah mengeluarkan sisa ml/, remotion-video/, scratch/, mockup UI, video lomba, PRD/kontrak API/skema lomba, serta komponen yang tidak terhubung ke aplikasi. Sumber lama dipindahkan ke Recycle Bin; output/cache/dependensi eksperimen yang dapat dibuat ulang dihapus permanen. Root node_modules, .git, 39 berkas knowledge base, aset aktif dan konfigurasi PM dipertahankan. Landing sekarang memakai PlatformModules tanpa video lomba. Detail tindakan ada di docs/PM_CLEANUP_2026-10-26.json. Arsip 20 Oktober di luar folder PM di bawah tidak disentuh.

D:/SEMESTER 5/PROJECT MANEJEMEN/archive/SIMANTRI_PM_before_cleanup_2026-10-20

Folder src sebelum perapian dan dokumen konteks lama disalin ke arsip.
Fitur di luar scope serta folder ml/disease_detection dan ml/price_prediction dipindahkan ke disabled/ dalam arsip, bukan dihapus permanen. Scraper Python lama juga tersedia di arsip; pipeline PIHPS aktif ada di src/app/api/market/sync-pihps/route.ts. Knowledge base dan aset Dunia Brambang dipertahankan.

## Pemeriksaan lokal

- node --test tests/*.test.cjs
- node node_modules/next/dist/bin/next typegen
- node node_modules/typescript/bin/tsc --noEmit --incremental false
- node node_modules/next/dist/bin/next build

Tes unit memakai mock. Selain itu, skrip scripts/verify-pm-database.cjs --live sudah membaca proyek PM nyata; uji SQL docs/database/pm_rls_rollback_test.sql memverifikasi RLS dengan fixture yang semuanya di-rollback. Tidak ada penulisan pada database lomba.

Server lokal harus memiliki akses jaringan keluar ke Supabase dan PIHPS. Menjalankannya dalam sandbox tanpa jaringan pernah menyebabkan login browser berhasil di Supabase tetapi dashboard tidak menerima verifikasi sesi. Server produksi lokal tersedia di http://127.0.0.1:3000, tetap terikat loopback; gunakan proses dengan izin jaringan, bukan melemahkan RLS.

Detail pemisahan, status akun Admin, Storage, dan jadwal sinkronisasi: docs/PM_DATABASE_SETUP.md.
Baca panduan Next.js yang dibundel sebelum mengubah kode, sesuai AGENTS.md.

## Katalog penyakit — 20 Oktober 2026

Empat entri PM-DISEASE-* baru telah ditambahkan ke knowledge_entries; total terkini 43 (39 materi lama + 4 katalog). Materi lama dipertahankan, bukan dianggap telah divalidasi ahli. Katalog baru hanya membaca metadata.catalogue=pm-disease-v1; tidak menampilkan draft panjang lama atau foto yang asal/izinnya belum jelas. Detail implementasi, sumber, batas foto dan seed idempoten ada di docs/INFORMASI_PENYAKIT.md. Uji RLS rollback memastikan Admin bisa menyunting/mempublikasikan, Petani tidak bisa menulis, dan draft tidak bocor. Tidak ada perubahan skema/RLS/Storage atau konfigurasi lomba.

## Perluasan empat jenis harga — 20 Oktober 2026

- Migrasi cloud support_four_pihps_price_types (20261020122431) memperluas CHECK price_type dari hanya 4 menjadi 1,2,3,4. RLS, GRANT, dan SECURITY INVOKER tidak diubah. Kunci unik tetap tanggal/provinsi/komoditas/jenis.
- Pengisian ulang melalui sesi Admin: 21 September–20 Oktober 2026, 120 kombinasi tanggal/jenis; 88 tersimpan, 32 tanpa publikasi, 0 gagal setelah migrasi.
- Total 2.685 baris: Pasar Tradisional 743, Pasar Modern 695, Pedagang Besar 748, Produsen 499. Masing-masing memiliki 22 tanggal data. Cakupan terbaru 20 Oktober: 31/34/34/22 provinsi sesuai urutan tersebut; bukan jaminan 38 provinsi.
- Riwayat market_price tetap khusus produsen Jawa Timur (22 catatan). Sinkronisasi tiga jenis lain tidak menulis tabel kompatibilitas ini. Pengulangan semua jenis pada tanggal terbaru tidak menambah jumlah baris.
- Uji RLS transaksi rollback memverifikasi Admin dapat menulis empat jenis, Petani tidak dapat menulis semuanya, dan jenis kelima ditolak. Seluruh fixture dibatalkan. Tes unit 53 lulus; lint terarah dan build produksi lulus.

## Kebijakan riwayat harga 60 hari — revisi aktif

- Migrasi cloud market_price_retention_60_days menambahkan dua kebijakan DELETE terbatas pada Admin dan tanggal kedaluwarsa. Fungsi public.prune_expired_market_prices() memakai SECURITY INVOKER, pemeriksaan Admin, tanpa parameter tanggal dari klien, dan jam database Asia/Jakarta. Tidak menggunakan service-role key atau menonaktifkan RLS.
- Batas simpan inklusif hari ini sampai hari ini minus 59 hari; data tanggal di bawah batas dihapus permanen saat finalisasi sinkronisasi. Contoh 22 November 2026: simpan 24 September–22 November. Ini 60 hari kalender, bukan 60 baris/observasi dan bukan dua bulan.
- Cleanup hanya harga bawang merah PIHPS di market_regional_price serta seri kompatibilitas market_price; profil, knowledge base, chat, dan listing tidak disentuh. Tanggal dalam jendela tetap dilindungi dari DELETE langsung oleh kebijakan baru.
- Mode latest memeriksa PIHPS untuk tanggal server hari ini dan menyimpan publikasi terbaru yang valid dalam jendela dengan tanggal sumber sebenarnya. Jika Admin melewatkan beberapa hari, pemulihan rentang tetap tersedia; tombol terbaru tidak mengarang atau mengisi otomatis setiap hari yang terlewat.
- Kegagalan/pembatalan/tidak ada publikasi yang tersimpan: tidak menjalankan cleanup. Kegagalan cleanup setelah pembaruan dilaporkan terpisah, bukan diklaim sukses.
- Uji docs/database/pm_retention_rollback_test.sql berhasil: hari ke-60 dipertahankan, hari lebih tua dihapus untuk empat jenis dan legacy; Petani/anon ditolak; seluruh fixture dan penghapusan dibatalkan. Data asli tetap 2.685 regional + 22 legacy, belum ada data asli yang kedaluwarsa. Tes unit menjadi 59 lulus.
