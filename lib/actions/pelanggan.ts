'use server';

import { createClient } from '../supabase/server';

export async function validateTokenSesiAction(token_sesi: string) {
  const supabase = await createClient();

  const { data: pesanan, error } = await supabase
    .from('pesanan')
    .select(`
      *,
      meja (*),
      pelanggan (*)
    `)
    .eq('token_sesi', token_sesi)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !pesanan) {
    return { valid: false, error: 'Sesi meja tidak ditemukan atau tidak valid' };
  }

  const isExpired = new Date(pesanan.token_expired_at).getTime() < Date.now();
  if (isExpired) {
    return { valid: false, error: 'Sesi telah berakhir, silakan hubungi pelayan' };
  }

  return { valid: true, pesanan };
}

export async function getMenuPelangganAction() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('menu')
    .select('*')
    .eq('status_ketersediaan', 'tersedia')
    .order('nama_menu', { ascending: true });

  if (error) {
    return { success: false, error: error.message, data: [] };
  }
  return { success: true, data };
}

export async function submitPesananPelangganAction(
  token_sesi: string,
  items: { id_menu: string; jumlah: number; harga: number }[]
) {
  if (!items || items.length === 0) {
    return { success: false, error: 'Tidak ada menu yang dipilih' };
  }

  const validation = await validateTokenSesiAction(token_sesi);
  if (!validation.valid || !validation.pesanan) {
    return { success: false, error: validation.error || 'Sesi tidak valid' };
  }

  const supabase = await createClient();
  const sessionPesanan = validation.pesanan;
  const mejaId = sessionPesanan.id_meja;
  const idPelanggan = sessionPesanan.id_pelanggan;
  const idPegawai = sessionPesanan.id_pegawai;

  let pesananId = sessionPesanan.id_pesanan;

  // Jika pesanan terakhir sudah dibayar (diproses/selesai), buat tagihan baru
  // untuk ronde pesanan ini agar item yang sudah dibayar tidak tertagih lagi.
  const needsNewPesanan = sessionPesanan.status !== 'menunggu_pembayaran';
  if (needsNewPesanan) {
    const { data: newPesanan, error: createError } = await supabase
      .from('pesanan')
      .insert({
        id_meja: mejaId,
        id_pelanggan: idPelanggan,
        id_pegawai: idPegawai,
        token_sesi,
        token_expired_at: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
        status: 'menunggu_pembayaran',
      })
      .select('id_pesanan')
      .single();

    if (createError || !newPesanan) {
      return { success: false, error: createError?.message || 'Gagal membuat pesanan baru' };
    }
    pesananId = newPesanan.id_pesanan;
  }

  const detailRecords = items.map((item) => ({
    id_pesanan: pesananId,
    id_menu: item.id_menu,
    jumlah: item.jumlah,
    subtotal: item.jumlah * item.harga,
    status_item: 'Diproses' as const,
  }));

  const { data, error } = await supabase
    .from('detail_pesanan')
    .insert(detailRecords)
    .select('*');

  if (error) {
    return { success: false, error: error.message };
  }

  // Update pesanan status to 'menunggu_pembayaran' so Kasir immediately receives notification of new bill for Meja
  await supabase
    .from('pesanan')
    .update({ status: 'menunggu_pembayaran' })
    .eq('id_pesanan', pesananId);

  return { success: true, data };
}

export async function getPesananByTokenAction(token_sesi: string) {
  const validation = await validateTokenSesiAction(token_sesi);
  if (!validation.valid || !validation.pesanan) {
    return { success: false, error: validation.error, data: null };
  }

  const supabase = await createClient();
  const { data: details, error } = await supabase
    .from('detail_pesanan')
    .select(`
      *,
      menu (*)
    `)
    .eq('id_pesanan', validation.pesanan.id_pesanan);

  if (error) {
    return { success: false, error: error.message, data: null };
  }

  const { data: pembayaran } = await supabase
    .from('pembayaran')
    .select('*')
    .eq('id_pesanan', validation.pesanan.id_pesanan)
    .maybeSingle();

  return {
    success: true,
    pesanan: validation.pesanan,
    details: details || [],
    pembayaran: pembayaran || null,
  };
}
