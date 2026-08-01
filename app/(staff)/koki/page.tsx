'use client';

import { useState, useEffect } from 'react';
import { getAntrianKokiAction, updateStatusItemKokiAction, getRiwayatKokiAction } from '@/lib/actions/koki';
import { logoutStaffAction, getStaffSessionAction } from '@/lib/actions/auth';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ChefHat, Utensils, History, LogOut, Clock, CheckCircle2, RefreshCw, UtensilsCrossed } from 'lucide-react';
import { StatusItemPesanan } from '@/lib/types/database';
import { createClient } from '@/lib/supabase/client';

export default function KokiPage() {
  const router = useRouter();

  const [session, setSession] = useState<any>(null);
  const [antrian, setAntrian] = useState<any[]>([]);
  const [riwayat, setRiwayat] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'ANTRIAN' | 'RIWAYAT'>('ANTRIAN');
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    loadSession();
    fetchData();

    const supabase = createClient();
    const channel = supabase
      .channel('koki-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'detail_pesanan' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pesanan' }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function loadSession() {
    const sess = await getStaffSessionAction('koki');
    setSession(sess);
  }

  async function fetchData() {
    const [resAntrian, resRiwayat] = await Promise.all([
      getAntrianKokiAction(),
      getRiwayatKokiAction(),
    ]);
    if (resAntrian.success && resAntrian.data) setAntrian(resAntrian.data);
    if (resRiwayat.success && resRiwayat.data) setRiwayat(resRiwayat.data);
  }

  async function handleSelesaikan(id_detail_pesanan: string) {
    setUpdatingId(id_detail_pesanan);
    const res = await updateStatusItemKokiAction(id_detail_pesanan, 'Selesai');
    setUpdatingId(null);

    if (res.success) {
      toast.success('Masakan ditandai selesai!');
      fetchData();
    } else {
      toast.error(res.error || 'Gagal memperbarui status');
    }
  }

  async function handleLogout() {
    await logoutStaffAction('koki');
    router.push('/login');
  }

  interface MejaGroup {
    nomor_meja: string;
    pesanan_id?: string;
    tanggal?: string;
    items: any[];
  }

  const pesananByMejaMap = antrian.reduce<Record<string, MejaGroup>>((acc, item) => {
    const mejaNo = item.pesanan?.meja?.nomor_meja || '??';
    if (!acc[mejaNo]) {
      acc[mejaNo] = {
        nomor_meja: mejaNo,
        pesanan_id: item.pesanan?.id_pesanan,
        tanggal: item.pesanan?.tanggal,
        items: [],
      };
    }
    acc[mejaNo].items.push(item);
    return acc;
  }, {});

  const cardMejaList: MejaGroup[] = Object.values(pesananByMejaMap).sort((a, b) =>
    a.nomor_meja.localeCompare(b.nomor_meja, undefined, { numeric: true })
  );

  const totalMenunggu = antrian.length;
  const totalSelesaiHariIni = riwayat.length;

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-60 bg-[#1e2d42] text-white p-5 flex flex-col justify-between md:min-h-screen">
        <div className="space-y-6">
          {/* Brand */}
          <div className="flex items-center gap-3 pt-1">
            <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg p-1.5">
              <img src="/logo.png" alt="Pak Resto" className="w-full h-full object-contain" />
            </div>
            <div>
              <p className="font-black text-sm text-white tracking-wide">PAK RESTO</p>
              <p className="text-[10px] text-blue-300 font-semibold">Dapur / Koki</p>
            </div>
          </div>

          {/* Sapaan */}
          {session && (
            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
              <p className="text-[11px] text-blue-200">Logged in as</p>
              <p className="font-bold text-sm text-white">{session.nama_pegawai}</p>
            </div>
          )}

          {/* Stat mini */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-orange-500/20 border border-orange-400/20 rounded-xl p-3 text-center">
              <p className="text-xl font-black text-orange-300">{totalMenunggu}</p>
              <p className="text-[10px] text-orange-200 font-semibold">Antrian</p>
            </div>
            <div className="bg-emerald-500/20 border border-emerald-400/20 rounded-xl p-3 text-center">
              <p className="text-xl font-black text-emerald-300">{totalSelesaiHariIni}</p>
              <p className="text-[10px] text-emerald-200 font-semibold">Selesai</p>
            </div>
          </div>

          {/* Nav */}
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('ANTRIAN')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'ANTRIAN' ? 'bg-orange-500 text-white shadow-md' : 'text-blue-200 hover:bg-white/5'
              }`}
            >
              <Utensils className="w-4 h-4" /> Antrian Masakan
            </button>
            <button
              onClick={() => setActiveTab('RIWAYAT')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'RIWAYAT' ? 'bg-orange-500 text-white shadow-md' : 'text-blue-200 hover:bg-white/5'
              }`}
            >
              <History className="w-4 h-4" /> Riwayat Selesai
            </button>
          </nav>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:bg-red-500/10 hover:text-red-300 transition-all"
        >
          <LogOut className="w-4 h-4" /> Keluar
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-5 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-black text-slate-800">
              {activeTab === 'ANTRIAN' ? 'Antrian Masakan Dapur' : 'Riwayat Masakan Hari Ini'}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {activeTab === 'ANTRIAN'
                ? 'Pesanan pelanggan yang sudah dibayar dan perlu dimasak'
                : 'Masakan yang sudah selesai dikerjakan hari ini'}
            </p>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-500 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Perbarui
          </button>
        </div>

        {/* ANTRIAN TAB */}
        {activeTab === 'ANTRIAN' && (
          <>
            {cardMejaList.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
                <ChefHat className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <h3 className="font-bold text-slate-600 text-sm">Tidak ada antrian masakan</h3>
                <p className="text-xs text-slate-400 mt-1">Semua pesanan yang dibayar sudah selesai dimasak.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cardMejaList.map((card) => (
                  <div key={card.nomor_meja} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                    {/* Card Header */}
                    <div className="bg-[#1e2d42] px-4 py-3.5 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">Meja</p>
                        <h3 className="text-2xl font-black text-white">#{card.nomor_meja}</h3>
                      </div>
                      <div className="text-right">
                        <span className="inline-block bg-white/10 text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
                          {card.items.length} item
                        </span>
                        {card.tanggal && (
                          <p className="text-[10px] text-slate-400 mt-1">
                            {new Date(card.tanggal).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Items */}
                    <div className="divide-y divide-slate-50">
                      {card.items.map((item: any) => {
                        const isUpdating = updatingId === item.id_detail_pesanan;
                        return (
                          <div key={item.id_detail_pesanan} className="px-4 py-3.5">
                            <div className="flex items-start justify-between mb-2.5">
                              <div>
                                <p className="font-bold text-slate-800 text-sm">{item.menu?.nama_menu}</p>
                                <p className="text-xs text-orange-500 font-semibold">{item.jumlah} porsi</p>
                              </div>
                              <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                                Perlu Dimasak
                              </span>
                            </div>
                            <button
                              onClick={() => handleSelesaikan(item.id_detail_pesanan)}
                              disabled={isUpdating}
                              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-sm disabled:opacity-60"
                            >
                              {isUpdating ? (
                                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Tandai Selesai Dimasak
                                </>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* RIWAYAT TAB */}
        {activeTab === 'RIWAYAT' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-50 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Riwayat Masakan</h3>
              <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                {riwayat.length} item
              </span>
            </div>
            <div className="divide-y divide-slate-50">
              {riwayat.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">Belum ada masakan yang selesai hari ini.</p>
              ) : (
                riwayat.map((item) => (
                  <div key={item.id_detail_pesanan} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors">
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{item.menu?.nama_menu}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Meja #{item.pesanan?.meja?.nomor_meja} · {item.jumlah} porsi
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.status_item === 'Disajikan' ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                          <UtensilsCrossed className="w-3 h-3" /> Disajikan
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-100 px-2.5 py-1 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> Selesai
                        </span>
                      )}
                      {item.pesanan?.tanggal && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(item.pesanan.tanggal).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
