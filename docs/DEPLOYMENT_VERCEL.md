# Sinkronisasi PIHPS di localhost dan Vercel

Pembaruan: 9 November 2026. Panduan ini mencakup perubahan sinkronisasi Market Insight, bukan pernyataan bahwa seluruh aplikasi sudah lolos uji deployment publik.

## Alur sinkronisasi

1. Admin membuka `/admin/market/input` dan memilih harga terbaru atau rentang 1/7/30/60 hari.
2. Untuk tombol harga terbaru, browser memanggil `GET /api/market/sync-pihps`. Setelah memeriksa sesi Admin, server membaca cakupan tanggal/jenis dari database PM secara berhalaman, maksimal 1.000 baris per halaman. Server menyusun empat tugas harga terbaru, lalu tugas tanggal/jenis yang belum tersimpan dalam jendela 60 hari, termasuk celah di tengah riwayat. Satu baris regional dengan harga positif menandakan kombinasi tanggal/jenis tersebut sudah tersedia; ini bukan pemeriksaan kelengkapan semua provinsi.
3. Browser mengirim **satu kombinasi per permintaan**, secara berurutan. Database kosong menghasilkan maksimal 240 permintaan kecil, bukan satu proses server sepanjang 60 hari. Opsi rentang tetap memperbarui semua kombinasi dalam rentang yang dipilih, termasuk yang sudah tersimpan.
4. `POST /api/market/sync-pihps` memeriksa sesi dan peran Admin, mengambil data PIHPS, memvalidasi tanggal publikasi serta komoditas, kemudian melakukan upsert ke database PM.
5. Halaman menampilkan progres dan hasil setiap kombinasi. Tombol hentikan menunggu permintaan aktif selesai sebelum menghentikan antrean. Jika pemeriksaan cakupan gagal, antrean penulisan tidak dimulai.
6. Pembersihan data di luar 60 hari kalender hanya dipanggil setelah antrean selesai tanpa kegagalan/pembatalan dan sedikitnya satu hasil tersimpan. Pembersihan berjalan melalui endpoint terpisah dengan otorisasi Admin.

Contoh: harga 6 November sudah tersimpan, 7–8 November terlewat, lalu Admin menekan tombol terbaru pada 9 November. Server tetap memasukkan tanggal 7 dan 8 ke antrean bila belum ada harga tersimpan untuk jenis terkait, sekalipun tanggal 9 sudah tersedia. Jika PIHPS tidak menerbitkan harga pada tanggal tersebut, status tanpa publikasi ditampilkan dan tidak dibuat harga buatan. Tanggal tanpa publikasi akan diperiksa kembali pada klik berikutnya agar publikasi yang terlambat tetap dapat ditemukan. Tidak diperlukan migrasi database maupun environment tambahan.

## Kontrak API

```json
{
  "mode": "today",
  "tanggal": "2026-11-03",
  "price_type": 4
}
```

- `mode`: `today`, `latest`, atau `backfill`. Ketiganya memproses maksimal satu tanggal per permintaan; `backfill` dipertahankan hanya sebagai kompatibilitas satu hari.
- `days`: opsional, default `1`. Nilai bulat lebih dari satu ditolak dengan HTTP 400 `SYNC_BATCH_TOO_LARGE`, tanpa mengambil harga atau menulis harga. Gunakan antrean halaman Admin untuk rentang panjang; API tidak diam-diam memotong permintaan beberapa hari menjadi satu hari.
- `price_type`: 4 produsen, 3 pedagang besar, 1 pasar tradisional, atau 2 pasar modern. Satu permintaan hanya untuk satu jenis.
- `latest` menetapkan tanggal pemeriksaan menurut server, zona Asia/Jakarta. Tanggal penyimpanan tetap tanggal publikasi sumber. Tidak ada harga sintetis pada akhir pekan.
- Pengulangan memakai upsert yang sudah tersedia. Jika koneksi putus saat penyimpanan, periksa hasil tersimpan sebelum mengulang; kegagalan koneksi tidak membuktikan transaksi database dibatalkan.

## Batas waktu

| Lapisan | Batas | Tujuan |
| --- | ---: | --- |
| Fungsi sinkronisasi Vercel | 60 detik | `export const maxDuration = 60`, dibaca saat build |
| Operasi koneksi server | 45 detik sejak handler mulai | Sinyal bersama untuk permintaan Supabase Auth, database, dan PIHPS; menyisakan waktu mengirim respons |
| Pengambilan PIHPS | 15 detik | Digabung dengan sisa batas operasi server |
| Menunggu respons sinkronisasi di browser | 70 detik | Menangani jaringan/proxy yang tidak merespons; lebih panjang daripada batas fungsi |
| Memuat ulang riwayat di browser | 15 detik | Menghindari penantian tanpa batas saat memuat riwayat |

Batas 45 detik membatalkan permintaan jaringan pada sisi aplikasi; ini bukan jaminan pembatalan transaksi yang sudah diterima database. Tidak ada retry otomatis tanpa batas. Hasil gagal ditampilkan per tanggal/jenis agar Admin dapat mengulang rentang yang diperlukan. Kegagalan autentikasi atau pemeriksaan peran akibat habisnya batas waktu ditampilkan sebagai `SYNC_TIMEOUT`, bukan kesalahan kredensial.

`maxDuration` merupakan konfigurasi platform, bukan timer server lokal. Sinyal jaringan juga bekerja di localhost. Klien Supabase yang tidak diberi sinyal tetap menggunakan perilaku sebelumnya. Tidak ada pergantian logika berdasarkan nama hosting.

## Konfigurasi deployment

