export type PeranPegawai = 'pelayan' | 'kasir' | 'koki' | 'manajer';
export type StatusMeja = 'terisi' | 'tersedia';
export type StatusMenu = 'tersedia' | 'habis';
export type StatusPesanan = 'menunggu_pembayaran' | 'diproses' | 'selesai';
export type StatusItemPesanan = 'Diproses' | 'Selesai' | 'Disajikan' | 'Bahan_Tidak_Tersedia';
export type StatusPembayaran = 'menunggu_konfirmasi' | 'terkonfirmasi';
export type MetodePembayaran = 'tunai' | 'qr_gopay';

export interface Pegawai {
  id_pegawai: string;
  nama_pegawai: string;
  peran: PeranPegawai;
  username: string;
  password?: string;
  created_at: string;
}

export interface Meja {
  id_meja: string;
  nomor_meja: string;
  kapasitas: number;
  status_ketersediaan: StatusMeja;
  created_at: string;
}

export interface Pelanggan {
  id_pelanggan: string;
  jumlah_orang: number;
  created_at: string;
}

export interface Menu {
  id_menu: string;
  nama_menu: string;
  harga: number;
  kategori: string;
  status_ketersediaan: StatusMenu;
  created_at: string;
}

export interface Pesanan {
  id_pesanan: string;
  tanggal: string;
  status: StatusPesanan;
  id_meja: string;
  id_pelanggan: string;
  id_pegawai: string;
  token_sesi: string;
  token_expired_at: string;
  created_at: string;
  // Joined fields
  meja?: Meja;
  pelanggan?: Pelanggan;
  pegawai?: Pegawai;
  detail_pesanan?: DetailPesanan[];
  pembayaran?: Pembayaran;
}

export interface DetailPesanan {
  id_detail_pesanan: string;
  jumlah: number;
  status_item: StatusItemPesanan;
  subtotal: number;
  id_pesanan: string;
  id_menu: string;
  id_pegawai?: string | null;
  // Joined fields
  menu?: Menu;
  pesanan?: Pesanan;
  koki?: Pegawai;
}

export interface Pembayaran {
  id_pembayaran: string;
  total_bayar: number;
  metode_pembayaran: MetodePembayaran;
  status_pembayaran: StatusPembayaran;
  waktu_konfirmasi?: string | null;
  id_pesanan: string;
  id_pegawai: string;
  // Joined fields
  pesanan?: Pesanan;
  kasir?: Pegawai;
}
