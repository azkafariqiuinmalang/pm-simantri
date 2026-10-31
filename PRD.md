# Product Requirements Document — SIMANTRI PM

| Identitas | Keterangan |
| --- | --- |
| Nama produk | SIMANTRI — Sistem Informasi Pertanian Bawang Merah Terintegrasi |
| Konteks | Proyek mata kuliah Project Management, terpisah dari versi lomba |
| Versi dokumen | 1.0 |
| Tanggal | 26 Oktober 2026, Asia/Jakarta |
| Status | Baseline kebutuhan untuk ditinjau tim; bukan pernyataan seluruh fitur telah selesai |
| Outcome | Prototype aplikasi web yang berfungsi dan diuji secara terbatas, belum disebarluaskan untuk penggunaan umum |
| Pemilik produk | Peran Product Owner/Project Manager; tidak menggunakan identitas individu |

> PRD ini khusus salinan `PM (SIMANTRI)`. Kebutuhan di bawah membedakan target produk, implementasi yang tersedia, dan kekurangan yang perlu ditutup. Dokumen ini tidak mengaktifkan fitur, mengubah database, atau menyatakan validasi ahli telah dilakukan.

## 1. Ringkasan produk

SIMANTRI membantu petani bawang merah mengakses informasi penyakit, bertanya tentang budidaya melalui SIMA, membandingkan harga PIHPS, dan mempublikasikan informasi hasil panen melalui Harvest Listing. Admin mengelola kualitas konten, pembaruan harga, dan moderasi listing.

Istilah **sistem informasi terintegrasi** diwujudkan melalui satu aplikasi, akun serta navigasi bersama, dan pengelolaan informasi yang terhubung. Integrasi tidak berarti semua modul harus memakai model AI. Informasi penyakit adalah referensi manual; AI hanya digunakan untuk asisten RAG, bukan analisis gambar atau ramalan harga.

Prototype adalah software yang dapat dijalankan, bukan sekadar desain antarmuka. Batas tahap proyek adalah implementasi dan uji coba terbatas, bukan peluncuran publik, jaminan layanan produksi, atau transaksi komersial penuh.

## 2. Permasalahan, solusi, dan nilai tambah

| Permasalahan inti | Solusi produk | Nilai tambah yang diuji |
| --- | --- | --- |
| Informasi gejala dan penanganan penyakit tersebar serta sulit dibandingkan. | Katalog penyakit dengan gejala, foto rujukan, pencegahan, tindakan awal, dan sumber. | Memperpendek pencarian referensi awal tanpa mengklaim diagnosis pasti. |
| Petani harus mencari sendiri penjelasan budidaya dari banyak dokumen. | SIMA mencari knowledge base lalu membantu menjelaskan informasi beserta rujukannya. | Mengurangi pencarian berulang dan mempermudah memahami materi yang relevan. |
| Harga dari tingkat perdagangan berbeda mudah tertukar atau kehilangan konteks tanggal/wilayah. | Market Insight memisahkan empat jenis harga PIHPS dan menampilkan tanggal serta provinsinya. | Memberi konteks perbandingan harga, bukan menjamin harga transaksi atau keuntungan. |
| Informasi hasil panen dan kontak penjual belum terpusat. | Harvest Listing untuk penawaran panen dan kontak penjual, melalui moderasi Admin. | Mempermudah menemukan informasi ketersediaan panen tanpa membangun sistem pembayaran/logistik. |
| Pengelola berpotensi memasukkan data berulang dan menyimpan data harga tanpa batas. | Sinkronisasi Admin yang idempoten serta retensi harga 60 hari. | Mengurangi input ulang dan pertumbuhan penyimpanan yang tidak diperlukan. |

**Prinsip efisiensi:** gunakan aplikasi dan database PM yang sama untuk empat modul; gunakan ulang konten yang relevan; batasi pemanggilan AI pada kebutuhan yang sesuai; gunakan layanan sesuai anggaran yang disetujui. Penurunan biaya/waktu merupakan hipotesis yang harus diukur, bukan persentase penghematan yang sudah terbukti.

## 3. Tujuan dan indikator keberhasilan

| ID | Tujuan | Bukti keberhasilan prototype |
| --- | --- | --- |
| OBJ-01 | Menyediakan referensi awal penyakit bawang merah. | Pengguna menemukan materi berdasarkan nama/gejala, membaca ciri pembeda, dan membuka referensi foto serta sumber. |
| OBJ-02 | Membantu akses pengetahuan budidaya melalui SIMA. | Pertanyaan uji menghasilkan jawaban dengan rujukan yang benar ketika dokumen ditemukan; ketiadaan rujukan dan gangguan layanan dinyatakan jujur. |
| OBJ-03 | Menyediakan informasi harga yang dapat ditelusuri. | Jenis harga, provinsi, tanggal publikasi, satuan dan sumber sesuai data tersimpan; tidak ada harga pengganti buatan. |
| OBJ-04 | Mendemonstrasikan alur listing panen. | Pemilik dapat membuat listing, Admin memoderasi, dan pengguna lain melihat listing yang dipublikasikan serta mengakses kontak penjual. **Belum tercapai saat dokumen dibuat.** |
| OBJ-05 | Memastikan pembatasan peran dan kepemilikan data. | Pengguna tanpa hak tidak dapat mengubah konten/harga/listing orang lain atau membaca percakapan orang lain. |
| OBJ-06 | Menguji manfaat dan efisiensi. | Skenario uji mencatat waktu penyelesaian, keberhasilan tugas, kesalahan, dan umpan balik; hasil dibandingkan dengan cara pencarian/input manual yang sama. |

Ukuran sampel, batas waktu tugas dan ambang kuantitatif UAT ditentukan tim sebelum pengujian. Jumlah tes otomatis yang lulus tidak sama dengan persentase keberhasilan pengguna atau akurasi agronomi.

## 4. Pengguna dan hak akses

Hanya ada dua peran aplikasi: **Petani** dan **Admin**. Pengunjung publik bukan peran akun tambahan. Penyuluh/POPT tetap dapat disebut sebagai tempat konsultasi di dunia nyata, tetapi tidak memiliki alur akun/verifikasi khusus dalam PM.

