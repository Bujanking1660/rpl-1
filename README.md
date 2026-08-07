# Pak Resto UNIKOM — Sistem Manajemen Operasional Restoran

Sistem Informasi Manajemen Operasional Restoran berbasis web untuk **Pak Resto UNIKOM**. Aplikasi ini mengintegrasikan seluruh alur kerja restoran mulai dari alokasi meja oleh pelayan, pemesanan mandiri oleh pelanggan melalui QR, pemrosesan pesanan di dapur, konfirmasi pembayaran oleh kasir, hingga dashboard analitik untuk manajer.

Dibangun dengan **Next.js (App Router)**, **Supabase**, dan **Tailwind CSS v4**, dengan dukungan **Realtime** (Supabase Postgres Changes) agar semua peran mendapat pembaruan data secara langsung.

---

## Fitur

### Portal Pelanggan (Self-Service via QR)
- Pelayan mengalokasikan meja dan menghasilkan **QR code** berisi token sesi (berlaku 3 jam) yang bisa dicetak/ditunjukkan ke pelanggan.
- Pelanggan memindai QR untuk membuka halaman menu di meja mereka.
- Pelanggan dapat memilih menu (Makanan/Minuman), mengatur jumlah item, dan mengirim pesanan ke dapur.
- Ronde pesanan baru otomatis dibuat setelah pembayaran ronde sebelumnya selesai.
- Pelanggan dapat melihat **status pesanan** dan membayar tagihan.

### Portal Pelayan
- Alokasi meja: pilih jumlah tamu (preset cepat 2/4/6/8, maks 20), pilih meja yang tersedia, lalu meja ditandai **terisi**.
- Status meja realtime: okupansi, meja terisi/tersedia, dan kemampuan membersihkan meja.
- QR Code & tautan sesi meja untuk pelanggan (bisa disalin/dibagikan).
- Menandai pesanan sebagai **disajikan** ketika semua item sudah disajikan, pesanan otomatis selesai.

### Portal Kasir
- Antrian tagihan **menunggu pembayaran** per meja secara realtime.
- Detail pesanan per meja dengan filter kategori (Makanan/Minuman).
- Proses pembayaran dengan 2 metode: **Tunai** (hitung kembalian otomatis) dan **QRIS/GoPay**.
- Struk otomatis cetak (`window.print`) setelah pembayaran terkonfirmasi.
- Pesanan yang sudah dibayar diteruskan ke dapur (status `diproses`).

### Portal Koki
- Antrian pesanan yang sudah dibayar dan disetujui kasir.
- Update status tiap item: `Diproses` → `Selesai` → (disajikan oleh pelayan) atau `Bahan_Tidak_Tersedia`.
- Riwayat pesanan yang sudah dikerjakan hari ini, dengan pencarian.

### Portal Manajer
- **Dashboard analitik**: total pegawai, total pemasukan, pendapatan hari ini/kemarin/minggu ini, pertumbuhan harian, grafik revenue 7 hari, okupansi meja, top 5 menu terlaris, dan distribusi peran pegawai.
- **CRUD Pegawai** (pelayan/kasir/koki/manajer).
- **CRUD Menu** (nama, harga, kategori, status tersedia/habis).
- **CRUD Meja** (nomor meja, kapasitas, status).
- **Laporan transaksi** dengan filter rentang tanggal.

---

## Teknologi

