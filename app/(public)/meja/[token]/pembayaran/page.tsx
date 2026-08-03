'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { getPesananByTokenAction } from '@/lib/actions/pelanggan';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, ArrowRight, CheckCircle2, Receipt } from 'lucide-react';

interface TagihanDetail {
  id_detail_pesanan: string;
  jumlah: number;
  subtotal: number;
  menu?: { nama_menu?: string } | null;
}

interface TagihanData {
  pesanan?: {
    status?: string;
    meja?: { nomor_meja?: string } | null;
  } | null;
  pembayaran?: { status_pembayaran?: string } | null;
  details?: TagihanDetail[];
}

export default function CustomerPembayaranPage() {
  const params = useParams();
  const token = params.token as string;

  const [data, setData] = useState<TagihanData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await getPesananByTokenAction(token);
    setLoading(false);
    if (res.success) setData(res as TagihanData);
  }, [token]);

  useEffect(() => {
    if (token) {
      const t = window.setTimeout(fetchData, 0);

      const supabase = createClient();
      const channel = supabase
        .channel(`pembayaran-${token}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'pesanan' }, () => fetchData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'pembayaran' }, () => fetchData())
        .subscribe();

      return () => {
        window.clearTimeout(t);
        supabase.removeChannel(channel);
      };
    }
  }, [token, fetchData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <span className="w-8 h-8 border-[3px] border-[#2B4263] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-400">Memuat tagihan...</p>
      </div>
    );
  }

  const nomorMeja = data?.pesanan?.meja?.nomor_meja || '01';
  const pesananStatus = data?.pesanan?.status || 'menunggu_pembayaran';
  const isPaid = pesananStatus === 'diproses' || pesananStatus === 'selesai';
  const details = data?.details || [];
  const total = details.reduce((sum: number, item) => sum + Number(item.subtotal || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-6">
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between mb-8 text-slate-700">
          <Link href={`/meja/${token}/menu`} className="p-2 bg-white rounded-xl border border-slate-100 shadow-sm text-slate-500 hover:text-slate-800 transition-colors" aria-label="Kembali ke menu">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-[#2B4263]" /> Bill
          </span>
          <button onClick={fetchData} className="p-2 bg-white rounded-xl border border-slate-100 shadow-sm text-slate-400 hover:text-slate-600 transition-colors cursor-pointer" aria-label="Muat ulang">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Center Meja Banner */}
        <div className="text-center my-10 space-y-3">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#2B4263] to-[#355070] text-white flex items-center justify-center shadow-lg mb-4">
            {isPaid ? <CheckCircle2 className="w-8 h-8 text-emerald-300" /> : <Receipt className="w-8 h-8 text-orange-300" />}
          </div>
          <h1 className="text-3xl font-extrabold text-[#2B4263] tracking-tight uppercase">
            Meja {nomorMeja}
          </h1>
          <h2 className="text-lg font-bold text-slate-700">
            {isPaid ? 'Pembayaran Berhasil!' : 'Harap Konfirmasi Ke Kasir!'}
          </h2>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            {isPaid
              ? 'Pesanan Anda sudah dikonfirmasi dan sedang disiapkan oleh dapur.'
              : 'Sebutkan nomor meja ke Kasir untuk menyelesaikan pembayaran dan memproses pesanan Anda.'}
          </p>
        </div>

        {/* Bill Summary */}
        {details.length > 0 && (
          <div className="card p-5 space-y-3 mt-6">
            <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider pb-2 border-b border-slate-200">
              <span>Item</span>
              <span>Subtotal</span>
            </div>
            {details.map((item) => (
              <div key={item.id_detail_pesanan} className="flex justify-between text-xs text-slate-700">
                <span>{item.menu?.nama_menu} × {item.jumlah}</span>
                <span className="font-semibold">Rp {Number(item.subtotal).toLocaleString('id-ID')}</span>
              </div>
            ))}
            <div className="flex justify-between items-center pt-3 border-t border-slate-200 text-sm font-bold text-slate-900">
              <span>Total Bill</span>
              <span className="text-[#FA6338] text-base">Rp {total.toLocaleString('id-ID')}</span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Status Navigation Link */}
      <div className="mt-8">
        <Link
          href={`/meja/${token}/status`}
          className="btn-primary w-full block text-center"
        >
          Pantau Status Masakan <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
