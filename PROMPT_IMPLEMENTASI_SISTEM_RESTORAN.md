# Prompt Implementasi — Sistem Informasi Manajemen Operasional Restoran (Pak Resto UNIKOM)

Kamu adalah software engineer yang bertugas mengimplementasikan **Sistem Informasi Manajemen Operasional Restoran** untuk "Pak Resto UNIKOM", berdasarkan dokumen requirement yang sudah final (PRD, Dokumentasi Proses Bisnis, Dokumentasi Analisis Kebutuhan Perangkat Lunak — termasuk ERD, DFD Konteks/Level 0/Level 1, Kode Kebutuhan KK-01 s.d. KK-23, dan Kamus Data). Ikuti spesifikasi di bawah ini secara ketat — **jangan menambah/menghapus entitas, alur, atau peran di luar yang didefinisikan**, kecuali diminta eksplisit.

Desain UI/UX **sudah tersedia** di folder `/ui` (hasil rancangan sesuai alur sistem pada dokumen). **Gunakan komponen dan alur halaman dari `/ui` sebagai acuan visual/struktur** — jangan mendesain ulang dari nol. Tugasmu adalah menyambungkan UI tersebut ke logika aplikasi (routing App Router, server actions, query Supabase) sesuai proses bisnis dan kamus data di bawah.

---

## 1. Tech Stack

| Layer | Teknologi |
|---|---|
| Framework | Next.js 14+ (App Router, Server Components + Server Actions) |
| Styling | Tailwind CSS (ikuti token warna/spacing yang sudah ada di `/ui`, jangan override) |
| Database & Auth | Supabase (Postgres + Supabase Auth/Realtime) |
| Bahasa | TypeScript (strict mode) |

### Library tambahan yang direkomendasikan (boleh disesuaikan bila `/ui` sudah memakai library lain)

| Kebutuhan | Library | Alasan |
|---|---|---|
| Komponen UI dasar (dialog, dropdown, toast, table) | `shadcn/ui` (Radix UI + Tailwind) | Konsisten dengan Tailwind, accessible, mudah dikustom sesuai `/ui` |
| Validasi form & schema | `zod` + `react-hook-form` (`@hookform/resolvers`) | Validasi input konsisten client & server (server actions) |
| State/​data fetching client-side yang butuh realtime | `@tanstack/react-query` | Cache & refetch untuk data yang tidak realtime-critical |
| Notifikasi | `sonner` | Toast untuk konfirmasi aksi (misal "Pesanan berhasil dibuat") |
| Icon | `lucide-react` | Ikon ringan, konsisten dengan shadcn/ui |
| Format tanggal/waktu | `date-fns` (locale `id`) | Format tanggal Indonesia di laporan & riwayat |
| Grafik laporan pendapatan | `recharts` | Visualisasi laporan pendapatan & operasional (Proses 8/Figure 7) |
| QR Code pembayaran (KK-20) | `qrcode.react` | Menampilkan QR statis GoPay di perangkat kasir |
| Skeleton loading | `react-loading-skeleton` atau util shadcn `Skeleton` | UX saat fetch data |

> Jika `/ui` sudah menggunakan pustaka lain untuk salah satu kebutuhan di atas (misal sudah pakai library chart/toast tertentu), **prioritaskan yang sudah ada di `/ui`** agar konsisten, jangan duplikasi dependency.

---

## 2. Struktur Proyek (App Router)

