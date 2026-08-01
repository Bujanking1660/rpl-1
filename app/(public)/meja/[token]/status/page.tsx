'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getPesananByTokenAction } from '@/lib/actions/pelanggan';
import { createClient } from '@/lib/supabase/client';
import { CheckCircle2, Clock, UtensilsCrossed, Check } from 'lucide-react';
import Link from 'next/link';

export default function CustomerStatusPage() {
  const params = useParams();
  const token = params.token as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;

    fetchData();

    const supabase = createClient();
    const channel = supabase
      .channel(`customer-status-${token}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'detail_pesanan' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pesanan' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pembayaran' }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [token]);

  async function fetchData() {
    if (!token) return;
    const res = await getPesananByTokenAction(token);
    setLoading(false);
    if (res.success) setData(res);
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <span className="w-8 h-8 border-[3px] border-orange-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-400">Memuat status pesanan...</p>
      </div>
    );
  }

  const nomorMeja = data?.pesanan?.meja?.nomor_meja || '01';
  const pesananStatus = data?.pesanan?.status || 'menunggu_pembayaran';
  const isPaid = pesananStatus === 'diproses' || pesananStatus === 'selesai' || data?.pembayaran?.status_pembayaran === 'terkonfirmasi';
  const details = data?.details || [];

  return (
    <div className="min-h-screen bg-[#2B4263] text-white flex flex-col justify-between p-8 relative overflow-hidden">
      {/* Background Texture */}
      <div
        className="absolute inset-0 opacity-20 bg-cover bg-center pointer-events-none"
        style={{ backgroundImage: `url('/bg.png')` }}
      />

      {/* Main Order Confirmed Card */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center my-auto">
        <div className="w-24 h-24 rounded-full border-4 border-white/80 flex items-center justify-center mb-8 bg-white/10 backdrop-blur-sm shadow-2xl">
          <Check className="w-12 h-12 text-white stroke-[3]" />
        </div>

        <h1 className="text-3xl font-extrabold text-white mb-4 tracking-tight">
          {isPaid ? 'Order Confirmed' : `Meja #${nomorMeja} Registered`}
        </h1>

        <p className="text-slate-200 text-xs max-w-xs leading-relaxed mb-6 font-medium">
          {isPaid
            ? 'Thank you for your order. Orders are now being prepared by our kitchen team.'
            : 'Pesanan Anda tercatat. Mohon konfirmasi pembayaran ke Kasir untuk memproses hidangan.'}
        </p>

        {/* Details list */}
        {details.length > 0 && (
          <div className="w-full max-w-xs bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 text-left space-y-2 mb-6">
            <p className="text-[10px] font-bold text-orange-400 uppercase tracking-wider mb-1">Status Items</p>
            {details.map((item: any) => (
              <div key={item.id_detail_pesanan} className="flex justify-between items-center text-xs">
                <span className="font-medium text-slate-100">{item.menu?.nama_menu} ({item.jumlah}x)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 text-white font-semibold">
                  {item.status_item}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Action Button */}
      <div className="relative z-10 space-y-3">
        <Link
          href={`/meja/${token}/menu`}
          className="block w-full py-4 bg-[#262626] hover:bg-black text-white font-bold rounded-2xl text-xs text-center transition-all shadow-xl uppercase tracking-wider border border-white/10"
        >
          Continue / Pesan Lagi
        </Link>
      </div>
    </div>
  );
}

