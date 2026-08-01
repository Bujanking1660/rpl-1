# Implementation Plan — UI Design System Alignment & Subsequent Customer Order Flow

This plan establishes full visual alignment with the design mockups in `/ui`, utilizing public static assets (`bg.png`, `logo.png`, profile images), alongside the complete backend implementation of customer re-ordering, paid-only kitchen queue, and seed DML normalization.

## User Review Required

> [!IMPORTANT]
> **Key Updates & Visual Design Integration:**
> 1. **Visual Design Alignment (`/ui`)**:
>    - **Login (`/login`)**: Curved split layout with navy coffee bean background (`/bg.png`), rounded input fields, and coral submit button (`#FA6338`).
>    - **Pelanggan (`/meja/[token]`)**: Header with `/bg.png`, search bar, category pills (`Makanan`, `Minuman`), cart drawer, checkout modal ("MEJA XX Harap Konfirmasi Ke Kasir!"), and order confirmation.
>    - **Kasir (`/(staff)/kasir`)**: Step-by-step POS flow (Step 1: Table status grid, Step 2: Order item detail & category filter, Step 3: Cash/QRIS payment summary & print receipt).
>    - **Koki (`/(staff)/koki`)**: Sidebar navigation (`DASHBOARD`, `PESANAN`, `RIWAYAT`, `PROFILE`), dashboard stat cards, kitchen queue filters, order completion action, and profile view (using public image).
>    - **Pelayan (`/(staff)/pelayan`)**: Step-by-step table wizard (Customer count -> Table selection -> Table QR Code generation -> Activation confirmation).
>    - **Manager (`/(staff)/manager`)**: Sidebar navigation (`DASHBOARD`, `KELOLA USER`, `KELOLA MENU`, `KELOLA MEJA`, `LAPORAN`), analytics charts, and CRUD management tables.
> 2. **Subsequent Orders Flow ("Pesan Lagi")**:
>    - When a customer submits additional items from their active table session, `pesanan.status` is set to `'menunggu_pembayaran'`.
>    - Kasir immediately receives a notification/highlight on that table for payment.
> 3. **Paid-Only Kitchen Queue**:
>    - `getAntrianKokiAction` strictly filters for `pesanan.status === 'diproses'`, ensuring Koki only receives orders after Kasir confirms payment.
> 4. **Database & Menu Categories**:
>    - Clean DML and seed script to restrict menu categories to `'Makanan'` and `'Minuman'` (removing `'Dessert'`).

---

## Proposed Changes

### Database Seed & DML

#### [MODIFY] [seed.sql](file:///c:/Kuliah/Semester%204/Rekayasa%20Perangkat%20Lunak%20I/Pak%20Resto/rpl-1/supabase/seed.sql)
- Ensure all menu items are assigned exclusively to `'Makanan'` or `'Minuman'`.
- Clean up any legacy `'Dessert'` categories in existing schema data.

---

### Backend Logic & Action Handlers

#### [MODIFY] [pelanggan.ts](file:///c:/Kuliah/Semester%204/Rekayasa%20Perangkat%20Lunak%20I/Pak%20Resto/rpl-1/lib/actions/pelanggan.ts)
- Update `submitPesananPelangganAction`: Set `pesanan.status = 'menunggu_pembayaran'` on creation or subsequent item additions.

#### [MODIFY] [koki.ts](file:///c:/Kuliah/Semester%204/Rekayasa%20Perangkat%20Lunak%20I/Pak%20Resto/rpl-1/lib/actions/koki.ts)
- Update `getAntrianKokiAction`: Ensure items are fetched only when `pesanan.status = 'diproses'`.

---

### Global Styling & Layout System

#### [MODIFY] [globals.css](file:///c:/Kuliah/Semester%204/Rekayasa%20Perangkat%20Lunak%20I/Pak%20Resto/rpl-1/app/globals.css)
- Define design tokens matching `/ui` mockups:
  - Header & Card Background: `#1F2937`, `#2B4263`, `#355070`
  - Accent Color: `#FA6338` (Primary Coral / Orange)
  - Card & Table Backgrounds: `#F4F6F9`, `#FFFFFF`, `#262626`
  - Font: Modern Sans-Serif font hierarchy

---

### Staff & Public Interfaces

#### [MODIFY] [app/login/page.tsx](file:///c:/Kuliah/Semester%204/Rekayasa%20Perangkat%20Lunak%20I/Pak%20Resto/rpl-1/app/login/page.tsx)
- Reframe layout into split hero + form box:
  - Left hero section using `/bg.png` pattern and shopping basket motif.
  - Right form section with "LOGIN" header, rounded input fields, and coral submit button.

