# Menjalankan SIMANTRI PM secara lokal

Panduan ini hanya untuk D:/SEMESTER 5/PROJECT MANEJEMEN/PM (SIMANTRI), bukan versi lomba.

## Prasyarat

- Node.js minimal 20.9 (mengikuti dependensi Next.js yang terpasang) dan npm.
- Koneksi internet untuk autentikasi/database PM, PIHPS, dan SIMA jika layanan AI digunakan.
- Tidak memerlukan Python, YOLO, XGBoost, FastAPI, atau layanan model di port 8000/8001.

## Konfigurasi

Gunakan .env.local PM yang sudah tersedia. Bila menyiapkan komputer baru, gunakan .env.example dan isi konfigurasi proyek PM milik sendiri; jangan salin konfigurasi lomba. Jangan bagikan atau commit kunci.

Konfigurasi publik: NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY (publishable key). GEMINI_API_KEY hanya di server. Proyek PM: simantri-pm, ref fdprawhpeoefpcnlbiya. Tidak perlu service-role key untuk alur pengguna.

## Pengembangan

Dari folder PM (SIMANTRI):

```powershell
npm ci
npm run dev -- --hostname 127.0.0.1
```

npm ci hanya diperlukan saat dependensi belum tersedia atau package-lock berubah. Buka http://127.0.0.1:3000. Gunakan akun PM, bukan akun lomba. Penetapan role Admin mengikuti database PM tepercaya, tidak melalui pilihan registrasi.

## Menjalankan hasil build

```powershell
npm run build
npm run start -- --hostname 127.0.0.1
```

Jika .next belum ada setelah pembersihan, jalankan build terlebih dahulu. Cache build boleh dibuat ulang; jangan menghapusnya saat server sedang berjalan. Server perlu akses jaringan keluar; kegagalan verifikasi sesi akibat jaringan bukan alasan melemahkan RLS.

Pada verifikasi 26 Oktober, build Turbopack mengalami kegagalan proses internal pada lingkungan Windows ini. Mode alternatif bawaan Next.js dapat dijalankan tanpa mengganti kode atau konfigurasi aplikasi:

```powershell
npm run build -- --webpack
```

Build dari nol juga memerlukan akses ke Google Fonts. Kesalahan unduhan font saat jaringan dibatasi tidak diperbaiki dengan mengganti kredensial database.

## Modul dan verifikasi

Informasi penyakit, SIMA RAG, dan Market Insight tersedia; Harvest Listing masih tahap berikutnya. Dunia Brambang tetap dipertahankan. Tidak ada diagnosis foto atau forecasting harga.

```powershell
node --test tests/*.test.cjs
npm run build
```

Scope aktif: PROJECT_CONTEXT.md. Status database: docs/PM_DATABASE_SETUP.md. Catatan pembersihan: docs/PM_CLEANUP.md.