| Aktivitas | Pengunjung publik | Petani | Admin |
| --- | --- | --- | --- |
| Membaca landing page dan Dunia Brambang | Ya | Ya | Ya |
| Registrasi akun | Menjadi Petani | Tidak mengubah peran sendiri | Tidak menetapkan Admin melalui registrasi mandiri |
| Mengakses dashboard dan profil | Perlu login | Profil sendiri | Profil sendiri melalui UI saat ini |
| Membaca katalog penyakit pada dashboard | Perlu login melalui UI | Materi published | Materi published; draft melalui editor Admin |
| Menyunting/mempublikasikan katalog penyakit | Tidak | Tidak | Ya, empat materi awal pada implementasi saat ini |
| Membaca Market Insight | Perlu login | Ya | Ya |
| Sinkronisasi dan pembersihan riwayat harga | Tidak | Tidak | Ya |
| SIMA dan riwayat percakapan | Akses generasi tanpa sesi perlu dibatasi sesuai gap G-04 | Percakapan sendiri | Percakapan sendiri; bukan akses menyeluruh ke chat pengguna |
| Mengelola listing panen | Tidak | Listing milik sendiri, target implementasi | Moderasi, target implementasi |
| Melihat listing published/kontak penjual | Belum menjadi target akses publik | Ya, target implementasi | Ya, target implementasi |

**Catatan batas UI/API:** dashboard katalog dilindungi login, tetapi data pengetahuan berstatus published pada skema saat ini dapat dibaca melalui Data API publik. Jangan menyimpan informasi pribadi atau rahasia dalam materi published. Pembatasan rute tidak boleh dianggap pengganti pemeriksaan API dan kebijakan database.

## 5. Ruang lingkup

### 5.1 Dalam scope

1. Informasi penyakit bawang merah: pencocokan manual, foto rujukan, gejala, pencegahan, tindakan awal, ciri pembeda, sumber, dan pengelolaan materi oleh Admin.
2. AI Assistant RAG/SIMA: pencarian knowledge base, penjelasan berbasis konteks, rujukan, umpan balik dan riwayat percakapan pengguna.
3. Market Insight PIHPS: empat jenis harga, perbandingan provinsi, tanggal publikasi, riwayat 7/30/60 hari, sinkronisasi manual Admin, dan retensi 60 hari.
4. Harvest Listing: informasi panen, foto, status ketersediaan, pencarian, kontak penjual, kepemilikan listing, dan moderasi Admin.
5. Pendukung: autentikasi, profil, pembatasan peran, pengamanan data, tampilan responsif, tema, preferensi bahasa, pengujian dan dokumentasi.
6. Dunia Brambang sebagai landing page/media edukasi yang dipertahankan, bukan modul model AI baru.

### 5.2 Di luar scope

- Computer Vision, YOLO, unggah foto untuk diagnosis otomatis, prediksi probabilitas penyakit, dan training model gambar.
- Forecasting harga, XGBoost, model cuaca, serta rekomendasi waktu jual berbasis ramalan.
- SAW/TOPSIS atau sistem pemeringkatan keputusan lain yang tidak disepakati.
- Peran/verifikasi Penyuluh, sinyal wilayah dari CV, serta usulan pengetahuan komunitas.
- Keranjang, checkout, pembayaran, escrow, invoice transaksi, pengiriman, pelacakan logistik, dan jaminan transaksi.
- IoT, aplikasi mobile native, peluncuran publik, dan operasi produksi berskala luas.
- Klaim integrasi resmi dengan database Dinas Pertanian, kerja sama kelembagaan, atau validasi ahli yang belum dilaksanakan.

### 5.3 Prioritas

- **P0:** kebutuhan inti untuk alur prototype dan keamanan. Kebutuhan P0 yang belum tersedia menjadi pekerjaan tersisa, bukan dinyatakan selesai karena dicantumkan dalam PRD.
- **P1:** penyempurnaan dalam scope setelah alur inti stabil, tidak menunda pengujian parsial yang batasnya dinyatakan jelas.
- Fitur di luar scope hanya dapat ditambahkan melalui persetujuan perubahan scope, biaya, waktu dan kriteria penerimaan.

## 6. Kebutuhan fungsional

### 6.1 Pendukung: akun, profil, navigasi dan edukasi

| ID | Prioritas | Kebutuhan | Kriteria penerimaan |
| --- | --- | --- | --- |
| AUTH-01 | P0 | Pengguna mendaftar dan login sebagai Petani. | Pendaftaran tidak dapat menetapkan role Admin dari isian/metadata pengguna; dashboard menolak sesi yang tidak sah. |
| AUTH-02 | P0 | Role Admin berasal dari profil database yang tepercaya. | Petani tidak dapat mengakses fungsi tulis Admin, termasuk dengan memanggil endpoint langsung. |
| AUTH-03 | P0 | Pengguna memperbarui profil sendiri dan logout. | Perubahan nama/desa tidak mengubah ID atau peran; logout mengakhiri akses UI yang memerlukan sesi. |
| UX-01 | P0 | Navigasi menampilkan empat modul dan status yang jujur. | Tidak ada tautan aktif ke CV/forecasting; fitur belum selesai tidak ditampilkan sebagai layanan aktif. |
| UX-02 | P1 | Preferensi Indonesia/Jawa dan tema terang/gelap tersedia. | Bahasa/tema dapat diganti dengan kontrol yang dapat digunakan lewat keyboard; nama ilmiah, angka dan dokumen sumber tidak diterjemahkan sembarangan. |
| EDU-01 | P0 | Dunia Brambang dan aset edukasinya dipertahankan. | Halaman dan HTML edukasi terbuka; kontrol audio tetap atas tindakan pengguna; tidak memerlukan layanan model lama. |

Konfirmasi email dan reset sandi untuk penggunaan nyata memerlukan alamat penerima serta konfigurasi email yang sesuai. Akun demo bukan bukti alur penerimaan email sudah berfungsi.

### 6.2 Modul 1 — Informasi Penyakit

**Tujuan:** membantu membandingkan gejala secara manual dan membaca tindakan awal dari rujukan, bukan menetapkan diagnosis tanaman.

Empat penyakit awal:

1. Moler/layu Fusarium.
2. Bercak ungu/trotol.
3. Antraknosa/otomatis.
4. Embun bulu/tepung palsu.

