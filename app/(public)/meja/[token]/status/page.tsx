'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { getPesananByTokenAction } from '@/lib/actions/pelanggan';
import { createClient } from '@/lib/supabase/client';
import { UtensilsCrossed, Check, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface StatusDetail {
  id_detail_pesanan: string;
  jumlah: number;
  status_item: string;
  menu?: { nama_menu?: string } | null;
}

interface StatusData {
  pesanan?: {
    status?: string;
    meja?: { nomor_meja?: string } | null;
  } | null;
  pembayaran?: { status_pembayaran?: string } | null;
  details?: StatusDetail[];
}

export default function CustomerStatusPage() {
  const params = useParams();
  const token = params.token as string;

  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!token) return;
    const res = await getPesananByTokenAction(token);
    setLoading(false);
    if (res.success) setData(res as StatusData);
  }, [token]);

  useEffect(() => {
    if (!token) return;

    const t = window.setTimeout(fetchData, 0);

    const supabase = createClient();
    const channel = supabase
      .channel(`customer-status-${token}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'detail_pesanan' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pesanan' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pembayaran' }, () => fetchData())
      .subscribe();

    return () => {
      window.clearTimeout(t);
      supabase.removeChannel(channel);
    };
  }, [token, fetchData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <span className="w-8 h-8 border-[3px] border-[#2B4263] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-400">Memuat status pesanan...</p>
      </div>
    );
  }

  const nomorMeja = data?.pesanan?.meja?.nomor_meja || '01';
  const pesananStatus = data?.pesanan?.status || 'menunggu_pembayaran';
  const isPaid = pesananStatus === 'diproses' || pesananStatus === 'selesai' || data?.pembayaran?.status_pembayaran === 'terkonfirmasi';
  const details = data?.details || [];

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col">
      {/* Main Order Confirmed Card */}
      <div className="flex-1 flex flex-col items-center justify-center text-center my-auto">
        <div className="card w-full max-w-sm p-8 flex flex-col items-center">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#2B4263] to-[#355070] flex items-center justify-center mb-6 shadow-xl">
            <Check className="w-10 h-10 text-orange-300 stroke-[3]" />
          </div>

          <h1 className="text-2xl font-extrabold text-slate-800 mb-3 tracking-tight">
            {isPaid ? 'Order Confirmed' : `Meja #${nomorMeja} Registered`}
          </h1>

          <p className="text-slate-400 text-xs max-w-xs leading-relaxed mb-6 font-medium">
            {isPaid
              ? 'Thank you for your order. Orders are now being prepared by our kitchen team.'
              : 'Pesanan Anda tercatat. Mohon konfirmasi pembayaran ke Kasir untuk memproses hidangan.'}
          </p>

          {/* Details list */}
          {details.length > 0 && (
            <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left space-y-2">
              <p className="text-[10px] font-bold text-[#2B4263] uppercase tracking-wider mb-1 flex items-center gap-1">
                <UtensilsCrossed className="w-3 h-3" /> Status Items
              </p>
              {details.map((item) => (
                <div key={item.id_detail_pesanan} className="flex justify-between items-center text-xs">
                  <span className="font-medium text-slate-700">{item.menu?.nama_menu} ({item.jumlah}x)</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EEF2F8] text-[#2B4263] font-semibold">
                    {item.status_item}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action Button */}
      <div className="space-y-3 mt-8">
        <Link
          href={`/meja/${token}/menu`}
          className="btn-primary w-full block text-center"
        >
          Continue / Pesan Lagi <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
