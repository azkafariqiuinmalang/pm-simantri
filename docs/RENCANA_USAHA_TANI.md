# Rencana Usaha Tani — SIMANTRI PM

Tanggal implementasi: 21 November 2026. Fitur pendukung usaha tani dan Harvest Listing, berdasarkan persetujuan pengguna untuk menggabungkan perhitungan sesudah panen serta perencanaan sebelum tanam. Perubahan ini menambah cakupan produk; tidak mengaktifkan kembali CV, SAW, atau prediksi harga.

## Alur Petani

1. Buka **Rencana Usaha Tani** pada navigasi dashboard atau halaman panen.
2. Pilih **Belum tanam / masih budidaya** atau **Sudah panen**.
3. Isi nama rencana. Jalur perencanaan mewajibkan luas lahan; jalur sudah panen mewajibkan berat aktual siap jual. Tanggal, lokasi, varietas, dan perkiraan dapat dilengkapi bertahap.
4. Isi anggaran per kategori. Gunakan jumlah × harga satuan atau jumlah 1, satuan paket untuk total biaya. Pilihan kebutuhan per 1.000 m² mengalikan jumlah masukan petani dengan luas/1.000, dibulatkan dua desimal, lalu menyimpan jumlah total. Kebutuhan nyata dan pembulatan kemasan tetap diperiksa petani. Jika luas diubah setelah rincian ditambahkan, tinjau jumlahnya kembali. Semua angka merupakan masukan petani; tidak ada standar hasil/biaya yang diasumsikan otomatis dari luas lahan.
5. Catat pengeluaran aktual bertanggal pada kategori yang sama. Anggaran belum dianggap sebagai transaksi aktual.
6. Isi hasil panen aktual, lalu catat penjualan yang disepakati secara bertahap, per kg atau tebasan. Tebasan tanpa berat tidak digunakan untuk menghitung stok yang tersisa.
7. Tekan **Simpan seluruh perubahan**. Rincian yang baru ditambahkan ke formulir belum tersimpan ke database sebelum tombol ini ditekan.
8. Setelah hasil aktual dan sisa berat diketahui, **Buat penawaran panen** mengisi draf penawaran dari rencana tersimpan. Foto dan kontak tetap dilengkapi. Penawaran tetap mengikuti moderasi. Membuat penawaran tidak mencatat penjualan otomatis.
9. Konfirmasikan kelengkapan seluruh pengeluaran, lalu tandai musim selesai setelah seluruh penjualan dicatat. Jika tanaman gagal, hasil aktual 0 tetap dapat dicatat.
10. **Salin ke musim baru** membawa informasi lahan dan anggaran tersimpan, tanpa transaksi lama atau hasil panen aktual. Angka dan tanggal rencana baru harus diperiksa kembali.

## Perhitungan

- Biaya satu rincian = pembulatan jumlah × harga satuan ke rupiah terdekat.
- Anggaran = jumlah rincian rencana biaya.
- Pengeluaran = jumlah rincian pengeluaran aktual.
- Sebelum konfirmasi biaya lengkap, perkiraan biaya akhir = jumlah nilai terbesar antara anggaran dan pengeluaran untuk setiap kategori. Ini setara pengeluaran aktual + sisa anggaran per kategori, sehingga biaya yang sama tidak dijumlahkan dua kali.
- Setelah konfirmasi biaya lengkap, biaya akhir = pengeluaran aktual, termasuk 0 jika pemilik secara eksplisit mengonfirmasi tidak ada biaya.
- Penerimaan per kg = berat terjual × harga kesepakatan; penerimaan tebasan = nilai kesepakatan total.
- Perkiraan penerimaan per kg = penerimaan tercatat + sisa berat × harga target. Hasil panen aktual menggantikan perkiraan saat sudah diisi. Angka 0 berbeda dari belum diketahui.
- Perkiraan penerimaan tebasan adalah target total satu musim, sekurang-kurangnya penerimaan yang sudah dicatat. Jika terjadi penjualan tanpa berat dan metode perkiraan per kg dipilih, perkiraan sisa penerimaan tidak ditampilkan.
- Estimasi laba/rugi = perkiraan penerimaan − perkiraan biaya akhir. Data yang belum lengkap menampilkan **Belum dihitung**.
- Saat musim selesai, laba/rugi tercatat = seluruh nilai penjualan tercatat − pengeluaran yang dinyatakan lengkap. Sisa stok tidak dianggap penerimaan.
- Harga impas seluruh panen = pembulatan ke atas biaya akhir / berat siap jual. Harga minimum sisa panen untuk menutup biaya = pembulatan ke atas maksimum(0, biaya akhir − penerimaan tercatat) / sisa berat.
- Rasio R/C = penerimaan / biaya, hanya jika biaya lebih besar dari 0. Nilai di atas 1 menunjukkan penerimaan perhitungan melebihi biaya.
- Skenario ±20% adalah variasi dari harga masukan pengguna untuk sisa stok, bukan prediksi PIHPS. Penjualan yang sudah dicatat dipertahankan pada nilai sebenarnya.
- Biaya per 1.000 m² berasal dari biaya catatan tersebut dibagi luas dan dikalikan 1.000; bukan rekomendasi anggaran baku.

## Akses dan penyimpanan

- Tabel baru `public.farm_plans` pada Supabase PM `fdprawhpeoefpcnlbiya`. Data lomba tidak disentuh.
- RLS membatasi SELECT/INSERT/UPDATE/DELETE kepada pemilik melalui `auth.uid() = owner_id`. Admin tidak dapat membaca keuangan akun lain.
- API memeriksa sesi serta profil PM, membatasi asal permintaan, ukuran data, panjang/angka/tanggal, jumlah rincian, dan penjualan melebihi hasil aktual yang diketahui.
- Pemilik ditentukan dari sesi; klaim pemilik dan hasil hitungan dari browser tidak digunakan. Kolom kepemilikan dan versi tidak memiliki izin ubah dari klien.
- Setiap perubahan menaikkan versi; pembaruan memakai versi terakhir untuk menolak konflik 409.
- Data finansial tidak ditambahkan pada tabel maupun API penawaran publik. Handoff ke formulir penawaran hanya berisi nama, varietas, lokasi, sisa berat, harga target per kg, dan tanggal panen.
- Migrasi: `docs/database/pm_farm_plans_migration.sql`.
- Uji akses database: `docs/database/pm_farm_plans_rollback_test.sql`, seluruh data uji dibatalkan dengan ROLLBACK.

## Rujukan metode

- Hasbiy & Hardana (2024), Analisis Pendapatan Usahatani Bawang Merah di Dataran Tinggi Kota Batu. https://jurnal.unpad.ac.id/agrikultura/article/download/53760/23447
- Krismiratsih & Fibriani (2025), Analisis Kelayakan Usahatani Bawang Merah, petani Rejoso Kabupaten Nganjuk. https://ejournal.unisi.ac.id/index.php/agribisnis/article/view/3667
- Nopitasari dkk. (2024), Studi Pemasaran Bawang Merah Menggunakan Sistem Tebasan di Nglinggo, Gondang, Nganjuk. https://ojs.unik-kediri.ac.id/index.php/jintan/article/view/5704

Rujukan digunakan untuk struktur biaya dan penerimaan, bukan untuk menetapkan harga/produktivitas terkini atau menjamin keuntungan petani.