| ID | Prioritas | Kebutuhan | Kriteria penerimaan |
| --- | --- | --- | --- |
| DIS-01 | P0 | Katalog penyakit tersedia dari database PM. | Empat materi awal memiliki judul, nama penyebab, ringkasan, bagian tanaman, gejala, pencegahan, tindakan awal, ciri pembeda, sumber dan status publikasi. |
| DIS-02 | P0 | Pengguna mencari nama, alias atau gejala dan memfilter bagian tanaman. | Pencarian serta filter dapat digabung; hasil kosong, pemuatan, kegagalan dan reset ditangani tanpa menampilkan data buatan. Hasil pencarian bukan diagnosis atau skor kecocokan penyakit. |
| DIS-03 | P0 | Setiap penyakit memiliki akses ke referensi foto yang jelas. | Foto/tautan dilengkapi sumber, kredit dan status penggunaan. Tahap awal memakai tautan PDF resmi dan nomor halaman; aplikasi menyatakan foto belum ditampilkan sebagai galeri in-app. |
| DIS-04 | P0 | Galeri foto dalam aplikasi hanya memakai aset yang dapat digunakan dan identitasnya dapat dipertanggungjawabkan. | Sebelum galeri dinyatakan selesai, foto setiap penyakit mempunyai dasar izin/lisensi atau dokumentasi milik sendiri, kredit, label dan pemeriksaan relevansi. Foto AI tidak digunakan sebagai foto penyakit nyata. **Masih menjadi gap.** |
| DIS-05 | P0 | Admin menyunting materi awal dan mengatur draft/published. | Penyimpanan memperbarui database; draft tidak tampil pada katalog petani; perubahan bersamaan ditolak dengan pesan konflik, bukan menimpa diam-diam. |
| DIS-06 | P0 | Batas pengetahuan ditampilkan kepada pengguna. | Materi menjelaskan bahwa referensi bukan diagnosis pasti dan belum divalidasi ahli; tidak menyajikan dosis/registrasi pestisida lama sebagai rekomendasi terkini. |
| DIS-07 | P1 | Perluasan jumlah materi dikelola dengan proses kurasi. | Penambahan/pengarsipan materi baru hanya diaktifkan setelah validasi data, sumber dan hak akses disiapkan. Form tambah/hapus bukan bagian editor awal yang sudah tersedia. |

**Aturan sumber:** prioritaskan publikasi resmi. Materi teknis saat ini dirangkum dari publikasi pemerintah yang dicatat dalam `docs/INFORMASI_PENYAKIT.md`. Dataset Nganjuk yang ditemukan adalah statistik serangan OPT, bukan katalog foto/gejala lengkap. Akses publik tidak otomatis memberi izin rehosting gambar. Status published adalah status tampilan, bukan pengesahan ahli/dinas.

### 6.3 Modul 2 — AI Assistant RAG/SIMA

**Tujuan:** membantu menjelaskan informasi budidaya yang relevan dengan rujukan yang dapat ditelusuri.

| ID | Prioritas | Kebutuhan | Kriteria penerimaan |
| --- | --- | --- | --- |
| RAG-01 | P0 | Pengguna mengirim pertanyaan teks tentang bawang merah. | Input kosong/tidak valid/terlalu panjang ditolak; batas input implementasi saat ini 1.000 karakter. Tidak ada unggah gambar untuk diagnosis. |
| RAG-02 | P0 | Sistem mengambil materi published yang relevan sebelum menyusun jawaban. | Pencarian teks, keyword dan pencocokan judul digunakan; konteks serta ID dokumen yang dipakai dapat ditelusuri. Tidak mengklaim vector search/embedding yang belum diimplementasikan. |
| RAG-03 | P0 | Jawaban membedakan penggunaan knowledge base dengan jawaban tanpa rujukan. | Jika materi ditemukan, tampilkan rujukan yang benar. Jika tidak, nyatakan keterbatasan; jangan membuat judul sumber, hasil pemeriksaan atau klaim validasi. |
| RAG-04 | P0 | Gangguan generasi, pengambilan materi, atau pencatatan disampaikan secara jujur. | Ringkasan fallback tidak disebut sebagai jawaban generatif yang telah berhasil; kegagalan menyimpan chat tidak diklaim sebagai riwayat tersimpan. Pelabelan fallback masih perlu diperkuat. |
| RAG-05 | P0 | Percakapan dan umpan balik terikat pengguna. | Pengguna hanya membaca riwayat serta memberi feedback atas chat sendiri; akses tanpa sesi ditangani sesuai batas penggunaan yang ditetapkan. Penolakan generasi anonim perlu ditutup pada endpoint saat ini. |
| RAG-06 | P0 | Asisten mempunyai batas kemampuan dan pengamanan input/output. | Upaya memperoleh instruksi internal atau kredensial tidak dilayani; jawaban tidak mengaku menganalisis foto, membaca harga live, meramal harga, atau menjalankan transaksi. |
| RAG-07 | P1 | Preferensi bahasa memengaruhi penjelasan tanpa mengubah rujukan. | Angka, satuan, nama ilmiah dan judul sumber dipertahankan; preferensi bahasa tidak digunakan sebagai instruksi bebas dari klien. |

**Batas integrasi:** materi katalog tersimpan pada `knowledge_entries` dan dapat ditemukan retrieval SIMA. Belum ada jaminan bahwa entri katalog baru selalu mengalahkan materi lama dalam pemeringkatan. Tautan menuju Market Insight tidak berarti SIMA mengambil data harga aktual per permintaan. Peninjauan kualitas 39 dokumen awal tetap diperlukan; tidak seluruh knowledge base dinyatakan telah tervalidasi.

### 6.4 Modul 3 — Market Insight PIHPS

**Komoditas:** Bawang Merah Ukuran Sedang. Harga ditampilkan dalam rupiah per kilogram.

| Jenis harga | ID pada implementasi | Posisi informasi dalam produk |
| --- | --- | --- |
| Produsen | 4 | Harga tingkat penghasil; pilihan default. |
| Pedagang Besar | 3 | Harga perdagangan grosir. |
| Pasar Tradisional | 1 | Harga eceran pasar tradisional. |
| Pasar Modern | 2 | Harga eceran pasar modern. |

