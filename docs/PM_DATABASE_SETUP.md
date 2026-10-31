# Pemisahan database SIMANTRI PM
Tanggal pelaksanaan: 20 Oktober 2026 (Asia/Jakarta).

## Hasil

- Proyek: simantri-pm.
- Project ref: fdprawhpeoefpcnlbiya.
- Dashboard: https://supabase.com/dashboard/project/fdprawhpeoefpcnlbiya
- API URL: https://fdprawhpeoefpcnlbiya.supabase.co
- Organisasi: azkafariqiuinmalang's Org (tpoermyccfoeqdbwslri).
- Region: Singapore (ap-southeast-1).
- Paket Free. Estimasi pembuatan proyek yang dikonfirmasi pengguna: $0/bulan. Tidak dilakukan upgrade paket.
- .env.local PM sudah menggunakan URL dan publishable key baru. Nama variabel NEXT_PUBLIC_SUPABASE_ANON_KEY tetap dipakai untuk kompatibilitas kode, tetapi nilainya adalah publishable key modern.
- Konfigurasi pada D:/SIMANTRI (Sistem Informasi) tidak diubah; hash SHA-256 konfigurasi lomba diperiksa sebelum dan sesudah pemisahan.
- Tidak ada SQL/migrasi/seed yang dijalankan pada database lomba.

## Skema dan hak akses

| Tabel | Fungsi | Aturan pokok |
| --- | --- | --- |
| profiles | Identitas Petani/Admin | Pendaftaran selalu Petani. Pengguna hanya mengubah nama/lokasi miliknya, tidak role. |
| knowledge_entries | Materi penyakit dan knowledge base RAG | Publik hanya materi published. Perubahan konten khusus Admin. |
| chat_logs | Percakapan dan feedback | Hanya pemilik yang membaca dan mengubah feedback; tidak dapat mengubah pemilik atau isi jawaban tersimpan. |
| market_price | Riwayat kompatibilitas harga produsen Jawa Timur | Baca pengguna login; tulis Admin/service server tepercaya. Bukan harga Kabupaten Nganjuk/Pasar Sukomoro. Tidak digunakan untuk seri eceran/grosir. |
| market_regional_price | Empat jenis harga PIHPS per provinsi/tanggal/komoditas | Baca pengguna login; tulis Admin/service server tepercaya. Jenis 1,2,3,4 disimpan terpisah. |
| harvest_listings | Fondasi listing hasil panen | Pemilik mengelola listing sendiri; penerbitan listing membutuhkan Admin. UI modul belum diimplementasikan. |

Seluruh enam tabel mengaktifkan RLS. GRANT dan izin kolom ditetapkan eksplisit.
Helper otorisasi yang memerlukan privilege lebih tinggi ditempatkan di schema private, bukan public.
Dua RPC upsert harga memakai SECURITY INVOKER dan tunduk pada RLS; tidak memberi jalan pintas penulisan anonim.
Tidak dibuat tabel CV, forecasting, cuaca model, usulan pengetahuan, maupun verifikasi Penyuluh.

Skema snapshot: database/simantri_pm_schema.sql.
Migrasi cloud: initial_pm_schema.
Tipe hasil generate database: ../src/types/supabase.generated.ts (dari root proyek: src/types/supabase.generated.ts).
Metadata proyek tanpa kunci: database/pm_project.json.

## Data awal

39 dokumen knowledge_base lokal diimpor, sekitar 2 MB konten.
Seluruh dokumen diperiksa terhadap checksum MD5 konten sumber; hasil 39 cocok, 0 tidak cocok.
Metadata dan file asal disimpan untuk penelusuran sumber. Status published tidak berarti materi telah diverifikasi ilmiah secara independen.
Tidak disalin akun, sesi, percakapan, listing, atau harga dari database lomba.
Setelah uji rollback awal, profiles/chat_logs/harvest_listings/market_price/market_regional_price masing-masing tetap 0 baris. Sesudahnya, satu akun demo baru dibuat pengguna melalui Dashboard dan diberi peran Admin sebagaimana dicatat di bawah; akun ini bukan salinan dari versi lomba.
Foto referensi lokal dan Dunia Brambang tetap memakai aset aplikasi yang sudah ada.