```
app/
  (public)/
    meja/[token]/                # entry point pelanggan setelah pelayan alokasikan meja (token_sesi)
      menu/                      # Proses 2: pemesanan menu
      pembayaran/                # Proses 3 (sisi pelanggan): submit info pesanan & metode bayar
      status/                    # tracking status pesanan (menunggu/diproses/selesai) - realtime
  (staff)/
    login/                       # login pegawai (pelayan/kasir/koki/manager) — username+password
    pelayan/
      kedatangan/                # Proses 1: terima kedatangan, pilih meja
      meja/                      # Proses 6: kelola status/bersihkan meja
      penyajian/                 # Proses 5: antar pesanan ke meja
    kasir/
      validasi/                  # Proses 3 (sisi kasir): validasi meja & pesanan, hitung tagihan
      pembayaran/[id_pesanan]/   # proses pembayaran + terbitkan nota + tampilkan QR GoPay (KK-20)
    koki/
      antrian/                   # Proses 4: daftar pesanan terurut, update status item
    manager/
      dashboard/                 # Proses 7: laporan pendapatan & operasional
      data-master/
        meja/                    # Proses 8.1: CRUD meja
        menu/                    # Proses 8.2: CRUD menu
        pegawai/                 # Proses 8.3: CRUD akun pegawai
lib/
  supabase/
    client.ts                    # Supabase client (browser)
    server.ts                    # Supabase client (server component/action, cookies-based)
  actions/                       # Server Actions per proses (lihat bagian 5)
  validations/                   # Zod schema per entitas (mirror kamus data)
  types/
    database.types.ts            # generated via `supabase gen types typescript`
middleware.ts                    # proteksi route berbasis peran (lihat bagian 4)
```

Sesuaikan penamaan folder dengan struktur yang sudah ada di `/ui` bila berbeda — struktur di atas adalah panduan mapping proses ke route, bukan struktur folder final yang wajib diikuti verbatim.

---

## 3. Skema Database (Supabase / PostgreSQL)

Buat migration SQL persis sesuai ERD dan Kamus Data (Dt-01 s.d. Dt-08). **Semua nama kolom, tipe data, dan enum harus sama persis** dengan kamus data berikut — ini adalah kontrak data, bukan saran.

```sql
-- Dt-06: Data Pegawai
create type peran_pegawai as enum ('pelayan', 'kasir', 'koki', 'manajer');

create table pegawai (
  id_pegawai    uuid primary key default gen_random_uuid(),
  nama_pegawai  text not null,
  peran         peran_pegawai not null,
  username      text not null unique,
  password      text not null, -- simpan HASH (bcrypt/argon2), jangan plaintext
  created_at    timestamptz not null default now()
);

-- Dt-01: Data Meja
create type status_meja as enum ('terisi', 'tersedia');

create table meja (
  id_meja             uuid primary key default gen_random_uuid(),
  nomor_meja          text not null unique,
  kapasitas           int not null check (kapasitas > 0),
  status_ketersediaan status_meja not null default 'tersedia',
  created_at          timestamptz not null default now()
);

-- Dt-04: Data Pelanggan
create table pelanggan (
  id_pelanggan  uuid primary key default gen_random_uuid(),
  jumlah_orang  int not null check (jumlah_orang > 0),
  created_at    timestamptz not null default now()
);

-- Dt-05: Data Menu
create type status_menu as enum ('tersedia', 'habis');

create table menu (
  id_menu              uuid primary key default gen_random_uuid(),
  nama_menu            text not null,
  harga                numeric(12,2) not null check (harga >= 0),
  kategori             text not null,
  status_ketersediaan  status_menu not null default 'tersedia',
  created_at           timestamptz not null default now()
);

-- Dt-02: Data Pesanan
create type status_pesanan as enum ('menunggu_pembayaran', 'diproses', 'selesai');

create table pesanan (
  id_pesanan        uuid primary key default gen_random_uuid(),
  tanggal           timestamptz not null default now(),
  status            status_pesanan not null default 'menunggu_pembayaran',
  id_meja           uuid not null references meja(id_meja),
  id_pelanggan      uuid not null references pelanggan(id_pelanggan),
  id_pegawai        uuid not null references pegawai(id_pegawai), -- pelayan yang menangani
  token_sesi        text not null unique,      -- token akses pelanggan (mengganti login pelanggan)
  token_expired_at  timestamptz not null,
  created_at        timestamptz not null default now()
);

-- Dt-07: Data Detail Pesanan
create type status_item_pesanan as enum ('Diproses', 'Selesai', 'Disajikan', 'Bahan_Tidak_Tersedia');

create table detail_pesanan (
  id_detail_pesanan  uuid primary key default gen_random_uuid(),
  jumlah             int not null check (jumlah > 0),
  status_item        status_item_pesanan not null default 'Diproses',
  subtotal           numeric(12,2) not null check (subtotal >= 0),
  id_pesanan         uuid not null references pesanan(id_pesanan) on delete cascade,
  id_menu            uuid not null references menu(id_menu),
  id_pegawai         uuid references pegawai(id_pegawai) -- koki yang memproses, null saat dibuat
);

-- Dt-03: Data Pembayaran
create type status_pembayaran as enum ('menunggu_konfirmasi', 'terkonfirmasi');
create type metode_pembayaran as enum ('tunai', 'qr_gopay');

create table pembayaran (
  id_pembayaran      uuid primary key default gen_random_uuid(),
  total_bayar        numeric(12,2) not null check (total_bayar >= 0),
  metode_pembayaran  metode_pembayaran not null,
  status_pembayaran  status_pembayaran not null default 'menunggu_konfirmasi',
  waktu_konfirmasi   timestamptz,
  id_pesanan         uuid not null unique references pesanan(id_pesanan),
  id_pegawai         uuid not null references pegawai(id_pegawai) -- kasir yang memproses
);
```