Empat seri tidak dicampur. Selisih antarjenis tidak otomatis berarti margin keuntungan karena konteks perdagangan, biaya dan pengamatan dapat berbeda.

| ID | Prioritas | Kebutuhan | Kriteria penerimaan |
| --- | --- | --- | --- |
| MKT-01 | P0 | Petani memilih satu dari empat jenis harga. | Pilihan mengubah sumber, cakupan provinsi, tabel dan grafik; seri sebelumnya tidak tertinggal di bawah label baru. |
| MKT-02 | P0 | Data dapat dibandingkan per provinsi dan tanggal publikasi. | Hanya provinsi bertanggal sesuai sumber yang ditampilkan. Tidak menjanjikan 38 provinsi untuk semua jenis/tanggal atau mengganti provinsi kosong dengan harga nasional. |
| MKT-03 | P0 | Riwayat tersedia dalam jendela 7/30/60 hari kalender. | Grafik menggunakan tanggal asli dan jarak waktu yang benar; hari tanpa publikasi tidak dibuat menjadi observasi baru. Data boleh kurang dari jumlah hari yang dipilih. |
| MKT-04 | P0 | Admin menggunakan tombol Sinkronisasi harga terbaru. | Backend mengambil keempat jenis dari PIHPS; tanggal data mengikuti publikasi sumber, bukan dipaksakan menjadi tanggal klik. |
| MKT-05 | P0 | Sinkronisasi dapat diulang tanpa duplikat. | Rekaman unik berdasarkan tanggal, provinsi, komoditas dan jenis harga; perubahan sumber memperbarui rekaman yang sama. |
| MKT-06 | P0 | Pengambilan parsial/gagal/kosong dapat dibedakan. | Tampilkan hasil per tanggal/jenis dan kendala; jangan menyatakan seluruh sinkronisasi berhasil bila ada kegagalan. |
| MKT-07 | P0 | Riwayat harga dibatasi 60 hari kalender. | Finalisasi sinkronisasi yang lengkap, tidak dibatalkan/tidak gagal, dan menyimpan sedikitnya satu publikasi, membersihkan harga yang lebih tua dari batas simpan. |
| MKT-08 | P0 | Pemulihan rentang tetap tersedia bagi Admin. | Rentang 1/7/30/60 hari dapat dipilih dalam jendela simpan; tombol terbaru bukan janji backfill setiap hari yang terlewat. |
| MKT-09 | P0 | Hanya Admin dapat menulis harga atau menjalankan pembersihan. | Endpoint dan database menolak Petani/anon; cutoff retensi tidak diterima bebas dari browser. Tidak ada cron otomatis pada scope aktif. |

**Aturan retensi yang mengikat:**

- Untuk tanggal server `T` di Asia/Jakarta, simpan tanggal `T−59` sampai `T`, inklusif: total 60 hari kalender.
- Hapus tanggal yang **lebih kecil** dari `T−59`, bukan tanggal batas itu sendiri.
- Contoh 22 November 2026: simpan 24 September–22 November 2026. Dua bulan kalender tidak selalu sama dengan 60 hari.
- Hari tanpa publikasi tetap kosong; tidak membuat harga nol, interpolasi, fallback nasional, atau salinan harga Jumat bertanggal akhir pekan.
- Pembersihan dilakukan pada finalisasi sinkronisasi yang memenuhi syarat, bukan ketika waktu berganti tengah malam. Tanpa sinkronisasi, data lama bisa tetap tersimpan sampai finalisasi berikutnya.
- Kegagalan/pembatalan pengambilan tidak memicu cleanup. Jika cleanup sendiri gagal, laporkan harga tersimpan tetapi pembersihan belum berhasil; jangan mengklaim kondisi database bersih.
- Retensi ini khusus tabel harga, bukan penghapusan otomatis chat, profil, pengetahuan atau listing.
- Tabel `market_price` yang dipertahankan untuk kompatibilitas berisi seri produsen Jawa Timur; tiga jenis lain tidak boleh menimpanya.

### 6.5 Modul 4 — Harvest Listing

**Tujuan:** marketplace informasi hasil panen dan penghubung kontak, bukan mesin transaksi.

**Status saat ini:** tabel dasar serta kebijakan kepemilikan telah disiapkan pada skema PM. Halaman `/dashboard/panen` masih placeholder. Form, katalog, foto, moderasi serta alur kontak **belum menjadi fitur yang berjalan**.

| ID | Prioritas | Kebutuhan target | Kriteria penerimaan |
| --- | --- | --- | --- |
| HLV-01 | P0 | Petani membuat dan menyunting listing sendiri. | Isian wajib: judul, lokasi, jumlah kg, harga per kg dan kontak yang sengaja dipublikasikan. Deskripsi, varietas dan tanggal panen dapat dilengkapi. Jumlah/harga harus positif. |
| HLV-02 | P0 | Listing memiliki foto panen. | Unggah memvalidasi format/ukuran, memiliki batas akses berdasarkan pemilik, menangani gagal unggah, dan tidak membocorkan aset privat. Batas ukuran/jumlah final mengikuti keputusan terbuka DEC-03. |
| HLV-03 | P0 | Pemilik menyimpan draft atau mengajukan publikasi. | Draft/pending tidak muncul sebagai penawaran publik kepada pengguna lain; pengguna tidak dapat menetapkan sendiri status published. |
| HLV-04 | P0 | Admin meninjau, mempublikasikan atau menyembunyikan listing. | Hanya Admin mengubah keputusan moderasi; hasilnya terlihat oleh pemilik dan katalog sesuai status. |
| HLV-05 | P0 | Pengguna melihat, mencari dan memfilter listing yang boleh diakses. | Hasil pencarian berisi listing published untuk pengguna lain; judul/lokasi dan status ketersediaan konsisten dengan data. Katalog kosong tidak diisi penjual fiktif tanpa label. |
| HLV-06 | P0 | Pengguna membuka kontak penjual. | Kontak tampil sesuai persetujuan penjual. Tindakan menghubungi penjual bukan pemesanan atau pembayaran dalam SIMANTRI. |
| HLV-07 | P0 | Pemilik menandai panen habis/terjual. | Listing sold tidak ditampilkan sebagai stok tersedia. Sistem tidak membuat transaksi atau perhitungan penjualan aktual dari perubahan status saja. |

**Status dan transisi target:**