## Akun demo Admin PM

- Alamat login: admin@simantri.example.com. Ini identitas uji, bukan kotak masuk email sungguhan; jangan gunakan alur kirim email/reset password untuk alamat ini.
- Pengguna membuat akun melalui Supabase Dashboard dan menentukan sandinya sendiri. Konfirmasi akun sudah aktif; tidak ada sandi dibaca, disimpan dalam dokumen, atau dibagikan ke chat.
- Pada 20 Oktober 2026, profil akun yang cocok dengan ID Auth dan alamat tersebut ditetapkan sebagai Admin melalui koneksi pengelolaan proyek PM. Tidak diubah role akun lain, metadata Auth, maupun aturan RLS.
- Pemeriksaan dalam transaksi dengan konteks authenticated akun tersebut mengonfirmasi private.is_admin() = true, role profil = admin, dan izin UPDATE kolom role tetap tidak tersedia bagi pengguna aplikasi. Ini pemeriksaan otorisasi database, bukan pengujian login dengan sandi melalui browser.
- Security advisor setelah penetapan Admin mencatat satu WARN: Leaked Password Protection belum aktif. Tidak ada konfigurasi Auth atau paket biaya diubah. Tinjau sebelum penggunaan lebih luas: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.
- Gunakan hanya untuk demo/uji coba terbatas, jangan digunakan sebagai akun operasional publik. Simpan sandi secara privat; bila perlu ubah sandi melalui pengelolaan tepercaya, bukan email pemulihan ke alamat contoh.

## Verifikasi

- scripts/verify-pm-database.cjs --live berhasil: Auth HTTP 200, 39 materi terpublikasi (termasuk 4 materi penyakit) terbaca, pencarian full-text RAG menemukan 3 rujukan uji moler, dan akses anonim ke profiles ditolak. Uji ini tidak memanggil Gemini atau menilai mutu jawaban generatif.
- Uji SQL database/pm_rls_rollback_test.sql berhasil. Fixture pengguna, chat, listing, dan harga seluruhnya dibatalkan melalui ROLLBACK; tidak dikirim email uji.
- Teruji: metadata pendaftaran tidak bisa menentukan Admin; profil/percakapan lintas pengguna terlindungi; Petani tidak bisa menulis harga atau melewati moderasi; Admin dapat menjalankan RPC harga; anon tidak dapat memanggil RPC tulis.
- Security advisor tidak menemukan lint pada pemeriksaan skema awal. Pemeriksaan setelah akun Admin dibuat mencatat WARN Leaked Password Protection seperti disebutkan di atas. Ini bukan jaminan keamanan seluruh aplikasi.
- Performance advisor mencatat INFO tentang 6 indeks baru yang belum digunakan. Indeks dipertahankan karena menargetkan pencarian, histori, dan foreign key yang akan dipakai; bukan alasan untuk menghapusnya pada database baru. Rujukan: [Unused Index](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index).
- Tes unit lokal: 38 lulus.
- Build produksi dibangun ulang supaya bundle browser tidak lagi menggunakan URL/kunci proyek lomba.

## Market Insight: implementasi dan uji nyata 20 Oktober 2026

