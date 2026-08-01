# 📋 CONTEXT BACKUP — Pak Resto UNIKOM (RPL-1)

> **Tujuan file ini:** Lampirkan ke percakapan baru saat ganti model/akun agar AI langsung paham konteks proyek tanpa harus dari awal.
> **Cara pakai:** Buka file ini, lalu ketik di chat: `@CONTEXT_BACKUP.md lanjutkan pekerjaan dari sini`

---

## 🏗️ Tentang Proyek

**Nama:** Sistem Informasi Manajemen Operasional Restoran — *Pak Resto UNIKOM*
**Framework:** Next.js (versi terbaru, ada breaking changes — baca `node_modules/next/dist/docs/`)
**Database:** Supabase (PostgreSQL + Realtime)
**Lokasi workspace:** `c:\rpl\rpl-1\`
**Dev server:** `npm run dev` (jalankan di folder proyek)

---

## 🔑 Environment & Credentials

```env
NEXT_PUBLIC_SUPABASE_URL=https://mtouuauegqntylltzchj.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_ZM038mfKYmh0dJvprbYebw_8FMv6JSb
```

**Akun Staff (plain-text password — TIDAK di-hash/bcrypt):**
| Username  | Password    | Role    |
|-----------|-------------|---------|
| pelayan   | pelayan123  | pelayan |
| kasir     | kasir123    | kasir   |
| koki      | koki123     | koki    |
| manajer   | manajer123  | manajer |

---

## 🗂️ Struktur File Proyek

```
c:\rpl\rpl-1\
├── app/
│   ├── (public)/
│   │   └── meja/[token]/
│   │       ├── layout.tsx          ← Layout pelanggan (per token meja)
│   │       ├── menu/page.tsx       ← Halaman menu pelanggan (pilih makanan)
│   │       ├── status/page.tsx     ← Status pesanan pelanggan
│   │       └── pembayaran/page.tsx ← Info tagihan pelanggan (INFORMASI SAJA, tidak bisa bayar sendiri)
│   ├── (staff)/
│   │   ├── pelayan/page.tsx        ← Alokasi meja + QR generator + sajian siap
│   │   ├── kasir/page.tsx          ← Pembayaran 3-step (meja → detail → bayar)
│   │   ├── koki/page.tsx           ← Antrian dapur (PERLU REFACTOR: card per meja)
│   │   └── manager/page.tsx        ← Dashboard manajer (CRUD user/menu/meja)
│   ├── login/page.tsx              ← Login staff
│   ├── layout.tsx
│   ├── globals.css
│   └── page.tsx                    ← Landing page
├── lib/
│   ├── actions/
│   │   ├── auth.ts                 ← loginStaffAction, logoutStaffAction, getStaffSessionAction
│   │   ├── pelayan.ts              ← getMejaList, alokasikanMeja, bersihkanMeja, tandaiDisajikan
│   │   ├── kasir.ts                ← getPesananPendingKasir, prosesPembayaran
│   │   ├── koki.ts                 ← getAntrianKoki, updateStatusItemKoki
│   │   ├── manager.ts              ← CRUD pegawai/menu/meja, getDashboardStats
│   │   └── pelanggan.ts            ← getMenuPelanggan, buatPesanan, getPesananByToken
│   ├── auth/session.ts             ← getStaffSession (baca cookie, plain-text compare)
│   ├── supabase/
│   │   ├── client.ts               ← createClient() untuk 'use client'
│   │   └── server.ts               ← createClient() untuk 'use server'
│   └── types/database.ts           ← TypeScript types: Meja, Menu, Pesanan, dll.
├── middleware.ts                    ← Route guard staff (pelayan/kasir/koki/manager)
├── supabase/
│   ├── schema.sql                  ← DDL lengkap (enum, table, RLS, realtime)
│   └── seed.sql                    ← Seed data: pegawai, meja (01-10), menu (Makanan+Minuman)
├── public/
│   └── gopay.png                   ← QR Code GoPay statis untuk kasir (user simpan manual)
└── CONTEXT_BACKUP.md               ← FILE INI
```

---

## 🗃️ Database Schema (Ringkasan)

```sql
-- Enums penting
peran_pegawai: 'pelayan' | 'kasir' | 'koki' | 'manajer'
status_meja: 'terisi' | 'tersedia'
status_pesanan: 'menunggu_pembayaran' | 'diproses' | 'selesai'
status_item_pesanan: 'Diproses' | 'Selesai' | 'Disajikan' | 'Bahan_Tidak_Tersedia' (revisi gak ada bahan tidak tersedia)
status_pembayaran: 'menunggu_konfirmasi' | 'terkonfirmasi'
metode_pembayaran: 'tunai' | 'qr_gopay'