| Status | Makna | Transisi yang diizinkan pada alur target |
| --- | --- | --- |
| `draft` | Belum diajukan. | Pemilik dapat menyunting lalu mengajukan menjadi pending. |
| `pending` | Menunggu moderasi. | Admin mempublikasikan atau menyembunyikan; pemilik dapat menarik menjadi draft. |
| `published` | Lolos moderasi dan tersedia. | Pemilik menandai sold atau mengajukan perubahan kembali ke pending; Admin dapat menyembunyikan. |
| `sold` | Tidak tersedia. | Pemilik dapat mengajukan ulang sebagai pending jika stok berubah; bukan langsung published. |
| `hidden` | Tidak ditampilkan karena keputusan moderasi. | Pemilik memperbaiki lalu mengajukan pending; Admin meninjau ulang. |

Transisi di atas adalah kebutuhan target yang harus diuji di API dan database. Kebijakan dasar saat ini belum merupakan state machine lengkap dan belum mencatat alasan moderasi. Jangan menganggap seluruh transisi/jejak moderasi sudah tersedia hanya karena nama status ada dalam tabel. Penghapusan permanen bukan alur utama prototype; penutupan listing diprioritaskan melalui status.

## 7. Alur penggunaan dan alur data

### 7.1 Petani

```text
Landing / Dunia Brambang
          ↓
Registrasi atau login → Dashboard
                        ├─ Informasi Penyakit → cari/filter → baca gejala & rujukan
                        ├─ SIMA → pertanyaan → retrieval KB → jawaban & sumber
                        ├─ Market Insight → pilih jenis/tanggal/provinsi → tabel & grafik
                        └─ Harvest Listing [target] → buat/cari listing → kontak penjual
```

### 7.2 Admin

```text
Login → verifikasi peran Admin dari profil database
       ├─ Katalog penyakit → pilih materi → edit → draft / published
       ├─ Harga → sinkronisasi PIHPS → validasi tanggal/jenis → upsert
       │          ├─ gagal / dibatalkan / tidak ada publikasi → laporkan; tanpa cleanup
       │          └─ lengkap, sehat, ada publikasi → cleanup 60 hari → ringkasan hasil
       └─ Listing [target] → review pending → published / hidden
```

### 7.3 Hubungan modul

| Sumber/komponen | Digunakan oleh | Batas integrasi |
| --- | --- | --- |
| Profil dan autentikasi PM | Dashboard, SIMA, harga, katalog Admin, listing | Tidak mengambil akun/role dari proyek lomba. |
| `knowledge_entries` | Katalog penyakit dan retrieval SIMA | Terpublikasi tidak berarti tervalidasi ahli; kurasi lama tetap diperlukan. |
| Pipeline PIHPS | Sinkronisasi Admin dan tampilan Market Insight | Bukan feed harga real-time dalam percakapan SIMA; tidak memiliki forecasting. |
| `harvest_listings` | Listing pemilik, katalog, moderasi | Tabel dasar tersedia; implementasi aplikasi masih harus dibangun. |
| Aset penyakit/panen | Katalog/Harvest Listing | Foto dengan provenance/hak pakai dan Storage aman belum otomatis tersedia. |

## 8. Data dan aturan kualitas

| Entitas | Informasi utama | Aturan penting |
| --- | --- | --- |
| `profiles` | ID akun, nama, role, desa | Role Petani/Admin; pengguna tidak dapat menaikkan peran sendiri. |
| `knowledge_entries` | Identitas dokumen, konten, sumber, metadata, status | Katalog awal memakai penanda `pm-disease-v1`; jangan menimpa materi lain saat seed ulang. |
| `chat_logs` | Pemilik, pesan, respons, feedback | Akses per pemilik; bukan sarana membuka chat semua pengguna kepada Admin. |
| `market_regional_price` | Tanggal, provinsi, komoditas, jenis, harga | Tanggal publikasi asli, harga valid positif, kombinasi unik; retensi khusus harga. |
| `market_price` | Seri kompatibilitas harga Jawa Timur | Khusus produsen; tidak mencampur empat jenis. |
| `harvest_listings` | Pemilik, panen, lokasi, harga, kontak, foto, status | Pemilik tidak dapat menerbitkan sendiri atau menyunting milik pengguna lain. |

Gunakan skema aktif `docs/database/simantri_pm_schema.sql` dan tipe hasil generasi sebagai rujukan teknis; jangan memakai skema lomba yang sudah dikeluarkan. Tabel, kolom atau status yang tersedia tidak otomatis berarti alur UI/API telah selesai.

Data uji/simulasi harus diberi label dan dipisahkan dari klaim aktual. Snapshot jumlah data pada dokumentasi adalah bukti saat pemeriksaan terdahulu, bukan angka tetap produk atau jaminan data hari ini.

## 9. Kebutuhan nonfungsional

| ID | Aspek | Kebutuhan dan penerimaan |
| --- | --- | --- |
| NFR-01 | Keamanan akses | Sesi dan peran diperiksa pada operasi sensitif; RLS tetap aktif. Lulus pengujian akses silang, akses anonim dan perubahan role ilegal. |
| NFR-02 | Rahasia dan lingkungan | Kunci server tidak dikirim ke browser, commit, log atau dokumen. Seluruh perubahan PM hanya menargetkan proyek PM, tidak menyentuh proyek/folder lomba. |
| NFR-03 | Privasi | Percakapan/profil privat tidak menjadi konten publik. Kontak penjual hanya tampil setelah persetujuan publikasi yang jelas. Kebijakan retensi data pribadi ditetapkan terpisah dari harga. |
| NFR-04 | Kegagalan layanan | Loading, empty, error, retry dan partial success dapat dibedakan. Jaringan gagal tidak diganti angka harga atau klaim jawaban terverifikasi. |
| NFR-05 | Responsivitas dan aksesibilitas | Alur inti diuji pada ponsel dan desktop; tidak ada tombol penting terpotong, label form tidak hilang, dan navigasi keyboard dapat digunakan. |
| NFR-06 | Performa dan efisiensi | Batasi data yang diambil sesuai kebutuhan, riwayat harga maksimal 60 hari, dan pemanggilan AI tidak berulang tanpa alasan. Waktu respons diukur pada lingkungan uji; belum ada SLA produksi atau klaim kapasitas pengguna bersamaan. |
| NFR-07 | Hak pakai dan provenance | Sumber materi, tanggal publikasi bila diketahui, kredit foto dan status izin dapat ditelusuri. Tidak menghapus watermark atau menyamarkan sumber. |
| NFR-08 | Kemudahan pemeliharaan | Satu baseline PM, pengujian regresi dan dokumentasi aktif dipertahankan. Tidak memerlukan layanan Python/ML lomba untuk menjalankan web PM. |

