-- SQL Migration Schema untuk Sistem Informasi Manajemen Operasional Restoran (Pak Resto UNIKOM)

-- 1. Enums
create type peran_pegawai as enum ('pelayan', 'kasir', 'koki', 'manajer');
create type status_meja as enum ('terisi', 'tersedia');
create type status_menu as enum ('tersedia', 'habis');
create type status_pesanan as enum ('menunggu_pembayaran', 'diproses', 'selesai');
create type status_item_pesanan as enum ('Diproses', 'Selesai', 'Disajikan', 'Bahan_Tidak_Tersedia');
create type status_pembayaran as enum ('menunggu_konfirmasi', 'terkonfirmasi');
create type metode_pembayaran as enum ('tunai', 'qr_gopay');

-- 2. Dt-06: Data Pegawai
create table pegawai (
  id_pegawai    uuid primary key default gen_random_uuid(),
  nama_pegawai  text not null,
  peran         peran_pegawai not null,
  username      text not null unique,
  password      text not null, -- Hashed password (bcrypt)
  created_at    timestamptz not null default now()
);

-- 3. Dt-01: Data Meja
create table meja (
  id_meja             uuid primary key default gen_random_uuid(),
  nomor_meja          text not null unique,
  kapasitas           int not null check (kapasitas > 0),
  status_ketersediaan status_meja not null default 'tersedia',
  created_at          timestamptz not null default now()
);

-- 4. Dt-04: Data Pelanggan
create table pelanggan (
  id_pelanggan  uuid primary key default gen_random_uuid(),
  jumlah_orang  int not null check (jumlah_orang > 0),
  created_at    timestamptz not null default now()
);

-- 5. Dt-05: Data Menu
create table menu (
  id_menu              uuid primary key default gen_random_uuid(),
  nama_menu            text not null,
  harga                numeric(12,2) not null check (harga >= 0),
  kategori             text not null,
  status_ketersediaan  status_menu not null default 'tersedia',
  created_at           timestamptz not null default now()
);

-- 6. Dt-02: Data Pesanan
create table pesanan (
  id_pesanan        uuid primary key default gen_random_uuid(),
  tanggal           timestamptz not null default now(),
  status            status_pesanan not null default 'menunggu_pembayaran',
  id_meja           uuid not null references meja(id_meja),
  id_pelanggan      uuid not null references pelanggan(id_pelanggan),
  id_pegawai        uuid not null references pegawai(id_pegawai),
  token_sesi        text not null,
  token_expired_at  timestamptz not null,
  created_at        timestamptz not null default now()
);

-- 7. Dt-07: Data Detail Pesanan
create table detail_pesanan (
  id_detail_pesanan  uuid primary key default gen_random_uuid(),
  jumlah             int not null check (jumlah > 0),
  status_item        status_item_pesanan not null default 'Diproses',
  subtotal           numeric(12,2) not null check (subtotal >= 0),
  id_pesanan         uuid not null references pesanan(id_pesanan) on delete cascade,
  id_menu            uuid not null references menu(id_menu),
  id_pegawai         uuid references pegawai(id_pegawai)
);

-- 8. Dt-03: Data Pembayaran
create table pembayaran (
  id_pembayaran      uuid primary key default gen_random_uuid(),
  total_bayar        numeric(12,2) not null check (total_bayar >= 0),
  metode_pembayaran  metode_pembayaran not null,
  status_pembayaran  status_pembayaran not null default 'menunggu_konfirmasi',
  waktu_konfirmasi   timestamptz,
  id_pesanan         uuid not null unique references pesanan(id_pesanan),
  id_pegawai         uuid not null references pegawai(id_pegawai)
);

-- Indexes untuk optimasi query & filtering
create index idx_pesanan_id_meja on pesanan(id_meja);
create index idx_pesanan_status on pesanan(status);
create index idx_detail_pesanan_id_pesanan on detail_pesanan(id_pesanan);
create index idx_pembayaran_id_pesanan on pembayaran(id_pesanan);
create index idx_pesanan_token_sesi on pesanan(token_sesi);

-- Disable default RLS restrictions or allow anon read/write if using API keys in public app (or configure policies for Supabase public key)
alter table pegawai enable row level security;
alter table meja enable row level security;
alter table pelanggan enable row level security;
alter table menu enable row level security;
alter table pesanan enable row level security;
alter table detail_pesanan enable row level security;
alter table pembayaran enable row level security;

-- Policies for public API access using anon key (or service role)
create policy "Allow all access to public for anon/authenticated" on pegawai for all using (true) with check (true);
create policy "Allow all access to public for anon/authenticated" on meja for all using (true) with check (true);
create policy "Allow all access to public for anon/authenticated" on pelanggan for all using (true) with check (true);
create policy "Allow all access to public for anon/authenticated" on menu for all using (true) with check (true);
create policy "Allow all access to public for anon/authenticated" on pesanan for all using (true) with check (true);
create policy "Allow all access to public for anon/authenticated" on detail_pesanan for all using (true) with check (true);
create policy "Allow all access to public for anon/authenticated" on pembayaran for all using (true) with check (true);

-- Enable Supabase Realtime for realtime updates
alter publication supabase_realtime add table meja;
alter publication supabase_realtime add table pesanan;
alter publication supabase_realtime add table detail_pesanan;
alter publication supabase_realtime add table pembayaran;