#### [MODIFY] [app/(public)/meja/[token]/menu/page.tsx](file:///c:/Kuliah/Semester%204/Rekayasa%20Perangkat%20Lunak%20I/Pak%20Resto/rpl-1/app/(public)/meja/[token]/menu/page.tsx)
- Implement `/ui/Pelanggan.png` design:
  - Curved header with `/bg.png` background, "Resto Pak Resto" logo/header, search bar with orange button.
  - Category filter pills (`Makanan`, `Minuman`).
  - Menu cards with product images, pricing, and orange `+` add button.
  - Bottom navigation bar & floating cart summary.

#### [MODIFY] [app/(public)/meja/[token]/pembayaran/page.tsx](file:///c:/Kuliah/Semester%204/Rekayasa%20Perangkat%20Lunak%20I/Pak%20Resto/rpl-1/app/(public)/meja/[token]/pembayaran/page.tsx) & [status/page.tsx](file:///c:/Kuliah/Semester%204/Rekayasa%20Perangkat%20Lunak%20I/Pak%20Resto/rpl-1/app/(public)/meja/[token]/status/page.tsx)
- Customer checkout flow:
  - Payment screen displaying table number and "Harap Konfirmasi Ke Kasir!" instructions.
  - Order confirmation screen with dark navy background, large checkmark icon, and tracking link.

#### [MODIFY] [app/(staff)/kasir/page.tsx](file:///c:/Kuliah/Semester%204/Rekayasa%20Perangkat%20Lunak%20I/Pak%20Resto/rpl-1/app/(staff)/kasir/page.tsx)
- Implement `/ui/Kasir.png` POS wizard layout:
  - Step 1 (Pilihan Meja Pelanggan): Grid of tables with status indicators (`Kosong`, `Terisi`, `Reserved`/Menunggu Bayar) + Take Away toggle.
  - Step 2 (Pesanan Meja XX): Category filters, item selection, bill summary, and "LANJUT BAYAR ->" button.
  - Step 3 (Pembayaran Meja XX): Item summary breakdown, payment mode toggle (`Tunai` / `QRIS`), nominal calculation, and "Bayar & cetak struk" action.

#### [MODIFY] [app/(staff)/koki/page.tsx](file:///c:/Kuliah/Semester%204/Rekayasa%20Perangkat%20Lunak%20I/Pak%20Resto/rpl-1/app/(staff)/koki/page.tsx)
- Implement `/ui/koki.png` layout:
  - Left navigation sidebar (`PAK RESTO.`, `DASHBOARD`, `PESANAN`, `RIWAYAT`, `PROFILE`).
  - Dashboard overview with welcome banner, metrics ("Pesanan Baru", "Sedang Dimasak", "Selesai Hari Ini"), and category tabs ("Semua", "Baru", "Sedang Dimasak", "Siap Di Antar").
  - Pesanan & Riwayat tables.
  - Profile section featuring staff details and avatar image from `/public`.

#### [MODIFY] [app/(staff)/pelayan/page.tsx](file:///c:/Kuliah/Semester%204/Rekayasa%20Perangkat%20Lunak%20I/Pak%20Resto/rpl-1/app/(staff)/pelayan/page.tsx)
- Implement `/ui/Pelayan.png` floor management wizard:
  - Step 1: Customer counter modal (`JUMLAH PELANGGAN`) with `-` / `+` buttons.
  - Step 2: Table grid selector.
  - Step 3: Interactive QR code display for customer table access.
  - Step 4: Table activation modal confirmation.

#### [MODIFY] [app/(staff)/manager/page.tsx](file:///c:/Kuliah/Semester%204/Rekayasa%20Perangkat%20Lunak%20I/Pak%20Resto/rpl-1/app/(staff)/manager/page.tsx)
- Implement `/ui/Manager.png` layout:
  - Left navigation sidebar (`DASHBOARD`, `KELOLA USER`, `KELOLA MENU`, `KELOLA MEJA`, `LAPORAN`).
  - Dashboard analytics cards and spending breakdown charts.
  - Management tables with search/filter, table pagination, and action buttons (`+ Tambah User`, `+ Tambah Menu`, `+ Tambah Meja`, `Eksport Laporan`).

---

## Verification Plan

### Automated Tests
- Run `npm run build` inside `rpl-1` to verify all TypeScript types, Next.js routes, dynamic parameters, and layout components compile without error.

### Manual Verification
1. **Visual Alignment**: Verify each page visually against `/ui/*.png` mockups, ensuring color scheme (`#FA6338`, navy headers), asset usage (`/bg.png`, `/logo.png`), typography, and layout structure match.
2. **Subsequent Orders & Payment**:
   - Order from customer menu -> Kasir sees table as `Menunggu Pembayaran`.
   - Kasir approves payment -> status changes to `diproses`, order enters Koki queue.
   - Customer adds items ("Pesan Lagi") -> status reverts to `menunggu_pembayaran` for Kasir approval; Koki receives new items ONLY after payment.
3. **Menu Filter Consistency**: Verify only `Makanan` and `Minuman` appear as options across Public, Kasir, and Manager menu settings.
