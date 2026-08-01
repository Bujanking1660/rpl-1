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

  // Total Pemasukan Bersih
  const { data: pembayaran } = await supabase
    .from('pembayaran')
    .select('total_bayar')
    .eq('status_pembayaran', 'terkonfirmasi');

  const totalPemasukan = pembayaran?.reduce((sum, item) => sum + Number(item.total_bayar || 0), 0) || 0;

  // Status Okupansi Meja
  const { data: mejaList } = await supabase.from('meja').select('status_ketersediaan');
  const totalMeja = mejaList?.length || 0;
  const mejaTerisi = mejaList?.filter((m) => m.status_ketersediaan === 'terisi').length || 0;

  return {
    totalPegawai: totalPegawai || 0,
    totalPemasukan,
    totalMeja,
    mejaTerisi,
    okupansiPersen: totalMeja > 0 ? Math.round((mejaTerisi / totalMeja) * 100) : 0,
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