### Catatan implementasi skema
- Gunakan `uuid` sebagai PK (lebih aman untuk `token_sesi` berbasis URL publik dibanding sequential id).
- Tambahkan **index** pada `pesanan.id_meja`, `pesanan.status`, `detail_pesanan.id_pesanan`, `pembayaran.id_pesanan` karena kolom ini sering di-filter/join.
- **Row Level Security (RLS) wajib diaktifkan** di semua tabel. Aturan dasar:
  - `pegawai`: hanya bisa dibaca/ditulis oleh role `manajer` (Proses 8.3) atau proses login (fungsi khusus, bukan direct table access dari client).
  - `meja`, `menu`: read publik (pelanggan perlu lihat menu), write hanya `manajer` (Proses 8.1/8.2) + update `status_ketersediaan` meja oleh `pelayan` (Proses 1 & 6).
  - `pesanan`, `detail_pesanan`: read/write terbatas berdasarkan `token_sesi` yang valid (pelanggan) atau role pegawai terkait (pelayan/kasir/koki).
  - `pembayaran`: write hanya oleh `kasir`, read oleh `kasir` dan `manajer`.
- Implementasikan RLS via Supabase Postgres policies memakai `auth.jwt()` custom claims (lihat bagian 4) atau via Postgres function yang memvalidasi `token_sesi` untuk akses pelanggan.

---

## 4. Strategi Autentikasi & Otorisasi

Sistem punya **dua mekanisme akses berbeda** — jangan disatukan:

### a. Pegawai (pelayan, kasir, koki, manajer) — KK terkait: hak akses per peran
- Login dengan **username + password** (bukan email) terhadap tabel `pegawai`.
- Gunakan **Supabase Auth dengan custom sign-in flow**: buat Postgres Function/Edge Function yang memverifikasi username+password (bandingkan hash), lalu mint session via Supabase Auth admin API atau simpan session sendiri di cookie httpOnly berisi `id_pegawai` + `peran` (signed JWT).
- `middleware.ts` mengecek cookie/session di setiap request ke `/pelayan/*`, `/kasir/*`, `/koki/*`, `/manager/*` dan redirect ke `/login` jika tidak valid, atau ke halaman 403 jika `peran` tidak sesuai dengan segment route.

### b. Pelanggan — via `token_sesi` (Dt-02), tanpa akun/login
- Saat pelayan mengalokasikan meja (Proses 1.3/1.4), sistem generate `token_sesi` (mis. `crypto.randomUUID()`) dan `token_expired_at` (mis. `now() + 3 jam`), disimpan di kolom `pesanan.token_sesi`.
- Pelanggan diarahkan (misalnya via QR code di meja atau link dari pelayan) ke `/meja/[token]`.
- Setiap request pelanggan **memvalidasi token terhadap `token_expired_at`** sebelum mengizinkan akses ke menu/pemesanan/status. Token kedaluwarsa → tampilkan pesan "Sesi berakhir, silakan hubungi pelayan".
- **Jangan gunakan Supabase Auth untuk pelanggan** — ini murni token-based session sesuai kamus data, sesuai rancangan awal (tidak ada tabel akun pelanggan dengan password).

---

## 5. Mapping Proses Bisnis → Implementasi

Implementasikan sebagai **Server Actions** (bukan API routes REST kecuali dibutuhkan untuk realtime webhook), satu action per langkah proses agar mudah ditelusuri ke DFD Level 1.

