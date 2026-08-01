'use server';

import { createClient } from '../supabase/server';
import { getStaffSession } from '../auth/session';
import { StatusItemPesanan } from '../types/database';

export async function getAntrianKokiAction() {
  const supabase = await createClient();

  // Koki only gets orders that have been paid by customer and confirmed by Kasir (pesanan.status = 'diproses')
  const { data, error } = await supabase
    .from('detail_pesanan')
    .select(`
      *,
      menu (*),
      pesanan!inner (
        id_pesanan,
        tanggal,
        status,
        meja (*)
      )
    `)
    .eq('pesanan.status', 'diproses')
    .eq('status_item', 'Diproses')
    .order('created_at', { ascending: true, foreignTable: 'pesanan' });

  if (error) {
    return { success: false, error: error.message, data: [] };
  }

  return { success: true, data };
}

export async function updateStatusItemKokiAction(
  id_detail_pesanan: string,
  status_item: StatusItemPesanan
) {
  const session = await getStaffSession('koki');
  if (!session) {
    return { success: false, error: 'Sesi koki tidak valid' };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('detail_pesanan')
    .update({
      status_item,
      id_pegawai: session.id_pegawai,
    })
    .eq('id_detail_pesanan', id_detail_pesanan)
    .select('*')
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

export async function getRiwayatKokiAction() {
  const supabase = await createClient();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('detail_pesanan')
    .select(`
      *,
      menu (*),
      pesanan!inner (
        id_pesanan,
        tanggal,
        status,
        meja (*)
      )
    `)
    .in('status_item', ['Selesai', 'Disajikan'])
    .gte('pesanan.tanggal', today.toISOString())
    .order('created_at', { ascending: false, foreignTable: 'pesanan' });

  if (error) {
    const fallback = await supabase
      .from('detail_pesanan')
      .select(`
        *,
        menu (*),
        pesanan!inner (
          id_pesanan,
          tanggal,
          status,
          meja (*)
        )
      `)
      .in('status_item', ['Selesai', 'Disajikan'])
      .order('created_at', { ascending: false, foreignTable: 'pesanan' })
      .limit(50);

    if (fallback.error) {
      return { success: false, error: fallback.error.message, data: [] };
    }
    return { success: true, data: fallback.data };
  }

  return { success: true, data };
}