## 10. Status implementasi dan gap

Status berikut disusun dari kode serta dokumentasi lokal yang ditinjau pada 26 Oktober 2026. Ini bukan audit live ulang seluruh database atau layanan eksternal.

| Area | Status aktual | Gap menuju penerimaan lengkap |
| --- | --- | --- |
| Login/profil/Petani/Admin | Tersedia; akses dashboard tanpa sesi diarahkan ke login. | Konfirmasi email/reset sandi nyata dan uji browser Petani terpisah perlu dilengkapi. |
| Katalog penyakit | Empat materi baru, pencarian/filter, detail panduan, sumber dan editor Admin tersedia. | Galeri foto in-app, validasi agronomi, serta pengelolaan penambahan materi belum lengkap. |
| SIMA RAG | Retrieval teks/keyword, generasi/fallback, rujukan, pencatatan dan feedback telah diimplementasikan. | Akses generasi anonim, label fallback, kejelasan gagal menyimpan, kualitas KB dan evaluasi jawaban perlu dituntaskan. Model/kuota aktif harus diuji tanpa menganggap daftar kandidat menjamin ketersediaan. |
| Market Insight | Empat jenis, filter, grafik, sinkronisasi Admin dan retensi sudah tersedia serta memiliki bukti uji terdahulu. | Uji pengguna dan pengujian gangguan sumber perlu dilanjutkan; cakupan/tanggal data harus diperiksa saat dipakai. |
| Harvest Listing | Skema dasar tersedia; UI hanya placeholder. | Seluruh alur aplikasi listing/foto/pencarian/kontak/moderasi serta validasi transisi status belum selesai. |
| Dunia Brambang/landing | Dipertahankan; video lomba dikeluarkan dan diganti ringkasan modul PM. | Tinjau seluruh copy/simulasi lama agar tidak menjanjikan kemampuan yang tidak tersedia. |
| Pengujian/paket lokal | Pembersihan terakhir mencatat 72 tes lulus dan build verifikasi Webpack berhasil. | Tes tersebut bukan UAT, validasi ahli, audit keamanan menyeluruh, atau jaminan build Turbopack di setiap lingkungan. |

### Gap yang dilacak

| ID | Gap | Prioritas | PIC berbasis peran | Bukti penutupan |
| --- | --- | --- | --- | --- |
| G-01 | Foto penyakit belum menjadi galeri berizin di aplikasi. | P0 untuk menyatakan galeri selesai | Business Analyst/UI-UX + Full Stack Developer | Foto, dasar izin, kredit dan pemeriksaan relevansi untuk empat penyakit. |
| G-02 | Harvest Listing belum diimplementasikan. | P0 | Full Stack Developer + QA/Implementation | Alur pemilik–Admin–pembaca, unggah foto dan uji akses lulus. |
| G-03 | Peninjauan materi lama dan validasi konten belum selesai. | P0 untuk klaim kualitas materi | Data/AI Engineer + Business Analyst | Catatan review yang membedakan ringkasan editorial dengan validasi ahli. |
| G-04 | Endpoint chat membaca sesi tetapi belum menolak seluruh permintaan generasi tanpa pengguna. | P0 sebelum uji dengan akses lebih luas | Full Stack Developer + Data/AI Engineer | Permintaan anonim tidak dapat memicu generasi/riwayat privat; uji endpoint langsung dan pembatasan penggunaan disiapkan. |
| G-05 | Fallback AI atau kegagalan pencatatan berpotensi kurang jelas bagi pengguna. | P0 | Data/AI Engineer + Full Stack Developer | Label/status respons serta UI membedakan generasi, ringkasan fallback, tanpa rujukan dan riwayat gagal tersimpan. |
| G-06 | UAT, email nyata, privasi kontak dan keputusan Storage belum dituntaskan. | P0 sebelum penerimaan akhir | QA/Implementation + Project Manager | Matriks UAT, keputusan konfigurasi dan persetujuan batas prototype. |
| G-07 | Copy landing lama perlu diselaraskan lebih lanjut dengan kemampuan PM. | P1 | Business Analyst/UI-UX | Tidak ada klaim harga lelang live, monitoring kamera/telemetri atau kepastian diagnosis yang tidak ditunjang modul. |

Pembuatan PRD ini hanya mencatat gap tersebut; tidak mengimplementasikan perbaikannya secara otomatis.

## 11. Rencana implementasi berbasis hasil

| Tahap | Aktivitas | Output/exit criteria | PIC utama |
| --- | --- | --- | --- |
| 1. Baseline kebutuhan | Review PRD, peran, batas prototype dan keputusan terbuka. | Daftar kebutuhan serta skenario UAT disetujui; tidak ada interpretasi scope yang bertentangan. | Project Manager + Business Analyst/UI-UX |
| 2. Desain dan konfigurasi | Finalisasi alur listing, kebijakan foto/Storage, validasi form dan kontrol akses. | Desain, aturan data dan rencana pengujian siap diimplementasikan. | Business Analyst/UI-UX + Full Stack Developer |
| 3. Penyiapan/kurasi data | Review sumber penyakit, hak foto, KB SIMA dan kebutuhan data uji. | Konten berprovenance dan data demo berlabel; tidak mengimpor akun/chat/harga lomba. | Data/AI Engineer |
| 4. Pengembangan gap | Implementasi Harvest Listing, pengamanan SIMA, pelabelan fallback dan penyempurnaan foto. | Alur inti tiap modul berfungsi sesuai requirement; gap terdokumentasi, bukan disembunyikan. | Full Stack Developer + Data/AI Engineer |
| 5. Integrasi dan validasi | Uji peran, data silang, sumber gagal, status listing, retensi dan tampilan. | Skenario kritis lulus tanpa menonaktifkan keamanan atau merusak data asli. | QA/Implementation |
| 6. Uji coba terbatas | Pengguna menjalankan tugas dan memberi feedback; perbaikan lalu uji ulang. | Laporan hasil UAT dan batasan yang diterima secara eksplisit. | QA/Implementation + Project Manager |
| 7. Pelatihan dan penyerahan | Panduan Petani/Admin, demo, dokumentasi konfigurasi dan serah terima. | Prototype, catatan uji, PRD final dan panduan terserahkan. Bukan peluncuran publik. | Project Manager + QA/Implementation |