- Sinkronisasi dijalankan melalui halaman Admin dan sesi pengguna nyata, bukan melalui bypass RLS atau salinan database lomba.
- Rentang awal: 21 September–20 Oktober 2026 (30 hari kalender). Hasil: 22 tanggal tersimpan, 8 tanggal tanpa publikasi, 0 tanggal gagal; total 499 catatan regional pada 23 provinsi sepanjang riwayat. Publikasi terbaru mencakup 22 provinsi. Cakupan tidak berarti seluruh provinsi Indonesia selalu tersedia.
- Riwayat kompatibilitas Jawa Timur: 22 catatan. Pemeriksaan join dengan harga regional Jawa Timur menemukan 0 perbedaan harga/tanggal; tidak ada substitusi harga nasional.
- Tanggal sumber Tanggal dan label Komoditas divalidasi. Uji sumber nyata: permintaan 17/18 Oktober mengembalikan publikasi 16 Oktober; tidak dibuat observasi pada dua tanggal akhir pekan itu. Seluruh tanggal akhir pekan dalam rentang awal tetap kosong.
- Uji pengulangan sinkronisasi 20 Oktober berhasil; jumlah regional tetap 499 dan riwayat Jawa Timur tetap 22. Tidak ada duplikat kunci tanggal/provinsi/komoditas/jenis harga.
- Halaman Market Insight menyediakan tanggal perbandingan, sumber produsen, tanggal pembaruan catatan, cakupan provinsi, harga minimum/maksimum, pencarian dan urutan provinsi, serta grafik 7/30/90 hari kalender dari data tersimpan. Angka perubahan dibandingkan dengan publikasi sebelumnya, bukan selalu kemarin. Rentang 90 hari bukan klaim bahwa 90 hari data sudah diimpor.
- Grafik memakai jarak tanggal kalender sehingga jeda akhir pekan tetap memiliki jarak yang benar; tidak ditambahkan titik harga sintetis.
- Tes unit menjadi 48 lulus, termasuk parser tanggal, penolakan data carry-forward, komoditas salah, akses baca tanpa sesi, pembatasan sinkronisasi, jendela kalender, skala grafik, dan penerapan tanggal dari form. TypeScript dan build produksi lulus; lint terarah juga lulus. Pengujian UI dan data nyata dilaksanakan terpisah dari mock.
- Uji browser nyata: halaman terbaru menampilkan 22 baris provinsi dan 22 titik riwayat Jawa Timur; pencarian Bali menyisakan satu baris data; grafik 7 hari Bali memuat 5 publikasi (14, 15, 16, 19, 20 Oktober) yang cocok dengan database. Menerapkan tanggal 18 Oktober menampilkan kondisi tidak ada data tersimpan, tanpa tabel harga pengganti, dan tombol tanggal terbaru mengembalikan data tanggal 20 Oktober. API baca regional dan API sinkronisasi tanpa sesi sama-sama mengembalikan 401.
- Sumber: https://www.bi.go.id/hargapangan/TabelHarga/ProdusenDaerah. Endpoint pengambilan dipatok di server pada domain Bank Indonesia, komoditas 5_11 dan priceType 4 (produsen).
- Sinkronisasi otomatis tidak diaktifkan. Header cron yang sah tetap mendapat 503 CRON_NOT_READY sampai jalur penulisan server tepercaya benar-benar diimplementasikan; tidak ada pembukaan RPC anonim.

Server lokal memerlukan jaringan keluar ke Supabase dan PIHPS. Server yang dijalankan dalam sandbox tanpa jaringan menyebabkan verifikasi sesi server gagal meskipun login browser diterima Supabase. Jalankan proses dengan izin jaringan yang tepat, tetap hanya bind ke 127.0.0.1 untuk uji lokal; jangan menonaktifkan RLS atau pemeriksaan sesi.

## Perluasan empat jenis harga: hasil terbaru

Migrasi cloud support_four_pihps_price_types (20261020122431) memperluas batas CHECK dari price_type=4 ke price_type IN (1,2,3,4). Tidak ada tabel/harga dihapus, RLS dilonggarkan, maupun kredensial baru dibuat. Uji awal menemukan batas lama ini; sinkronisasi dihentikan dan diulang setelah migrasi.

| ID PIHPS | Jenis harga | Baris dalam 30 hari | Tanggal tersedia | Provinsi pada 20 Oktober |
| --- | --- | ---: | ---: | ---: |
| 4 | Produsen | 499 | 22 | 22 |
| 3 | Pedagang Besar | 748 | 22 | 34 |
| 1 | Pasar Tradisional | 743 | 22 | 31 |
| 2 | Pasar Modern | 695 | 22 | 34 |