-- Tabel utama
pegawai (id_pegawai, nama_pegawai, peran, username, password)
meja (id_meja, nomor_meja TEXT "01"-"10", kapasitas INT, status_ketersediaan)
pelanggan (id_pelanggan, jumlah_orang)
menu (id_menu, nama_menu, harga NUMERIC, kategori TEXT "Makanan"/"Minuman", status_ketersediaan)
pesanan (id_pesanan, tanggal, status, id_meja, id_pelanggan, id_pegawai, token_sesi TEXT UNIQUE, token_expired_at)
detail_pesanan (id_detail_pesanan, jumlah, status_item, subtotal, id_pesanan, id_menu, id_pegawai)
pembayaran (id_pembayaran, total_bayar, metode_pembayaran, status_pembayaran, waktu_konfirmasi, id_pesanan, id_pegawai)
```

---

## 🔐 Authentication Logic

- **Session cookie:** `pakresto_staff_session` (JSON: `{id_pegawai, peran, username, nama_pegawai}`)
- **Password:** **PLAIN TEXT** — tidak ada bcrypt/hash. Cukup `storedPassword === inputPassword`
- **Middleware** (`middleware.ts`): guard route `/pelayan`, `/kasir`, `/koki`, `/manager`
- **Manajer redirect:** login → `/manager` (bukan `/manajer`)
- **Multi-role access:** manajer bisa akses semua route staff

---

## 🧭 Alur Sistem Per Role

### Pelayan
1. Input jumlah tamu
2. Grid meja → hanya tampil meja dengan `kapasitas >= jumlahTamu` dan `status = tersedia`
3. Meja kapasitas kurang → grayed out (`opacity-40 grayscale`), tidak bisa diklik
4. Setelah pilih meja → generate QR code (pakai `<QRCodeSVG>` dari `qrcode.react`)
5. QR link customer: `http://<host>/meja/<token>/menu`
6. Tab "Penyajian": tandai item makanan siap disajikan ke meja

### Kasir
1. **Step 1:** Grid 10 meja → meja dengan `status = menunggu_pembayaran` tampil orange/aktif
2. **Step 2:** Lihat detail item pesanan meja yang dipilih
3. **Step 3:** Pilih metode bayar:
   - **Tunai:** input nominal → hitung kembalian otomatis
   - **QRIS GoPay:** tampil `<img src="/gopay.png">` (static file di `/public`)
4. Dua tombol konfirmasi:
   - "Bayar & Cetak Struk" → konfirmasi DB + trigger `window.print()`
   - "Konfirmasi Bayar (Tanpa Struk)" → konfirmasi DB saja
5. Setelah konfirmasi: `pesanan.status` → `'diproses'`, `pembayaran.status_pembayaran` → `'terkonfirmasi'`

### Koki — BELUM SELESAI
- Tab PESANAN: **Harus** tampil sebagai Card Per Meja (bukan tabel)
- Setiap card meja: daftar item + tombol per item: `Mulai Masak`, `Selesai`, `Bahan Habis`
- Tab RIWAYAT: item dengan `status_item IN ('Selesai','Disajikan')` hari ini
- Hapus tab PROFILE dari sidebar

### Manajer
- Dashboard stats + chart
- CRUD Pegawai, Menu, Meja
- Route: `/manager` (bukan `/manajer`)