### Proses 1 — Pengelolaan Kedatangan Pelanggan dan Pemilihan Meja (`/pelayan/kedatangan`)
- `actions/pelayan/terimaKedatangan.ts` → input jumlah_orang → insert ke `pelanggan`
- `actions/pelayan/cekMejaTersedia.ts` → query `meja where status_ketersediaan = 'tersedia' and kapasitas >= jumlah_orang`
- `actions/pelayan/alokasikanMeja.ts` → update `meja.status_ketersediaan = 'terisi'`, insert `pesanan` (generate `token_sesi`, `token_expired_at`, `id_pegawai` = pelayan yang login)
- Output: URL/QR untuk pelanggan (`/meja/[token_sesi]`)

### Proses 2 — Pemesanan Menu Pelanggan (`/meja/[token]/menu`)
- `actions/pelanggan/getMenu.ts` → query `menu where status_ketersediaan = 'tersedia'`
- `actions/pelanggan/submitPesanan.ts` → validasi token & belum expired → insert banyak baris `detail_pesanan` (subtotal = harga × jumlah) sekaligus, terhubung ke `pesanan` yang sudah ada (dari Proses 1)

### Proses 3 — Pembayaran Pesanan Pelanggan
- Sisi pelanggan (`/meja/[token]/pembayaran`): `actions/pelanggan/infoTagihan.ts` → hitung total dari `detail_pesanan`
- Sisi kasir (`/kasir/validasi`, `/kasir/pembayaran/[id_pesanan]`):
  - `actions/kasir/validasiPesanan.ts` → cek `pesanan` & `detail_pesanan` sesuai nomor meja
  - `actions/kasir/prosesPembayaran.ts` → insert `pembayaran` (`status_pembayaran = 'terkonfirmasi'` bila tunai langsung, atau `'menunggu_konfirmasi'` untuk QR GoPay sampai dikonfirmasi manual — sesuai KK-20), update `pesanan.status = 'diproses'`
  - Tampilkan komponen `<QRCode value={...} />` dari `qrcode.react` bila `metode_pembayaran = 'qr_gopay'`

### Proses 4 — Pembuatan Pesanan Pelanggan (`/koki/antrian`)
- `actions/koki/getAntrian.ts` → query `detail_pesanan` join `pesanan where pesanan.status = 'diproses'`, urutkan by `pesanan.tanggal`
- `actions/koki/updateStatusItem.ts` → update `detail_pesanan.status_item` (`Diproses` → `Selesai` atau `Bahan_Tidak_Tersedia`), set `id_pegawai` = koki yang login
- Jika `Bahan_Tidak_Tersedia` → trigger notifikasi realtime ke kasir (lihat bagian 6)

### Proses 5 — Penyajian Pesanan Pelanggan (`/pelayan/penyajian`)
- `actions/pelayan/getPesananSiapDisajikan.ts` → `detail_pesanan.status_item = 'Selesai'`
- `actions/pelayan/tandaiDisajikan.ts` → update `status_item = 'Disajikan'`; jika semua item pada satu `id_pesanan` sudah `Disajikan` → update `pesanan.status = 'selesai'`

### Proses 6 — Pengelolaan Penggunaan Meja (`/pelayan/meja`)
- `actions/pelayan/bersihkanMeja.ts` → update `meja.status_ketersediaan = 'tersedia'` (hanya untuk meja dari `pesanan` berstatus `'selesai'`)

### Proses 7 — Pembuatan Laporan Pendapatan & Operasional (`/manager/dashboard`)
- `actions/manager/laporanPendapatan.ts` → aggregate `pembayaran` (filter periode tanggal, `status_pembayaran = 'terkonfirmasi'`) → total pendapatan, jumlah transaksi
- `actions/manager/laporanOperasional.ts` → aggregate `meja` (tingkat okupansi), `pesanan` per status
- Render dengan `recharts` (bar/line chart pendapatan harian, pie chart okupansi meja)

### Proses 8 — Pengelolaan Data Master (`/manager/data-master/*`)
- `actions/manager/meja/{create,update,delete}.ts`
- `actions/manager/menu/{create,update,delete}.ts`
- `actions/manager/pegawai/{create,update,delete}.ts` (password di-hash sebelum insert/update, gunakan `bcryptjs`)
- Gunakan `zod` schema per entitas untuk validasi sebelum insert (lihat bagian 3 untuk constraint yang harus divalidasi juga di client, misal `kapasitas > 0`, `harga >= 0`)