- Rentang 21 September–20 Oktober 2026 diisi melalui UI Admin: 88 dari 120 kombinasi tanggal/jenis tersimpan, 32 tidak memiliki publikasi tanggal yang diminta, 0 bermasalah pada pengulangan setelah migrasi. Total 2.685 baris. Delapan tanggal akhir pekan tidak diberi harga pengganti pada masing-masing jenis.
- Cakupan sepanjang riwayat: 23 provinsi produsen dan 34 provinsi pada masing-masing tiga jenis lainnya. Cakupan aktual mengikuti sumber, bukan janji ketersediaan harga untuk 38 provinsi.
- Parameter price_type pada API regional, riwayat regional, dan sinkronisasi menerima tepat 1,2,3,4. Parameter yang tidak diberikan tetap produsen; nilai tidak valid ditolak, bukan dialihkan diam-diam. Tanggal terbaru ditentukan secara terpisah per jenis.
- Pilihan empat jenis di halaman petani mengganti penjelasan, tautan sumber, tabel, dan grafik. Pergantian jenis mereset state seri agar harga jenis sebelumnya tidak muncul di bawah label baru. Tidak ada rata-rata gabungan empat jenis dan tidak ada klaim selisih harga sebagai laba.
- Admin dapat memilih satu/semua jenis. Setiap permintaan memproses satu kombinasi tanggal/jenis secara berurutan; progres, pembatalan setelah permintaan aktif, dan status per kombinasi ditampilkan.
- Sinkronisasi ulang semua jenis untuk 20 Oktober berhasil: jumlah per jenis tetap sama, tidak ada duplikat. market_price tetap 22 catatan produsen Jawa Timur dan 0 perbedaan terhadap seri regional produsen.
- Uji database dengan transaksi rollback: Admin dapat menjalankan RPC untuk setiap jenis; Petani ditolak pada keempatnya; jenis kelima ditolak CHECK; akses anonim tetap ditolak. Tidak ada fixture tersisa. Security advisor tetap hanya mencatat WARN Leaked Password Protection yang sudah ada sebelum perubahan.
- Tes unit 53 lulus, lint terarah dan build produksi lulus. API baca tanpa sesi mendapat 401; jenis tidak valid mendapat 400. Uji mock bukan pengganti verifikasi browser dan data sumber nyata.
- Uji browser setelah impor dan build final: keempat tombol berganti jenis dengan benar; sumber, cakupan, dan grafik ikut berubah. Riwayat Jawa Timur pada 20 Oktober menampilkan Rp15.700/kg (produsen), Rp22.550/kg (pedagang besar), Rp30.200/kg (tradisional), dan Rp47.850/kg (modern), cocok dengan JSON sumber PIHPS yang diperiksa pada tanggal sama. Setiap seri memiliki 22 catatan dalam rentang 30 hari. Kondisi awal sebelum impor jenis modern menampilkan data belum tersedia, tanpa memakai harga produsen.
- Empat tautan sumber berada di src/lib/market/pihps.ts, semuanya pada domain resmi Bank Indonesia. Endpoint pengambilan tetap dipatok di server, bukan menerima URL dari pengguna.

## Cara memeriksa kembali

### Revisi aktif: sinkronisasi terbaru dan retensi 60 hari

