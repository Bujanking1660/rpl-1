'use server';

import { createClient } from '../supabase/server';
import bcrypt from 'bcryptjs';
import { PeranPegawai, StatusMenu, StatusMeja } from '../types/database';

export async function getDashboardStatsAction() {
  const supabase = await createClient();

  // Total Pegawai
  const { count: totalPegawai } = await supabase
    .from('pegawai')
    .select('*', { count: 'exact', head: true });

  // Total Pemasukan dari pembayaran terkonfirmasi
  const { data: pembayaran } = await supabase
    .from('pembayaran')
    .select('total_bayar, metode_pembayaran, created_at')
    .eq('status_pembayaran', 'terkonfirmasi');

  const totalPemasukan = pembayaran?.reduce((sum, item) => sum + Number(item.total_bayar || 0), 0) || 0;
  const totalOrderKonfirmasi = pembayaran?.length || 0;
  const avgOrderValue = totalOrderKonfirmasi > 0 ? Math.round(totalPemasukan / totalOrderKonfirmasi) : 0;

  // Breakdown metode pembayaran
  const tunaiCount = pembayaran?.filter((p) => p.metode_pembayaran === 'tunai').length || 0;
  const qrisCount = pembayaran?.filter((p) => p.metode_pembayaran === 'qr_gopay').length || 0;

  // Revenue 7 hari terakhir
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const { data: revenueHarian } = await supabase
    .from('pembayaran')
    .select('total_bayar, created_at')
    .eq('status_pembayaran', 'terkonfirmasi')
    .gte('created_at', sevenDaysAgo.toISOString());

  // Group by date
  const revenueByDay: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' });
    revenueByDay[key] = 0;
  }
  revenueHarian?.forEach((item) => {
    const d = new Date(item.created_at);
    const key = d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' });
    if (key in revenueByDay) {
      revenueByDay[key] += Number(item.total_bayar || 0);
    }
  });
  const revenueChartData = Object.entries(revenueByDay).map(([hari, total]) => ({ hari, total }));

  // Status Okupansi Meja
  const { data: mejaList } = await supabase.from('meja').select('status_ketersediaan');
  const totalMeja = mejaList?.length || 0;
  const mejaTerisi = mejaList?.filter((m) => m.status_ketersediaan === 'terisi').length || 0;

  // Top 5 Menu Terlaris dari detail_pesanan
  const { data: detailPesanan } = await supabase
    .from('detail_pesanan')
    .select('jumlah, menu:id_menu(nama_menu, kategori)');

  const menuAgg: Record<string, { nama: string; kategori: string; total: number }> = {};
  detailPesanan?.forEach((item: any) => {
    const nama = item.menu?.nama_menu || 'Unknown';
    const kategori = item.menu?.kategori || '-';
    if (!menuAgg[nama]) menuAgg[nama] = { nama, kategori, total: 0 };
    menuAgg[nama].total += Number(item.jumlah || 0);
  });
  const topMenu = Object.values(menuAgg)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // Distribusi Role Pegawai
  const { data: pegawaiList } = await supabase.from('pegawai').select('peran');
  const roleAgg: Record<string, number> = { pelayan: 0, kasir: 0, koki: 0, manajer: 0 };
  pegawaiList?.forEach((p) => { if (p.peran in roleAgg) roleAgg[p.peran]++; });
  const roleDistribusi = Object.entries(roleAgg).map(([role, count]) => ({ role, count }));

  return {
    totalPegawai: totalPegawai || 0,
    totalPemasukan,
    totalOrderKonfirmasi,
    avgOrderValue,
    tunaiCount,
    qrisCount,
    totalMeja,
    mejaTerisi,
    mejaTersedia: totalMeja - mejaTerisi,
    okupansiPersen: totalMeja > 0 ? Math.round((mejaTerisi / totalMeja) * 100) : 0,
    topMenu,
    roleDistribusi,
    revenueChartData,
  };
}

// === CRUD PEGAWAI ===
export async function getPegawaiListAction() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('pegawai')
    .select('id_pegawai, nama_pegawai, peran, username, created_at')
    .order('created_at', { ascending: false });

  if (error) return { success: false, error: error.message, data: [] };
  return { success: true, data };
}

export async function createPegawaiAction(nama_pegawai: string, peran: PeranPegawai, username: string, passwordPlain: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('pegawai')
    .insert({
      nama_pegawai,
      peran,
      username,
      password: passwordPlain,
    })
    .select('id_pegawai, nama_pegawai, peran, username')
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function updatePegawaiAction(id_pegawai: string, nama_pegawai: string, peran: PeranPegawai, username: string, passwordPlain?: string) {
  const supabase = await createClient();

  const updateData: Record<string, any> = {
    nama_pegawai,
    peran,
    username,
  };

  if (passwordPlain && passwordPlain.trim().length > 0) {
    updateData.password = passwordPlain.trim();
  }

  const { data, error } = await supabase
    .from('pegawai')
    .update(updateData)
    .eq('id_pegawai', id_pegawai)
    .select('id_pegawai, nama_pegawai, peran, username')
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function deletePegawaiAction(id_pegawai: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('pegawai').delete().eq('id_pegawai', id_pegawai);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// === CRUD MENU ===
export async function getMenuListAction() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('menu')
    .select('*')
    .order('kategori', { ascending: true });

  if (error) return { success: false, error: error.message, data: [] };
  return { success: true, data };
}

export async function createMenuAction(nama_menu: string, harga: number, kategori: string, status_ketersediaan: StatusMenu = 'tersedia') {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('menu')
    .insert({ nama_menu, harga, kategori, status_ketersediaan })
    .select('*')
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function updateMenuAction(id_menu: string, nama_menu: string, harga: number, kategori: string, status_ketersediaan: StatusMenu) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('menu')
    .update({ nama_menu, harga, kategori, status_ketersediaan })
    .eq('id_menu', id_menu)
    .select('*')
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function deleteMenuAction(id_menu: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('menu').delete().eq('id_menu', id_menu);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// === CRUD MEJA ===
export async function createMejaAction(nomor_meja: string, kapasitas: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('meja')
    .insert({ nomor_meja, kapasitas, status_ketersediaan: 'tersedia' })
    .select('*')
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function updateMejaAction(id_meja: string, nomor_meja: string, kapasitas: number, status_ketersediaan: StatusMeja) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('meja')
    .update({ nomor_meja, kapasitas, status_ketersediaan })
    .eq('id_meja', id_meja)
    .select('*')
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function deleteMejaAction(id_meja: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('meja').delete().eq('id_meja', id_meja);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