| Teknologi | Kegunaan |
|---|---|
| [Next.js 16](https://nextjs.org) (App Router) | Framework front-end & API Routes |
| [React 19](https://react.dev) | UI |
| [Tailwind CSS v4](https://tailwindcss.com) | Styling |
| [Supabase](https://supabase.com) | Database PostgreSQL, Auth anon, Realtime |
| [framer-motion](https://www.framer.com/motion/) | Animasi UI |
| [recharts](https://recharts.org) | Grafik dashboard manajer |
| [qrcode.react](https://www.npmjs.com/package/qrcode.react) | Pembuatan QR code sesi meja |
| [bcryptjs](https://www.npmjs.com/package/bcryptjs) | Verifikasi password (kompatibel bcrypt/plain) |
| [sonner](https://sonner.emilkowal.ski/) | Notifikasi toast |
| [lucide-react](https://lucide.dev) | Ikon |
| [date-fns](https://date-fns.org) | Manipulasi tanggal |

---

## Menjalankan di Lokal

### Prasyarat
- Node.js 18.18+ (disarankan Node 20+)
- npm / yarn / pnpm / bun
- Proyek Supabase (URL & publishable key)

### Langkah Instalasi

1. Clone repositori dan masuk ke direktori:

   ```bash
   git clone <repository-url>
   cd rpl-1
   ```

2. Install dependensi:

   ```bash
   npm install
   ```

3. Salin `.env` dan isi konfigurasi Supabase:

   ```bash
   # .env.local
   NEXT_PUBLIC_SUPABASE_URL=<SUPABASE_PROJECT_URL>
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<SUPABASE_PUBLISHABLE_KEY>
   ```

4. Jalankan server pengembangan:

   ```bash
   npm run dev
   ```

5. Buka [http://localhost:3000](http://localhost:3000).

> **Akses via LAN (mobile)**: saat `npm run dev` berjalan, kunjungi `http://<IP-LAN>:3000` (IP terdeteksi otomatis lewat `/api/lan-ip`). Pastikan IP Anda sudah terdaftar di `allowedDevOrigins` pada `next.config.ts` jika diperlukan.

### Skrip

| Perintah | Deskripsi |
|---|---|
| `npm run dev` | Jalankan server pengembangan |
| `npm run build` | Build produksi |
| `npm start` | Jalankan hasil build produksi |
| `npm run lint` | Lint dengan ESLint |

---

## Pengaturan Database (Supabase)

1. Buka **SQL Editor** di dashboard Supabase.
2. Jalankan `supabase/schema.sql` untuk membuat skema (tabel, enum, index, RLS, dan Realtime).
3. Jalankan `supabase/seed.sql` untuk mengisi data awal (pegawai, 10 meja, 12 menu).
4. Untuk dukungan **ronde pesanan berganda** per sesi meja, pastikan constraint unik `pesanan_token_sesi_key` dihapus:

   ```sql
   ALTER TABLE pesanan DROP CONSTRAINT IF EXISTS pesanan_token_sesi_key;
   ```

5. Aktifkan **Realtime** pada publikasi `supabase_realtime` untuk tabel `meja`, `pesanan`, `detail_pesanan`, dan `pembayaran` (sudah otomatis ditambahkan oleh `schema.sql`).

---

## Akun Default (dari `seed.sql`)

| Nama | Peran | Username | Password |
|---|---|---|---|
| Budi Pelayan | Pelayan | `pelayan` | `pelayan123` |
| Siti Kasir | Kasir | `kasir` | `kasir123` |
| Andi Koki | Koki | `koki` | `koki123` |
| Rudi Manajer | Manajer | `manajer` | `manajer123` |

Login dilakukan melalui halaman `/login`. Setelah login, pegawai diarahkan otomatis ke portal sesuai perannya. Manajer memiliki akses ke semua portal.

---

## Struktur Proyek

```
app/
├─ (public)/meja/[token]/   # Portal pelanggan: menu, pembayaran, status
├─ (staff)/                 # Portal pegawai: pelayan, kasir, koki, manager
├─ api/lan-ip/              # API pendeteksi IP LAN untuk QR/tautan sesi
├─ login/                   # Halaman login pegawai
├─ layout.tsx               # Layout root & metadata
├─ globals.css              # Tailwind & komponen CSS global
└─ page.tsx                 # Halaman utama (redirect sesuai sesi)

lib/
├─ actions/                 # Server Actions (auth, pelayan, kasir, koki, manajer, pelanggan)
├─ auth/session.ts          # Manajemen sesi pegawai (cookie) & verifikasi login
├─ supabase/                # Klien Supabase (server & browser)
└─ types/database.ts        # Tipe TypeScript sepadan skema DB

supabase/
├─ schema.sql               # Skema database (tabel, enum, index, RLS, realtime)
└─ seed.sql                 # Data awal (pegawai, meja, menu)

middleware.ts               # Proteksi rute staff berdasarkan cookie sesi per peran
next.config.ts              # Konfigurasi Next.js (allowedDevOrigins)
```

---

## Alur Kerja Utama

1. **Pelayan** mengalokasikan meja untuk sejumlah tamu → meja jadi `terisi`, token sesi & QR dibuat.
2. **Pelanggan** scan QR → buka menu → pilih item → kirim pesanan (status `menunggu_pembayaran`).
3. **Kasir** melihat tagihan menunggu per meja → konfirmasi pembayaran (tunai/QRIS) → status `diproses` + struk.
4. **Koki** mengambil pesanan berstatus `diproses` → masak → tandai `Selesai`.
5. **Pelayan** menyajikan → tandai `Disajikan` → pesanan selesai.
6. **Pelanggan** bisa memesan ronde berikutnya; **Kasir** menagih lagi; **Manajer** memantau semua via dashboard & laporan.

---

## Disclaimers

- Proyek ini menggunakan **anon/publishable key** Supabase dengan kebijakan RLS yang mengizinkan akses publik untuk keperluan pembelajaran (RPL). **Jangan** gunakan konfigurasi ini apa adanya untuk produksi publik tanpa mengetatkan kebijakan keamanan.
- Password default pada `seed.sql` bersifat plain-text agar mudah digunakan saat pengembangan. Gunakan bcrypt (login sudah mendukungnya) untuk produksi.

---

## Proyek Tugas

Proyek ini dikembangkan sebagai tugas mata kuliah **Rekayasa Perangkat Lunak (RPL)** — Pak Resto · UNIKOM · 2026.
