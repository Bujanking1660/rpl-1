'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getPesananByTokenAction } from '@/lib/actions/pelanggan';
import { createClient } from '@/lib/supabase/client';
import { CheckCircle2, Clock, UtensilsCrossed, CreditCard, ChefHat } from 'lucide-react';
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
        <p className="text-sm text-slate-400">Memuat status pesanan...</p>
      </div>
    );
  }

  const nomorMeja = data?.pesanan?.meja?.nomor_meja || '??';
  const pesananStatus = data?.pesanan?.status || 'menunggu_pembayaran';
  const isPaid = pesananStatus === 'diproses' || pesananStatus === 'selesai' || data?.pembayaran?.status_pembayaran === 'terkonfirmasi';
  const details = data?.details || [];

  const statusItemCounts = {
    menunggu: details.filter((d: any) => d.status_item === 'Diproses').length,
    selesai: details.filter((d: any) => d.status_item === 'Selesai').length,
    disajikan: details.filter((d: any) => d.status_item === 'Disajikan').length,
  };

  return (
    <div className="px-4 pt-4 pb-6 space-y-4">
      {/* Status Banner */}
      <div className={`rounded-2xl p-5 text-center space-y-2 ${isPaid ? 'bg-[#1e2d42]' : 'bg-amber-500'}`}>
        <div className="w-14 h-14 bg-white/15 rounded-full flex items-center justify-center mx-auto">
          {isPaid
            ? <ChefHat className="w-8 h-8 text-orange-300" />
            : <CreditCard className="w-8 h-8 text-white" />
          }
        </div>
        <div>
          <h2 className="text-white font-black text-lg leading-tight">
            {isPaid ? 'Sedang Dimasak Koki' : 'Menunggu Pembayaran'}
          </h2>
          <p className="text-white/70 text-xs mt-1 leading-relaxed max-w-xs mx-auto">
            {isPaid
              ? 'Pembayaran sudah dikonfirmasi kasir. Koki sedang menyiapkan pesanan Anda.'
              : `Pesanan sudah masuk. Sebutkan nomor meja #${nomorMeja} ke kasir untuk membayar.`
            }
          </p>
        </div>
      </div>

      {/* Progress mini-cards */}
      {isPaid && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-center">
            <p className="text-xl font-black text-amber-600">{statusItemCounts.menunggu}</p>
            <p className="text-[10px] text-amber-700 font-semibold mt-0.5">Dimasak</p>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
            <p className="text-xl font-black text-blue-600">{statusItemCounts.selesai}</p>
            <p className="text-[10px] text-blue-700 font-semibold mt-0.5">Siap Saji</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
            <p className="text-xl font-black text-emerald-600">{statusItemCounts.disajikan}</p>
            <p className="text-[10px] text-emerald-700 font-semibold mt-0.5">Disajikan</p>
          </div>
        </div>
      )}

      {/* Item List */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-50">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Detail Pesanan</h3>
        </div>
        <div className="divide-y divide-slate-50">
          {details.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">Belum ada item pesanan.</p>
          ) : (
            details.map((item: any) => {
              const status = item.status_item;
              let statusClass = 'bg-amber-100 text-amber-700';
              let icon = <Clock className="w-3 h-3" />;
              let label = 'Dimasak';

              if (status === 'Selesai') {
                statusClass = 'bg-blue-100 text-blue-700';
                icon = <CheckCircle2 className="w-3 h-3" />;
                label = 'Siap Saji';
              } else if (status === 'Disajikan') {
                statusClass = 'bg-emerald-100 text-emerald-700';
                icon = <UtensilsCrossed className="w-3 h-3" />;
                label = 'Disajikan';
              }

              return (
                <div key={item.id_detail_pesanan} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{item.menu?.nama_menu}</p>
                    <p className="text-[11px] text-slate-400">{item.jumlah} porsi</p>
                  </div>
                  <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${statusClass}`}>
                    {icon} {label}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        {!isPaid && (
          <Link
            href={`/meja/${token}/pembayaran`}
            className="block w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl text-xs text-center shadow-md transition-colors"
          >
            Lihat Detail Tagihan &rarr;
          </Link>
        )}
        <Link
          href={`/meja/${token}/menu`}
          className="block w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-2xl text-xs text-center transition-colors"
        >
          + Tambah Pesanan
        </Link>
      </div>
    </div>
  );
}