---

## 6. Kebutuhan Realtime (Supabase Realtime)

Beberapa data **wajib realtime** agar sesuai kamus data ("status penggunaannya secara real-time" — Dt-01) dan alur DFD (notifikasi antar peran):

| Data | Subscriber | Trigger |
|---|---|---|
| `meja.status_ketersediaan` | Halaman `/pelayan/kedatangan` | Update dari Proses 1 & 6 |
| `pesanan.status` | Halaman pelanggan `/meja/[token]/status` | Update dari Proses 3, 4, 5 |
| `detail_pesanan.status_item` | Halaman `/koki/antrian`, `/pelayan/penyajian` | Update lintas peran |
| Notifikasi `Bahan_Tidak_Tersedia` | Halaman `/kasir/validasi` | Insert/update dari koki |

Implementasi: subscribe via `supabase.channel(...).on('postgres_changes', ...)` di client component, jangan poll manual dengan `setInterval`.

---

## 7. Non-Fungsional (dari Dokumen Analisis Kebutuhan)

- **Perangkat lunak**: aplikasi web responsif (mendukung tablet untuk pelayan/kasir/koki, dan mobile browser untuk pelanggan yang scan QR di meja).
- **Perangkat keras**: pastikan UI ringan untuk perangkat kasir + printer nota (halaman nota harus punya versi print-friendly / `@media print` CSS, atau tombol "Cetak Nota" yang memicu `window.print()`).
- **Pelatihan pengguna**: UI untuk pegawai (pelayan/kasir/koki/manager) harus self-explanatory dengan label Bahasa Indonesia yang jelas (bukan istilah teknis), sesuai catatan bahwa stakeholder belum terbiasa sistem digital.
- **Pelanggan tidak butuh pelatihan**: alur pemesanan mandiri harus intuitif tanpa instruksi tambahan (self-service).

---

## 8. Checklist Verifikasi Sebelum Selesai

Gunakan checklist ini untuk memverifikasi implementasi terhadap KK-01 s.d. KK-23 (cocokkan tiap KK ke fitur yang sudah dibangun):

- [ ] Setiap tabel di Supabase punya kolom **persis sama** dengan Kamus Data (nama, tipe, enum)
- [ ] RLS aktif di semua tabel, sudah diuji dengan role berbeda (pelayan tidak bisa akses `/manager/data-master`, dst.)
- [ ] `token_sesi` pelanggan expired sesuai `token_expired_at`, dan halaman pelanggan menangani kasus token invalid/expired dengan graceful error
- [ ] Semua 8 proses bisnis (Proses 1–8) punya server action yang bisa ditelusuri balik ke tabel spesifikasi proses di dokumen
- [ ] Realtime bekerja untuk 4 data pada tabel di bagian 6 (uji dengan 2 browser/role berbeda secara bersamaan)
- [ ] Password pegawai di-hash (tidak pernah plaintext di database maupun log)
- [ ] Semua halaman mengikuti desain `/ui` — tidak ada halaman yang didesain ulang tanpa alasan teknis kuat
- [ ] Laporan pendapatan & operasional (Proses 7) bisa difilter periode tanggal dan menampilkan chart yang benar
- [ ] QR pembayaran GoPay (KK-20) tampil di perangkat kasir saat metode `qr_gopay` dipilih

---

## 9. Yang TIDAK Boleh Ditambahkan

Untuk menjaga konsistensi dengan dokumen requirement yang sudah disetujui:
- Jangan tambahkan tabel/entitas baru di luar 7 tabel pada ERD (Meja, Pelanggan, Pesanan, Detail_Pesanan, Menu, Pegawai, Pembayaran).
- Jangan buat sistem akun/login untuk pelanggan — pelanggan **hanya** menggunakan `token_sesi`.
- Jangan tambahkan role baru di luar `pelayan`, `kasir`, `koki`, `manajer`.
- Jangan ubah alur proses (urutan status `pesanan`/`detail_pesanan`) di luar yang didefinisikan pada DFD Level 1.
