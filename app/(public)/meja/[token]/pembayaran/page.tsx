'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getPesananByTokenAction } from '@/lib/actions/pelanggan';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { ArrowLeft, RefreshCw } from 'lucide-react';

export default function CustomerPembayaranPage() {
  const params = useParams();
  const token = params.token as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchData();

      const supabase = createClient();
      const channel = supabase
        .channel(`pembayaran-${token}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'pesanan' }, () => fetchData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'pembayaran' }, () => fetchData())
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [token]);

  async function fetchData() {
    setLoading(true);
    const res = await getPesananByTokenAction(token);
    setLoading(false);
    if (res.success) setData(res);
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <span className="w-8 h-8 border-[3px] border-[#FA6338] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-400">Memuat tagihan...</p>
      </div>
    );
  }

  const nomorMeja = data?.pesanan?.meja?.nomor_meja || '01';
  const pesananStatus = data?.pesanan?.status || 'menunggu_pembayaran';
  const isPaid = pesananStatus === 'diproses' || pesananStatus === 'selesai';
  const details = data?.details || [];
  const total = details.reduce((sum: number, item: any) => sum + Number(item.subtotal || 0), 0);

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between p-6">
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between mb-10 text-slate-700">
          <Link href={`/meja/${token}/menu`} className="flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="text-base font-bold text-slate-800">Payment</span>
          <button onClick={fetchData} className="text-slate-400 hover:text-slate-600">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Center Meja Banner matching Pelanggan.png */}
        <div className="text-center my-12 space-y-4">
          <h1 className="text-4xl font-extrabold text-[#FA6338] tracking-tight uppercase">
            MEJA {nomorMeja}
          </h1>
          <h2 className="text-2xl font-bold text-[#2B4263]">
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
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-3 mt-6">
            <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider pb-2 border-b border-slate-200">
              <span>Item</span>
              <span>Subtotal</span>
            </div>
            {details.map((item: any) => (
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
          className="block w-full py-4 bg-[#2B4263] hover:bg-[#1f3049] text-white font-bold rounded-2xl text-xs text-center transition-all shadow-md uppercase tracking-wider"
        >
          Pantau Status Masakan &rarr;
        </Link>
      </div>
    </div>
  );
}

