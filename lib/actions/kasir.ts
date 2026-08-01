'use server';

import { createClient } from '../supabase/server';
import { getStaffSession } from '../auth/session';
import { MetodePembayaran } from '../types/database';

export async function getPesananPendingKasirAction() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('pesanan')
    .select(`
      *,
      meja (*),
      pelanggan (*),
      detail_pesanan (
        *,
        menu (*)
      ),
      pembayaran (*)
    `)
    .eq('status', 'menunggu_pembayaran')
    .order('created_at', { ascending: false });

  if (error) {
    return { success: false, error: error.message, data: [] };
  }

  return { success: true, data };
}

export async function getPesananByIdKasirAction(id_pesanan: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('pesanan')
    .select(`
      *,
      meja (*),
      pelanggan (*),
      detail_pesanan (
        *,
        menu (*)
      ),
      pembayaran (*)
    `)
    .eq('id_pesanan', id_pesanan)
    .single();

  if (error || !data) {
    return { success: false, error: error?.message || 'Pesanan tidak ditemukan', data: null };
  }

  return { success: true, data };
}

export async function prosesPembayaranAction(
  id_pesanan: string,
  total_bayar: number,
  metode_pembayaran: MetodePembayaran
) {
  const session = await getStaffSession();
  if (!session) {
    return { success: false, error: 'Sesi kasir tidak valid' };
  }

  const supabase = await createClient();

  // 1. Insert atau Update data pembayaran
  const { data: existingPayment } = await supabase
    .from('pembayaran')
    .select('id_pembayaran')
    .eq('id_pesanan', id_pesanan)
    .maybeSingle();

  let pembayaranResult;
  if (existingPayment) {
    pembayaranResult = await supabase
      .from('pembayaran')
      .update({
        total_bayar,
        metode_pembayaran,
        status_pembayaran: 'terkonfirmasi',
        waktu_konfirmasi: new Date().toISOString(),
        id_pegawai: session.id_pegawai,
      })
      .eq('id_pembayaran', existingPayment.id_pembayaran)
      .select('*')
      .single();
  } else {
    pembayaranResult = await supabase
      .from('pembayaran')
      .insert({
        id_pesanan,
        total_bayar,
        metode_pembayaran,
        status_pembayaran: 'terkonfirmasi',
        waktu_konfirmasi: new Date().toISOString(),
        id_pegawai: session.id_pegawai,
      })
      .select('*')
      .single();
  }

  if (pembayaranResult.error) {
    return { success: false, error: pembayaranResult.error.message };
  }

  // 2. Update status pesanan menjadi 'diproses' (agar koki bisa mengerjakan)
  const { error: updatePesananError } = await supabase
    .from('pesanan')
    .update({ status: 'diproses' })
    .eq('id_pesanan', id_pesanan);

  if (updatePesananError) {
    return { success: false, error: updatePesananError.message };
  }

  return { success: true, pembayaran: pembayaranResult.data };
}