Susunan peran mengikuti cara kerja perusahaan: Project Manager, Business Analyst/UI-UX, Full Stack Developer, Data/AI Engineer, dan QA/Implementation. Jumlah orang mengikuti kapasitas rencana kerja yang disetujui, bukan harus sama dengan jumlah anggota kelas. Semua anggota tim pelaksana tetap memiliki kontribusi yang dapat dilacak; tidak ada alokasi jam atau fee per jam dalam PRD.

**Hubungan dengan dokumen Project Management:**

- PRD menetapkan apa yang dibangun dan bagaimana penerimaannya, bukan menggantikan Project Charter, WBS, jadwal atau RAB.
- Target diskusi tetap sampai minggu ketiga Desember. Tahun dan tanggal kalender final harus dicocokkan dengan baseline jadwal/ProjectLibre; PRD ini tidak membuat tanggal mulai/akhir baru.
- RAB mengikuti revisi terakhir yang disetujui, dengan pagu proyek maksimal Rp50 juta dan cadangan biaya 10% diperhitungkan di dalam pagu, bukan otomatis ditambahkan melebihi pagu.
- Fee pekerja dan operasional tetap dibedakan dalam dokumen RAB; angka per paket/volume/satuan tidak ditetapkan ulang lewat PRD ini. Pengeluaran riil kelompok tidak disamakan dengan nilai estimasi proyek perusahaan.

## 12. Risiko produk dan respons

### 12.1 Aspek biaya

| Risiko | Pencegahan/mitigasi | Respons ketika terjadi | PIC |
| --- | --- | --- | --- |
| Konsumsi AI, hosting, foto atau Storage melebihi estimasi. | Tetapkan batas penggunaan, pantau kuota, gunakan foto berizin dan kapasitas uji yang proporsional. | Gunakan cadangan 10% sesuai persetujuan; prioritaskan kebutuhan P0 dan minta persetujuan sebelum layanan berbayar/perluasan. | Project Manager + Data/AI Engineer |
| Pengadaan foto atau layanan tambahan mendadak. | Verifikasi kebutuhan dan izin lebih awal; siapkan referensi sumber sebagai batas versi parsial. | Jangan mengklaim galeri selesai tanpa aset yang sah; sesuaikan urutan pekerjaan melalui review scope. | Project Manager + Business Analyst |

Cadangan biaya tidak dianggap pengeluaran wajib atau pengganti perencanaan biaya yang jelas. Total dasar dan cadangan harus tetap sesuai pagu yang disetujui.

### 12.2 Aspek SDM

| Risiko | Pencegahan/mitigasi | Respons ketika terjadi | PIC |
| --- | --- | --- | --- |
| Anggota sakit, berhalangan, atau keluar proyek. | Dokumentasi progres, akses melalui akun/prosedur tim, review silang dan PIC cadangan untuk pekerjaan kritis. | Project Manager mengalihkan pekerjaan, melakukan handover dan menyesuaikan kapasitas tanpa berbagi sandi pribadi atau membuka akses berlebihan. | Project Manager |
| Pengetahuan teknis hanya dikuasai satu orang. | Catat cara menjalankan, konfigurasi, sumber data, kontrak modul dan bukti uji. | Pasangkan pengembang/peninjau, gunakan dokumentasi untuk pemulihan dan prioritaskan fitur inti. | Full Stack Developer + Data/AI Engineer |

### 12.3 Aspek waktu

| Risiko | Pencegahan/mitigasi | Respons ketika terjadi | PIC |
| --- | --- | --- | --- |
| Implementasi atau integrasi melewati jadwal. | WBS berbasis output, review milestone dan buffer sesuai baseline schedule. | Evaluasi jalur kritis, alihkan kapasitas dan tunda P1 melalui persetujuan; jangan mengorbankan kontrol akses atau mengklaim placeholder selesai. | Project Manager |
| PIHPS/AI tidak tersedia saat uji/demo atau foto belum dapat dipakai. | Uji koneksi lebih awal; gunakan data tersimpan dengan tanggal jelas dan rencana skenario demo cadangan. | Tampilkan kondisi layanan dan keterbatasan secara jujur; jadwalkan uji ulang, jangan membuat harga aktual atau diagnosis pengganti. | QA/Implementation + Data/AI Engineer |

## 13. Penerimaan dan skenario uji minimum