- Tombol utama Admin mengambil keempat jenis harga dengan mode latest. Backend menetapkan tanggal permintaan menurut Asia/Jakarta; tanggal dari browser tidak dapat dipakai untuk menggeser jendela retensi. Publikasi terbaru yang valid disimpan pada tanggal asli sumber, termasuk publikasi Jumat bila diperiksa pada akhir pekan.
- Setelah semua permintaan selesai tanpa gagal/dibatalkan dan sedikitnya satu publikasi tersimpan, UI memanggil POST /api/market/retention. Endpoint memeriksa sesi dan role Admin, lalu menjalankan RPC tanpa parameter cutoff. Bila pengambilan gagal, cleanup tidak dipanggil; bila cleanup gagal, UI menyatakan harga tersimpan tetapi pembersihan belum berhasil.
- Jendela inklusif = tanggal hari ini dikurangi 59 hari hingga hari ini, bukan 60 observasi. Pada 22 November, batas awal 24 September. Data lebih tua dibersihkan permanen; tanggal batas tetap disimpan.
- Migrasi market_price_retention_60_days menambahkan kebijakan DELETE Admin khusus tanggal kedaluwarsa dan RPC SECURITY INVOKER. Penghapusan tetap tunduk pada RLS, tanpa server secret. RPC tidak menerima tanggal dari klien; RLS menolak penghapusan tanggal yang masih dalam jendela, termasuk oleh Admin.
- Sasaran cleanup: komoditas bawang merah empat jenis pada market_regional_price dan riwayat kompatibilitas market_price. Tidak menyentuh profil, chat, materi, atau listing. Snapshot skema dan tipe RPC diperbarui.
- Opsi pemulihan rentang 1/7/30/60 hari tetap tersedia dalam bagian opsi tambahan. Tombol terbaru bukan backfill otomatis seluruh hari yang dilewatkan Admin. Tidak ada scheduler atau penghapusan mandiri saat tengah malam.
- Grafik dan API riwayat kini maksimal 60 hari. Data yang tersedia boleh kurang dari 60 hari, karena tidak dipaksakan memiliki publikasi setiap tanggal.
- Uji integrasi pm_retention_rollback_test.sql memverifikasi expired rows dihapus, tepat hari ke-60 dipertahankan, DELETE langsung tanggal aktif ditolak, serta Petani/anon tidak dapat memanggil cleanup. Seluruh fixture dan penghapusan di-ROLLBACK; data asli tetap 2.685 regional + 22 legacy, 0 fixture tersisa dan 0 data asli kedaluwarsa saat pengujian. Tes otomatis 59 lulus. Security advisor tidak menambah temuan baru; peringatan password yang sudah ada tetap tercatat di atas.
- Uji tombol utama melalui browser Admin berhasil: 4 kombinasi tersimpan, 0 tanpa publikasi, 0 bermasalah; finalisasi menampilkan jendela 22 Agustus–20 Oktober 2026 dan 0 catatan kedaluwarsa dibersihkan. Tidak ada data asli dihapus karena seluruh riwayat masih di dalam jendela. Build produksi dan lint terarah lulus. Endpoint retention tanpa sesi mendapat 401; API riwayat menolak days=61 dengan 400.

Dari root PM (SIMANTRI):

- node scripts/verify-pm-database.cjs — pemeriksaan konfigurasi tanpa jaringan.
- node scripts/verify-pm-database.cjs --live — baca count materi publik dan cek penolakan akses profil anonim; tidak menulis database.
- node --test tests/*.test.cjs — tes unit lokal.
- node node_modules/next/dist/bin/next build — build ulang setelah mengganti environment.

## Pekerjaan berikutnya yang belum dilakukan

1. Jadwal cron belum diaktifkan. Implementasikan otorisasi server tepercaya sebelum mengaktifkan scheduler; mengisi CRON_SECRET saja tidak cukup. Sinkronisasi sesi Admin sudah tersedia dan tidak memerlukan service-role key.
2. Bucket Storage foto dan alur unggah belum dibuat. Konfigurasi storage lama tidak disalin.
3. Katalog empat penyakit dan editor Admin tersedia (rincian di docs/INFORMASI_PENYAKIT.md). Penambahan penyakit, unggah foto berizin, dan UI Harvest Listing belum tersedia.
4. Alur konfirmasi email dan reset password memerlukan akun dengan kotak masuk sungguhan bila akan digunakan; alamat demo bukan alamat untuk menerima email. Login/profil dan akses Admin demo sudah diamati berhasil di browser.
5. Pengujian browser sebagai Petani dengan akun terpisah serta pengujian menyeluruh modul lain tetap perlu dilanjutkan. Tes RLS rollback dan unit tidak menggantikan uji pengguna.

Backup konfigurasi lama scratch/.env.before-pm-database-split sudah dikeluarkan bersama scratch/ pada 26 Oktober 2026 dan berada di Recycle Bin. Jangan memulihkannya sebagai .env.local: backup tersebut menunjuk database lomba. Konfigurasi PM aktif tetap dipertahankan, tidak disalin ke laporan pembersihan, dan tidak diubah dalam pembersihan.