### Pelanggan
- Akses via QR → `/meja/[token]/menu`
- Filter menu: Semua / Makanan / Minuman
- `/meja/[token]/pembayaran` → **INFORMASI SAJA** (total tagihan + instruksi ke kasir)
  - Pelanggan TIDAK bisa konfirmasi bayar sendiri
  - Hanya tampil: "Sebutkan nomor meja #XX ke kasir untuk pembayaran"

---

## 📦 Packages Penting Terinstall

```json
{
  "qrcode.react": "^4.x",   // QR Code di pelayan: <QRCodeSVG>
  "recharts": "^2.x",       // Chart di manager dashboard
  "sonner": "^1.x",         // Toast notifications
  "lucide-react": "^0.x"    // Icons
}
```

---

## ✅ Fitur Yang Sudah Selesai

| Fitur | File |
|-------|------|
| Seed: pegawai plain-text pw, meja, menu (Makanan+Minuman) | `supabase/seed.sql` |
| Auth plain-text (no bcrypt) | `lib/auth/session.ts` |
| Middleware route guard + manajer → /manager | `middleware.ts`, `app/login/page.tsx` |
| Pelayan: filter meja kapasitas, grayed out | `app/(staff)/pelayan/page.tsx` |
| Pelayan: QR code scannable mobile | `app/(staff)/pelayan/page.tsx` |
| Kasir: 3-step workflow | `app/(staff)/kasir/page.tsx` |
| Kasir: GoPay QR statis + tunai + kembalian | `app/(staff)/kasir/page.tsx` |
| Kasir: 2 tombol (cetak/tanpa cetak), update DB | `app/(staff)/kasir/page.tsx` |
| Customer: pembayaran informasi saja | `app/(public)/meja/[token]/pembayaran/page.tsx` |
| Customer: Kategori menu ('Semua', 'Makanan', 'Minuman') | `app/(public)/meja/[token]/menu/page.tsx` |
| Koki: Card Per Meja, Riwayat Hari Ini, Hapus tab Profile | `app/(staff)/koki/page.tsx`, `lib/actions/koki.ts` |
| Manager: CRUD lengkap | `app/(staff)/manager/page.tsx` |

---

## ❌ Yang Masih Perlu Diselesaikan

*(Semua item tugas prioritas saat ini telah selesai diselesaikan. Lakukan pengujian end-to-end / staging bila diperlukan).*


---

## 🔧 Pola Kode

### Server Actions
```typescript
'use server';
// lib/actions/*.ts
// Gunakan createClient() dari '../supabase/server'
```

### Client Components
```typescript
'use client';
// app/**/*.tsx (semua page)
// Gunakan createClient() dari '@/lib/supabase/client' untuk realtime
// Gunakan useParams() dari 'next/navigation' untuk dynamic routes
```

### Supabase Realtime Pattern
```typescript
const supabase = createClient();
const channel = supabase
  .channel('nama-channel')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'nama_tabel' }, callback)
  .subscribe();
// Cleanup di useEffect return: supabase.removeChannel(channel)
```

---

## ⚠️ Gotchas Penting

1. **Next.js Breaking Changes:** Baca `node_modules/next/dist/docs/` sebelum nulis kode Next.js baru
2. **useParams()** — selalu pakai di `'use client'` untuk dynamic routes
3. **Password PLAIN TEXT** — JANGAN tambah bcrypt, sengaja plain text
4. **nomor_meja** format string 2 digit: `'01'`, `'02'`, dst.
5. **gopay.png** harus manual disimpan user ke `c:\rpl\rpl-1\public\`
6. **koki.ts getAntrianKoki:** filter `pesanan.status = 'diproses'` untuk antrian aktif
7. **manajer → /manager** untuk routing (bukan /manajer)
8. **Supabase realtime** aktif untuk: meja, pesanan, detail_pesanan, pembayaran

---

*Last updated: 2026-08-01 | Context dari percakapan aktif*
