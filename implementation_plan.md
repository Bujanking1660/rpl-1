# Implementation Plan — Subsequent Customer Orders, Paid-Only Kitchen Queue, Seed DML & Warm Authentic UI/UX

This update addresses subsequent customer ordering flow, Koki kitchen queue payment constraints, removal of the Dessert category from seed DML, and a comprehensive human-centric UI/UX polish.

## User Review Required

> [!IMPORTANT]
> **Key Technical Updates:**
> 1. **Subsequent Orders (Pesan Lagi)**: When a customer places additional orders from their table session (`submitPesananPelangganAction`), `pesanan.status` will be updated back to `'menunggu_pembayaran'`. This immediately highlights the table in Kasir for payment approval.
> 2. **Kitchen Queue Payment Restriction**: `getAntrianKokiAction` will strictly filter items where `pesanan.status === 'diproses'`. Items from new or additional customer orders will **only appear in Koki after Kasir confirms payment**.
> 3. **DML Seed Script**: `supabase/seed.sql` will be updated to include only `Makanan` and `Minuman` categories (removing `Dessert`), and a direct DML cleaning query will be provided for existing databases.
> 4. **UI/UX Polish**: Refactor UI elements across Staff (Koki, Kasir, Pelayan, Manager) and Public Customer pages to eliminate robotic "AI-generated" phrasing/styling. Apply warm culinary color schemes, natural Indonesian restaurant terminology, and polished layout hierarchy.

---

## Proposed Changes

### Database Seed & DML

#### [MODIFY] [seed.sql](file:///c:/rpl/rpl-1/supabase/seed.sql)
- Ensure all seed menu items strictly belong to `'Makanan'` or `'Minuman'`.
- Provide DML SQL migration query to normalize existing database tables.

---

### Backend Logic & Order Lifecycle

#### [MODIFY] [pelanggan.ts](file:///c:/rpl/rpl-1/lib/actions/pelanggan.ts)
- Update `submitPesananPelangganAction`: Set `pesanan.status = 'menunggu_pembayaran'` whenever new items are added, so Kasir receives immediate notification of the pending bill for table.

#### [MODIFY] [koki.ts](file:///c:/rpl/rpl-1/lib/actions/koki.ts)
- Update `getAntrianKokiAction`: Ensure items are fetched only when `pesanan.status = 'diproses'` and `status_item = 'Diproses'`, ensuring Koki only cooks paid orders.

---

### UI/UX Refactoring (Authentic & Professional)

#### [MODIFY] [koki/page.tsx](file:///c:/rpl/rpl-1/app/(staff)/koki/page.tsx)
- Refactor Koki Kitchen Display System (KDS):
  - Clean card headers per table with order timestamps.
  - Prominent, natural button label: `"Tandai Selesai Dimasak"`.
  - Remove robotic AI text and awkward badges.

#### [MODIFY] [kasir/page.tsx](file:///c:/rpl/rpl-1/app/(staff)/kasir/page.tsx)
- Refactor POS Cashier Interface:
  - Table grid with clear status badges: `"Menunggu Bayar"`, `"Terisi / Diproses"`, `"Kosong"`.
  - Seamless handling of additional customer orders per table.

#### [MODIFY] [pelayan/page.tsx](file:///c:/rpl/rpl-1/app/(staff)/pelayan/page.tsx)
- Refactor Floor Management View:
  - Warm, intuitive table allocation step-by-step wizard and QR generator.

#### [MODIFY] [menu/page.tsx](file:///c:/rpl/rpl-1/app/(public)/meja/[token]/menu/page.tsx), [pembayaran/page.tsx](file:///c:/rpl/rpl-1/app/(public)/meja/[token]/pembayaran/page.tsx) & [status/page.tsx](file:///c:/rpl/rpl-1/app/(public)/meja/[token]/status/page.tsx)
- Refactor Customer Ordering Web App:
  - Filter categories: `Semua`, `Makanan`, `Minuman`.
  - Clear customer guidance when adding items: "Pesanan baru ditambahkan — Harap bayar di Kasir".

---

## Verification Plan

### Automated Tests
- Run `cmd /c "npm run build"` to verify TypeScript types, route guards, and static page rendering.

### Manual Verification
1. **Pesan Lagi (Subsequent Orders)**:
   - Place 1st order on customer menu -> verify status is `Menunggu Pembayaran`.
   - Kasir confirms 1st payment -> Koki gets items.
   - Customer adds 2nd order (Pesan Lagi) -> verify Kasir gets Meja #XX highlighted again as `Menunggu Bayar`.
   - Kasir confirms 2nd payment -> Koki gets the 2nd order items.
2. **Paid-Only Koki Queue**:
   - Verify items DO NOT appear in Koki before Kasir confirms payment.
3. **Seed DML**:
   - Verify category filters show only `Semua`, `Makanan`, and `Minuman`.
