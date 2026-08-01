'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getPesananByTokenAction } from '@/lib/actions/pelanggan';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { MapPin, RefreshCw } from 'lucide-react';

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
        <span className="w-8 h-8 border-[3px] border-orange-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400">Memuat tagihan...</p>
      </div>
    );
  }

  const nomorMeja = data?.pesanan?.meja?.nomor_meja || '??';
  const pesananStatus = data?.pesanan?.status || 'menunggu_pembayaran';
  const isPaid = pesananStatus === 'diproses' || pesananStatus === 'selesai';
  const details = data?.details || [];
  const total = details.reduce((sum: number, item: any) => sum + Number(item.subtotal || 0), 0);

  return (
    <div className="px-4 pt-4 pb-6 space-y-4">
      {/* Meja Badge */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center justify-between">
        <div>
          <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Nomor Meja Anda</p>
          <h1 className="text-4xl font-black text-orange-500 mt-0.5">#{nomorMeja}</h1>
        </div>
        <div className="w-14 h-14 bg-orange-50 rounded-2xl flex flex-col items-center justify-center border border-orange-100">
          <MapPin className="w-6 h-6 text-orange-400" />
          <span className="text-[9px] text-orange-500 font-bold mt-0.5">Meja</span>
        </div>
      </div>

      {/* Instruksi */}
      {!isPaid ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <h2 className="font-black text-amber-800 text-sm mb-1">Cara Membayar</h2>
          <p className="text-amber-700 text-xs leading-relaxed">
            Sebutkan nomor meja <strong>#{nomorMeja}</strong> kepada petugas kasir. Kasir akan memproses pembayaran Anda dan memulai proses masak di dapur.
          </p>
        </div>
      ) : (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
          <h2 className="font-black text-emerald-800 text-sm mb-1">✓ Pembayaran Terkonfirmasi</h2>
          <p className="text-emerald-700 text-xs leading-relaxed">
            Terima kasih! Pembayaran telah dikonfirmasi oleh kasir. Pesanan Anda sedang dimasak.
          </p>
        </div>
      )}

      {/* Rincian Tagihan */}
      {details.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-50 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rincian Tagihan</h3>
            <button onClick={fetchData} className="text-slate-400 hover:text-slate-600 transition-colors">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="divide-y divide-slate-50">
            {details.map((item: any) => (
              <div key={item.id_detail_pesanan} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{item.menu?.nama_menu}</p>
                  <p className="text-[11px] text-slate-400">{item.jumlah} × Rp {Number(item.menu?.harga || 0).toLocaleString('id-ID')}</p>
                </div>
                <span className="text-sm font-bold text-slate-900">
                  Rp {Number(item.subtotal).toLocaleString('id-ID')}
                </span>
              </div>
            ))}
          </div>
          <div className="px-4 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <span className="font-bold text-slate-700 text-sm">Total Tagihan</span>
            <span className="font-black text-orange-500 text-lg">Rp {total.toLocaleString('id-ID')}</span>
          </div>
        </div>
      )}

      <Link
        href={`/meja/${token}/status`}
        className="block w-full py-3 bg-[#1e2d42] hover:bg-[#2b3a55] text-white font-bold rounded-2xl text-xs text-center transition-colors shadow-md"
      >
        Pantau Status Masakan &rarr;
      </Link>
    </div>
  );
}
