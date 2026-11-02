# Pengiriman email konfirmasi SIMANTRI PM

Disiapkan 2 November 2026. Target hanya `simantri-pm`, ref `fdprawhpeoefpcnlbiya`.

Status terbaru: persiapan SMTP **ditunda** atas keputusan pengguna pada 2 November 2026. `Confirm email` sudah dinonaktifkan sementara pada Supabase PM sehingga pendaftaran email/password langsung menerbitkan sesi. Panduan di bawah hanya untuk saat konfirmasi email akan diaktifkan kembali; belum dijalankan. Akun Brevo, pengirim terverifikasi, serta SMTP login/key milik pengelola masih diperlukan pada tahap itu. Dokumen ini tidak menyimpan kredensial.

## Pilihan layanan

Brevo Free mendukung email transaksional melalui SMTP; dokumentasi paket saat pemeriksaan menyebut 300 email/hari. Batas pengiriman Supabase tetap berlaku secara terpisah. Gunakan paket Free; tidak perlu mengaktifkan paket berbayar untuk persiapan ini.

## 1. Pengelola membuat akun sendiri

1. Buka https://onboarding.brevo.com/account/register.
2. Daftar dengan email yang benar-benar dikuasai dan selesaikan verifikasi/onboarding secara jujur. Jangan gunakan identitas petani fiktif atau alamat contoh sebagai pengirim.
3. Pengelola sendiri mengisi kata sandi, persetujuan akun, dan kode verifikasi jika diminta.
4. Pastikan layanan Transactional/SMTP aktif. Jika akun memerlukan peninjauan, selesaikan peninjauan Brevo sebelum menguji pengiriman dari Supabase.

## 2. Siapkan pengirim dan kunci

1. Brevo → Settings → Senders, Domains, IPs → Senders → Add a sender.
2. Nama pengirim: `SIMANTRI PM`. Email pengirim: alamat yang benar-benar dikuasai dan diverifikasi di Brevo.
3. Selesaikan verifikasi pengirim. Untuk penggunaan lebih luas, gunakan domain sendiri dengan autentikasi sesuai instruksi Brevo; Gmail/Yahoo bukan domain yang dapat kita autentikasi sendiri. Jangan membeli domain tanpa keputusan pengelola.
4. Brevo → Settings → SMTP & API → SMTP. Catat nilai **SMTP login** dari halaman tersebut; nilainya belum tentu sama dengan email akun.
5. Pengelola membuat SMTP key khusus `simantri-pm-auth`. Pakai SMTP key, bukan API key atau kata sandi akun. Simpan privat; jangan masukkan ke chat, Git, atau variabel `NEXT_PUBLIC_*`.

## 3. Isikan langsung di Supabase PM

Halaman: https://supabase.com/dashboard/project/fdprawhpeoefpcnlbiya/auth/smtp

| Kolom | Nilai |
| --- | --- |
| Enable custom SMTP | Aktifkan setelah semua data siap |
| Sender email | Pengirim yang sudah diverifikasi di Brevo |
| Sender name | SIMANTRI PM |
| Host | smtp-relay.brevo.com |
| Port | 465 (TLS) |
| Username | SMTP login persis dari Brevo |
| Password | SMTP key khusus, diisi privat oleh pengelola |

Simpan setelah seluruh data benar. Jangan mengubah proyek lomba. Konfirmasi email tetap aktif. Kredensial SMTP cukup berada di Supabase; aplikasi tidak memerlukan kredensial ini dalam `.env.local`.

Redirect URL lokal yang telah disimpan:

- `http://127.0.0.1:3000/auth/callback`
- `http://localhost:3000/auth/callback`

Untuk deployment berikutnya, tambahkan callback origin deployment yang sebenarnya dan atur Site URL sesuai domain tersebut. Jangan menggunakan wildcard luas.

## 4. Uji penerimaan

1. Pengelola mendaftar akun Petani lewat http://127.0.0.1:3000/register menggunakan email yang dikuasai dan kata sandi privat.
2. Periksa email masuk/spam dan log Transactional Brevo. Email terkirim pada log tidak otomatis membuktikan email tiba di kotak masuk.
3. Buka konfirmasi di browser dan origin yang sama. Pastikan dashboard terbuka dan profil berperan Petani.
4. Keluar, login ulang, reload dashboard, dan pastikan `/admin` menolak Petani.
5. Jika gagal: periksa pengirim terverifikasi, aktivasi SMTP Brevo, SMTP login/key, kuota masing-masing layanan, serta URL redirect. Jangan menonaktifkan konfirmasi email untuk menutupi kegagalan.

## Sumber resmi

- Paket: https://help.brevo.com/hc/en-us/articles/208589409-About-Brevo-s-pricing-plans
- SMTP: https://help.brevo.com/hc/en-us/articles/7924908994450-Send-transactional-emails-using-Brevo-SMTP
- Pengirim: https://help.brevo.com/hc/en-us/articles/208836149-Create-a-new-sender-From-name-and-From-email
- Kunci: https://help.brevo.com/hc/en-us/articles/7959631848850-Create-and-manage-your-SMTP-keys
- Supabase: https://supabase.com/docs/guides/auth/auth-smtp
