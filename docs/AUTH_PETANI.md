# Daftar dan login Petani

Pemeriksaan: 2 November 2026. Khusus proyek `simantri-pm` (`fdprawhpeoefpcnlbiya`).

## Status aktual

- Signup email/password aktif. Setelah persetujuan pengguna pada 2 November 2026, `Confirm email` dinonaktifkan sementara (`mailer_autoconfirm: true`) untuk uji coba prototype.
- Alur sementara: daftar → akun dan profil Petani dibuat → sesi login diterbitkan → dashboard. Tidak perlu persetujuan Admin atau membuka email konfirmasi. Form yang sudah ada menangani `data.session` dengan membuka `/dashboard`.
- Form daftar mengirim nama, email, kata sandi dan lokasi ke Supabase Auth. Trigger database membuat profil dengan role `petani`, tanpa mempercayai role dari metadata pengguna.
- Login ulang melalui `signInWithPassword`; server memeriksa sesi dan role profil sebelum membuka dashboard. Halaman Admin menolak role Petani.
- Ditambahkan `/auth/callback` untuk menukar kode PKCE menjadi sesi cookie dan kembali ke `/dashboard`. Tautan invalid/kedaluwarsa kembali ke login dengan pesan yang aman. Parameter tujuan bebas tidak diterima.
- Form daftar memakai `emailRedirectTo` sesuai origin browser. Dashboard Supabase sudah menyimpan dua redirect URL tepat: `http://127.0.0.1:3000/auth/callback` dan `http://localhost:3000/auth/callback`. Site URL tetap `http://localhost:3000`.

## Status pengiriman email (ditunda)

Custom SMTP **belum aktif**, berdasarkan halaman Authentication → Emails → SMTP Settings. Karena konfirmasi email kini dinonaktifkan sementara, SMTP tidak diperlukan untuk pendaftaran dan login email/password pada uji coba ini. Pengiriman email seperti pemulihan kata sandi tetap membutuhkan layanan email yang sesuai.

Konsekuensi mode sementara: kepemilikan email tidak dibuktikan dan email salah ketik bisa terdaftar. Pembatasan peran Petani/Admin, sesi login, dan RLS tetap aktif. Konfigurasi proyek lomba tidak diubah. Tidak ada akun baru dibuat atau email dikirim dalam pemeriksaan pengaturan ini.

Sebelum mengaktifkan kembali konfirmasi email, siapkan SMTP dan uji alur email sesuai `SMTP_SETUP.md`. Callback tetap tersedia untuk tahap tersebut.

Referensi resmi: https://supabase.com/docs/guides/auth/auth-smtp

## Uji penerimaan mode sementara

1. Pemilik email mendaftar sendiri di `/register` menggunakan kata sandi privat.
2. Setelah pendaftaran berhasil, pastikan dashboard langsung terbuka tanpa langkah email.
3. Pastikan profil mendapat role Petani.
4. Keluar, lalu masuk ulang di `/login`; pastikan sesi tetap berfungsi setelah reload.
5. Coba `/admin`; harus kembali ke dashboard Petani.

Pengaturan disimpan melalui dashboard Supabase dan diperiksa ulang melalui endpoint pengaturan Auth: signup aktif, email/password aktif, konfirmasi email tidak diwajibkan. Pengujian otomatis callback dan role memakai mock; itu bukan bukti login akun Petani nyata. Pendaftaran dan login ulang menggunakan kredensial milik pengguna tetap perlu diuji langsung.
