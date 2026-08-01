-- Seed Data Baru untuk Pak Resto UNIKOM

-- 1. Reset / Hapus seluruh data pegawai lama
delete from pegawai;

-- 2. Insert Data Pegawai Baru dengan Plain-Text Passwords (Tanpa Enkripsi / Hashing)
insert into pegawai (nama_pegawai, peran, username, password) values
  ('Budi Pelayan', 'pelayan', 'pelayan', 'pelayan123'),
  ('Siti Kasir',   'kasir',   'kasir',   'kasir123'),
  ('Andi Koki',    'koki',    'koki',    'koki123'),
  ('Rudi Manajer', 'manajer', 'manajer', 'manajer123')
on conflict (username) do update set password = excluded.password;

-- 3. Data Meja (Meja 01 s.d. 10 dengan berbagai kapasitas)
insert into meja (nomor_meja, kapasitas, status_ketersediaan) values
  ('01', 2, 'tersedia'),
  ('02', 4, 'tersedia'),
  ('03', 4, 'tersedia'),
  ('04', 6, 'tersedia'),
  ('05', 2, 'tersedia'),
  ('06', 4, 'tersedia'),
  ('07', 4, 'tersedia'),
  ('08', 6, 'tersedia'),
  ('09', 8, 'tersedia'),
  ('10', 2, 'tersedia')
on conflict (nomor_meja) do nothing;

-- 4. Data Menu Awal (Hanya 2 Kategori: Makanan dan Minuman - TANPA DESSERT)
insert into menu (nama_menu, harga, kategori, status_ketersediaan) values
  -- Makanan
  ('Ayam Geprek', 12000, 'Makanan', 'tersedia'),
  ('Nasi Goreng Spesial', 15000, 'Makanan', 'tersedia'),
  ('Mie Goreng Resto', 14000, 'Makanan', 'tersedia'),
  ('Nasi Kebuli Ayam', 25000, 'Makanan', 'tersedia'),
  ('Burger Sapi Extra Cheese', 18000, 'Makanan', 'tersedia'),
  ('Nasi Putih', 5000, 'Makanan', 'tersedia'),

  -- Minuman
  ('Cappuccino Hot/Iced', 27900, 'Minuman', 'tersedia'),
  ('Latte Smooth', 24500, 'Minuman', 'tersedia'),
  ('Americano Iced', 23900, 'Minuman', 'tersedia'),
  ('Jus Alpukat Fresh', 12000, 'Minuman', 'tersedia'),
  ('Es Teh Manis', 5000, 'Minuman', 'tersedia'),
  ('Iced Lychee Tea', 18000, 'Minuman', 'tersedia')
on conflict do nothing;

-- 5. Query DML Pengubah Data (Removes 'Dessert' & standardizes categories in existing database)
update menu set kategori = 'Makanan' where kategori in ('Dessert', 'Food') or lower(kategori) like '%dessert%';
update menu set kategori = 'Minuman' where kategori = 'Drink' or lower(kategori) like '%drink%';