- Deploy repositori PM sebagai aplikasi Next.js. Database, Auth, dan foto tetap di proyek Supabase `simantri-pm`.
- Isi `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` milik PM di lingkungan Vercel yang digunakan. `GEMINI_API_KEY` tetap variabel server untuk modul AI.
- Jangan mengunggah `.env.local` ke GitHub, menggunakan database lomba, atau menambahkan service-role key publik. Sinkronisasi ini memakai sesi Admin dan RLS yang sudah tersedia.
- Semua panggilan browser memakai jalur relatif `/api/...`, sehingga mengikuti alamat localhost, preview, atau production secara otomatis. Tidak perlu `localhost` tetap maupun `VERCEL_URL` untuk alur ini.
- Sesuaikan Site URL dan Redirect URLs pada Supabase dengan alamat deployment untuk alur autentikasi yang digunakan. Perubahan environment memerlukan deployment baru.
- Cron belum aktif dan tidak diperlukan oleh alur manual. Mengisi `CRON_SECRET` saja tidak mengaktifkan penulisan terjadwal. Railway tidak diperlukan untuk menjalankan antrean browser ini.

## Batas operasional dan pemeriksaan setelah deploy

- Admin harus membiarkan halaman terbuka sampai selesai. Antrean tidak disimpan sebagai pekerjaan latar belakang dan tidak otomatis berlanjut setelah reload atau tab ditutup. Klik harga terbaru kembali untuk menghitung ulang celah berdasarkan data yang sudah tersimpan. Tanggal/jenis yang berhasil dipulihkan dilewati; empat tugas terbaru selalu dijalankan lagi. Pengulangan memakai upsert sehingga tidak membuat duplikat.
- Durasi keseluruhan 240 permintaan dapat lebih dari lima menit; masing-masing permintaan memiliki batasnya sendiri. Proses berurutan menghindari membanjiri PIHPS dengan permintaan paralel dari satu antrean.
- Uji pada URL Vercel: login Admin, ambil keempat harga terbaru, periksa tanggal/harga sumber dan jumlah baris, lalu ulangi untuk memastikan tidak ada duplikat. Periksa akses ke PIHPS dari jaringan hosting, log kegagalan, dan hasil retensi.
- Tes lokal dengan mock mencakup penolakan backfill besar, timeout PIHPS, batas operasi saat autentikasi, penerusan sinyal Supabase, antrean 240 permintaan secara berurutan, sesi kedaluwarsa, serta respons timeout HTML/jaringan tanpa cleanup. Tes mock tidak membuktikan akses PIHPS dari Vercel atau hasil database nyata setelah deployment.

Rujukan: [Next.js maxDuration](https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config/maxDuration), [konfigurasi durasi Vercel](https://vercel.com/docs/functions/configuring-functions/duration).

## Hasil verifikasi perubahan, 3 November 2026

- Seluruh 92 tes lokal lulus. Pemeriksaan TypeScript, lint pada berkas yang diubah, dan `git diff --check` lulus.
- Build produksi `next build --webpack` lulus. Manifest hasil build mencatat `/api/market/sync-pihps` dengan `maxDuration: 60`.
- Build Turbopack lokal sempat gagal saat mengakses Google Fonts, kemudian mengalami kegagalan proses CSS di Windows. Webpack dipakai sebagai verifikasi alternatif; perintah build default repositori tidak diubah. Peringatan middleware lama masih ada dan tidak ditangani dalam perubahan sinkronisasi ini.
- Server sementara hasil build pada loopback port 3101 merespons `/login` dengan HTTP 200 dan POST sinkronisasi tanpa sesi dengan HTTP 401 `UNAUTHORIZED`. Server uji dihentikan setelah pemeriksaan; tidak ada penulisan harga atau cleanup pada pemeriksaan HTTP tersebut.
- Belum dilakukan deployment Vercel maupun pengambilan PIHPS melalui sesi Admin pada jaringan Vercel. Hasil 240 kombinasi berasal dari tes dengan mock, bukan impor data nyata.

## Verifikasi pengisian hari terlewat 9 November 2026

- Seluruh 97 tes lokal lulus, termasuk 32 tes Market Insight. Kasus baru mencakup dua hari terlewat, celah di tengah riwayat untuk satu jenis, cakupan regional di atas 1.000 baris, data awal kosong, pengulangan setelah celah terisi, penolakan Petani/anonim, dan kegagalan pemeriksaan cakupan tanpa penulisan maupun cleanup.
- Tes integrasi lokal menjalankan handler tombol Admin, GET perencana, POST sinkronisasi dan normalisasi sumber, lalu memeriksa argumen RPC penyimpanan. Respons PIHPS dan database dimock; ini bukan bukti harga nyata sudah diimpor ke Supabase.
- TypeScript, lint berkas yang berubah, dan `git diff --check` lulus. Build produksi `next build --webpack` lulus. Build dijalankan di luar sandbox setelah Windows menolak pembuatan folder cache `.next` dengan EPERM. Peringatan migrasi middleware yang sudah ada tetap tercatat.
- Server sementara hasil build pada loopback port 3101 merespons GET dan POST `/api/market/sync-pihps` tanpa sesi dengan HTTP 401 `UNAUTHORIZED`, serta `/login` dengan HTTP 200. Server uji dihentikan sesudahnya; pengujian HTTP tersebut tidak menulis harga atau menjalankan cleanup.
- Pada tahap verifikasi lokal ini, revisi belum dipush atau dideploy. Pengambilan harga nyata melalui sesi Admin pada deployment baru perlu diperiksa setelah publikasi kode.
