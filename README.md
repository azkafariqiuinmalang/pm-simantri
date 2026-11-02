# SIMANTRI — Prototype Project Management

Sistem Informasi Pertanian Bawang Merah Terintegrasi. Kode dan database PM sudah dipisahkan dari versi lomba. Proyek Supabase: simantri-pm (fdprawhpeoefpcnlbiya), region Singapore, paket Free.

Kebutuhan produk, alur Petani/Admin, kriteria penerimaan dan gap implementasi ada di [PRD.md](PRD.md). Status dokumen: baseline untuk review tim, bukan klaim seluruh modul selesai.

## Status modul

| Modul | Status saat perapian |
| --- | --- |
| Informasi penyakit | Katalog empat penyakit, pencarian nama/gejala dan filter bagian tanaman. Admin menyunting materi serta draft/published. Rujukan teknis pemerintah dan tautan foto PDF dengan kredit; unggah/rehosting foto dan penambahan penyakit belum tersedia. |
| AI Assistant RAG | Implementasi sebelumnya dipertahankan dengan batas kemampuan versi PM. |
| Market Insight PIHPS | Empat jenis harga: produsen, pedagang besar, pasar tradisional, dan pasar modern. Filter tanggal/provinsi dan grafik 7/30/60 hari. Tombol Admin mengambil harga terbaru keempat jenis; sinkronisasi berhasil diikuti pembersihan riwayat lebih tua dari 60 hari kalender. Uji nyata 30 hari mengisi 2.685 catatan; data kosong tidak direkayasa. |
| Harvest Listing | Marketplace Panen dan Kelola Panen Saya: pencarian/filter, detail, draf, foto privat, pengajuan, moderasi Admin dengan catatan, kontak WhatsApp/telepon, serta status habis. Uji terbatas; tanpa pembayaran/pengiriman. Lihat docs/HARVEST_LISTING.md. |

Dunia Brambang, login, profil, tema, dan bahasa dipertahankan.
CV, forecasting, verifikasi Penyuluh, sinyal wilayah, dan usulan pengetahuan tidak lagi menjadi rute aplikasi aktif.

## Menjalankan

Gunakan Node.js dan dependensi proyek, lalu jalankan npm run dev.
Salin konfigurasi dari .env.example dengan kredensial proyek Supabase PM yang terpisah.
Isi GEMINI_API_KEY hanya pada server bila menggunakan layanan RAG. Sinkronisasi harga saat ini melalui sesi Admin; jadwal otomatis belum aktif dan tidak cukup diaktifkan hanya dengan mengisi CRON_SECRET.

Konfigurasi lokal sudah menunjuk database PM baru. Akun lomba tidak disalin: buat akun PM baru, lalu tetapkan Admin melalui pengelolaan database yang tepercaya. Jangan memberi hak Admin melalui metadata pendaftaran. Lihat docs/PM_DATABASE_SETUP.md untuk status setup dan pekerjaan yang tersisa.

## Verifikasi

Jalankan node --test tests/*.test.cjs untuk tes tanpa jaringan.
Jalankan pemeriksaan TypeScript dan build sebelum integrasi live.
Detail scope, arsip pemulihan, dan batas perubahan tersedia di PROJECT_CONTEXT.md serta docs/PM_CLEANUP.md.

Sisa proyek video lomba, eksperimen model, mockup CV/prediksi, dan dokumentasi skema lomba sudah dikeluarkan dari folder PM pada 26 Oktober 2026. Landing hanya menampilkan ringkasan empat modul PM, tanpa rekaman lomba. Dunia Brambang dipertahankan. Gunakan PROJECT_CONTEXT.md sebagai arah aktif; daftar penghapusan dan cara pemulihan ada di docs/PM_CLEANUP.md.
