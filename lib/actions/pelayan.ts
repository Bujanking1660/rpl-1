'use server';

import { createClient } from '../supabase/server';
import { getStaffSession } from '../auth/session';
import { randomUUID } from 'crypto';

export async function getMejaListAction() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('meja')
    .select('*')
    .order('nomor_meja', { ascending: true });

  if (error) {
    return { success: false, error: error.message, data: [] };
  }
  return { success: true, data };
}

export async function alokasikanMejaAction(id_meja: string, jumlah_orang: number) {
  const session = await getStaffSession();
  if (!session) {
    return { success: false, error: 'Sesi pegawai tidak ditemukan' };
  }

  const supabase = await createClient();

  // 1. Insert ke tabel pelanggan (Dt-04)
  const { data: pelanggan, error: pelangganError } = await supabase
    .from('pelanggan')
    .insert({ jumlah_orang })
    .select('id_pelanggan')
    .single();

  if (pelangganError || !pelanggan) {
    return { success: false, error: pelangganError?.message || 'Gagal menyimpan data pelanggan' };
  }

  // 2. Generate token sesi & expiration (3 jam dari sekarang)
  const token_sesi = randomUUID();
  const token_expired_at = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();

  // 3. Insert ke tabel pesanan (Dt-02)
  const { data: pesanan, error: pesananError } = await supabase
    .from('pesanan')
    .insert({
      id_meja,
      id_pelanggan: pelanggan.id_pelanggan,
      id_pegawai: session.id_pegawai,
      token_sesi,
      token_expired_at,
      status: 'menunggu_pembayaran',
    })
    .select('*')
    .single();

  if (pesananError || !pesanan) {
    return { success: false, error: pesananError?.message || 'Gagal membuat pesanan' };
  }

  // 4. Update status meja menjadi 'terisi' (Dt-01)
  const { error: mejaError } = await supabase
    .from('meja')
    .update({ status_ketersediaan: 'terisi' })
    .eq('id_meja', id_meja);

  if (mejaError) {
    return { success: false, error: mejaError.message };
  }

  return { success: true, token_sesi, pesanan };
}

export async function bersihkanMejaAction(id_meja: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('meja')
    .update({ status_ketersediaan: 'tersedia' })
    .eq('id_meja', id_meja);

  if (error) {
    return { success: false, error: error.message };
  }

  // Meja kosong = tidak ada pelanggan yang akan bayar, tutup pesanan
  // yang masih menunggu pembayaran agar tidak muncul di kasir.
  const { error: pesananError } = await supabase
    .from('pesanan')
    .update({ status: 'selesai' })
    .eq('id_meja', id_meja)
    .eq('status', 'menunggu_pembayaran');

  if (pesananError) {
    return { success: false, error: pesananError.message };
  }

  return { success: true };
}

export async function getPesananSiapDisajikanAction() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('detail_pesanan')
    .select(`
      *,
      menu (*),
      pesanan (
        id_pesanan,
        status,
        meja (*)
      )
    `)
    .eq('status_item', 'Selesai');

  if (error) {
    return { success: false, error: error.message, data: [] };
  }
  return { success: true, data };
}

export async function tandaiDisajikanAction(id_detail_pesanan: string) {
  const supabase = await createClient();
  
  // Update detail_pesanan
  const { data: item, error } = await supabase
    .from('detail_pesanan')
    .update({ status_item: 'Disajikan' })
    .eq('id_detail_pesanan', id_detail_pesanan)
    .select('id_pesanan')
    .single();

  if (error || !item) {
    return { success: false, error: error?.message || 'Gagal update status item' };
  }

  // Cek apakah semua item di id_pesanan sudah disajikan
  const { data: remainingItems } = await supabase
    .from('detail_pesanan')
    .select('id_detail_pesanan, status_item')
    .eq('id_pesanan', item.id_pesanan);

  const allServed = remainingItems?.every((i) => i.status_item === 'Disajikan' || i.status_item === 'Bahan_Tidak_Tersedia');

  if (allServed) {
    await supabase
      .from('pesanan')
      .update({ status: 'selesai' })
      .eq('id_pesanan', item.id_pesanan);
  }

  return { success: true };
}