| ID uji | Skenario | Hasil yang harus dibuktikan | Kebutuhan terkait |
| --- | --- | --- | --- |
| UAT-01 | Login Petani, login Admin, akses tanpa sesi, dan upaya ubah role. | Hak akses sesuai peran, tanpa jalur eskalasi dari data pengguna. | AUTH-01–03, NFR-01–02 |
| UAT-02 | Cari moler, gabungkan filter bagian tanaman, cari istilah tidak ada, lalu reset. | Hasil sesuai isi materi; tidak ada diagnosis otomatis; empty/error/reset jelas. | DIS-01–02 |
| UAT-03 | Buka foto/sumber dan tinjau status hak pakai. | Foto/halaman sumber sesuai penyakit; kredit dan keterbatasan galeri terlihat. | DIS-03–04, NFR-07 |
| UAT-04 | Admin mengubah materi dan status; dua editor menyimpan versi berbeda. | Perubahan tersimpan; draft tersembunyi; konflik tidak menimpa perubahan lain. | DIS-05–06 |
| UAT-05 | Tanya SIMA dengan materi relevan, tanpa materi, layanan AI gagal dan input berbahaya. | Rujukan benar; fallback serta keterbatasan jelas; tidak membocorkan rahasia atau membuat klaim palsu. | RAG-01–04, RAG-06 |
| UAT-06 | Panggil chat tanpa sesi dan coba akses/feedback chat pengguna lain. | Batas penggunaan dan kepemilikan ditegakkan pada endpoint/database, bukan UI saja. | RAG-05, G-04 |
| UAT-07 | Ganti empat jenis harga, provinsi, tanggal dan rentang grafik. | Seri tidak tercampur; tanggal/sumber benar; data kosong tidak direkayasa. | MKT-01–03 |
| UAT-08 | Admin sinkronisasi berulang, gagal parsial, batalkan dan pulihkan rentang. | Tidak duplikat; status per bagian benar; gagal/batal tidak memicu cleanup. | MKT-04–06, MKT-08–09 |
| UAT-09 | Uji tepat batas hari ke-60 dan data lebih tua dengan fixture terisolasi. | Tanggal batas disimpan; data kedaluwarsa dibersihkan sesuai hak Admin; fixture dibatalkan/ditangani tanpa merusak data asli. | MKT-07, NFR-01 |
| UAT-10 | Buat draft listing, unggah foto, ajukan, moderasi dan cari sebagai pengguna lain. | Listing hanya terlihat sesuai hak/status; foto aman; pemilik tidak dapat menerbitkan sendiri. | HLV-01–05 |
| UAT-11 | Buka kontak, ubah listing menjadi sold, coba modifikasi listing milik orang lain. | Kontak sesuai persetujuan; sold tidak ditawarkan sebagai tersedia; akses silang ditolak. | HLV-06–07, NFR-03 |
| UAT-12 | Jalankan alur pada ponsel/desktop serta buka Dunia Brambang. | Kontrol penting bisa digunakan; edukasi/tema/bahasa tetap berfungsi sesuai cakupannya. | UX-01–02, EDU-01, NFR-05 |

**Definition of Done untuk penerimaan akhir prototype:**

1. Kebutuhan P0 yang masuk baseline telah diimplementasikan dan memiliki bukti uji; pengecualian hanya sah jika diterima secara eksplisit dan dicatat sebagai batasan, bukan diubah menjadi klaim selesai.
2. Alur inti keempat modul dapat didemonstrasikan. Selama Harvest Listing masih placeholder, prototype belum memenuhi keseluruhan target empat modul.
3. Tidak ada temuan kritis akses silang, role, kebocoran rahasia, harga buatan sebagai aktual, atau sumber/foto palsu yang belum ditangani.
4. Keterbatasan konten agronomi, galeri foto, layanan pihak ketiga dan cakupan data terlihat jelas.
5. Kode/build, dokumentasi pengguna/Admin, hasil tes/UAT dan daftar masalah tersisa diserahkan.
6. Tidak mengubah aplikasi atau database lomba dan tidak menyebarluaskan prototype tanpa keputusan lanjutan.

## 14. Keputusan yang masih terbuka

| ID | Keputusan yang diperlukan | Batas sementara |
| --- | --- | --- |
| DEC-01 | Tahun/tanggal baseline akhir dan distribusi pekerjaan per milestone. | Ikuti ProjectLibre dan rencana PM yang disetujui; jangan mengarang tanggal pada dokumen produk. |
| DEC-02 | Foto penyakit yang sah dipakai dan pihak peninjau konten. | Tautan referensi resmi tetap disertai kredit; galeri/validasi ahli tidak diklaim selesai. |
| DEC-03 | Batas jumlah/ukuran/format foto, bucket dan aturan akses Storage. | Belum ada alur unggah produksi; jangan membuka bucket tanpa desain hak akses dan uji. |
| DEC-04 | Kanal kontak penjual, persetujuan publikasi dan lama penyimpanan kontak/chat/listing. | Tidak otomatis memakai kebijakan 60 hari harga untuk data pribadi. |
| DEC-05 | Peserta, jumlah sesi, target waktu tugas dan penanggung jawab UAT. | Pengujian terbatas, bukan klaim telah dipakai masyarakat luas. |
| DEC-06 | Konfigurasi model AI, kuota/rate limit dan indikator fallback. | Hanya layanan yang benar-benar diuji boleh diklaim tersedia; tidak membuat biaya berbayar baru tanpa persetujuan. |

## 15. Rujukan internal dan pengelolaan perubahan

| Dokumen/komponen | Fungsi |
| --- | --- |
| `PROJECT_CONTEXT.md` | Kesepakatan scope PM, pemisahan lomba, dan konteks implementasi. |
| `README.md` | Ringkasan status modul dan cara menjalankan. |
| `PANDUAN_MENJALANKAN_LOCAL.md` | Panduan lokal PM, termasuk fallback build yang diuji. |
| `docs/INFORMASI_PENYAKIT.md` | Sumber, provenance foto, kurasi awal dan keterbatasan katalog. |
| `docs/PM_DATABASE_SETUP.md` | Setup database PM dan bukti pemeriksaan sebelumnya. |
| `docs/database/simantri_pm_schema.sql` | Snapshot skema PM serta kebijakan akses; bukan instruksi menerapkan ulang ke proyek aktif. |
| `src/lib/market/pihps.ts` | Definisi empat jenis harga dan jendela kalender implementasi. |
| `src/app/api/chat/route.ts` | Retrieval/generasi/fallback serta gap autentikasi/pelabelan yang dicatat. |
| `docs/PM_CLEANUP.md` | Batas pembersihan, hasil verifikasi dan pelestarian versi lomba. |
| `../output/SIMANTRI_Project_Plan.pod` | Artefak jadwal untuk dicocokkan sebelum menetapkan tanggal kalender final; belum diverifikasi ulang dalam penulisan PRD. |
| Proposal dan RAB pada `../output/` | Dokumen pengelolaan proyek terpisah; nominal/tanggal final mengikuti versi yang disetujui. |

PRD adalah rujukan kebutuhan dan penerimaan; `PROJECT_CONTEXT.md` mencatat konteks/riwayat teknis. Jika keduanya berbeda, catat perbedaannya untuk review, bukan menghapus batasan atau memperluas scope diam-diam. Perubahan requirement harus mencatat ID terdampak, alasan, dampak biaya/waktu/risiko, PIC, persetujuan dan bukti uji yang diperbarui.

**Riwayat versi:** 1.0 — 26 Oktober 2026: PRD pertama khusus PM setelah pembersihan salinan lomba, berdasarkan diskusi serta kode/dokumentasi lokal; tidak mengubah aplikasi maupun database.
