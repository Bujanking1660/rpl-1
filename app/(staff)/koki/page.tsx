'use client';

import { useState, useEffect } from 'react';
import { getAntrianKokiAction, updateStatusItemKokiAction, getRiwayatKokiAction } from '@/lib/actions/koki';
import { logoutStaffAction, getStaffSessionAction } from '@/lib/actions/auth';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { LayoutDashboard, ShoppingBag, History, Search, ArrowUpRight, LogOut, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { motion } from 'framer-motion';

export default function KokiPage() {
  const router = useRouter();

  const [session, setSession] = useState<any>(null);
  const [antrian, setAntrian] = useState<any[]>([]);
  const [riwayat, setRiwayat] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'PESANAN' | 'RIWAYAT'>('DASHBOARD');
  const [filterPesanan, setFilterPesanan] = useState<'Semua' | 'Baru' | 'Sedang Dimasak' | 'Siap Di Antar'>('Semua');
  const [searchQuery, setSearchQuery] = useState('');
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
      toast.success('Masakan ditandai Selesai!');
      fetchData();
    } else {
      toast.error(res.error || 'Gagal memperbarui status');
    }
  }

  async function handleLogout() {
    await logoutStaffAction('koki');
    router.push('/login');
  }

  const filteredAntrian = antrian.filter((item) => {
    const matchSearch = item.menu?.nama_menu?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        item.pesanan?.meja?.nomor_meja?.includes(searchQuery);
    return matchSearch;
  });

  return (
    <div className="min-h-screen bg-[#F4F6F9] flex flex-col md:flex-row text-slate-800">
      {/* Left Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 p-6 flex flex-col justify-between md:min-h-screen">
        <div className="space-y-8">
          {/* Logo Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-400 rounded-full flex items-center justify-center p-1.5 shadow-sm">
              <img src="/logo.png" alt="Pak Resto Logo" className="w-full h-full object-contain" />
            </div>
            <span className="font-extrabold text-lg tracking-wider text-[#FA6338] uppercase">
              PAK RESTO.
            </span>
          </div>

          {/* Navigation Links (Without Profile) */}
          <nav className="space-y-2">
            {[
              { key: 'DASHBOARD', label: 'DASHBOARD', icon: <LayoutDashboard className="w-4 h-4" /> },
              { key: 'PESANAN', label: 'PESANAN', icon: <ShoppingBag className="w-4 h-4" /> },
              { key: 'RIWAYAT', label: 'RIWAYAT', icon: <History className="w-4 h-4" /> },
            ].map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === key
                    ? 'text-[#FA6338] bg-orange-50 font-extrabold shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                {icon}
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-red-500 transition-colors cursor-pointer mt-6 md:mt-0"
        >
          <LogOut className="w-4 h-4" /> Log Out
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-10 space-y-6">
        {/* DASHBOARD TAB */}
        {activeTab === 'DASHBOARD' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <h1 className="text-2xl font-black text-[#2B4263]">
              Selamat Datang, {session?.nama_pegawai || 'Koki Andi'}
            </h1>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#1E293B] text-white rounded-3xl p-6 flex justify-between items-center shadow-lg">
                <div>
                  <p className="text-xs font-semibold opacity-80 mb-1">Pesanan Baru</p>
                  <p className="text-4xl font-extrabold">{antrian.length}</p>
                </div>
                <div className="w-12 h-12 bg-white text-slate-900 rounded-2xl flex items-center justify-center shadow-sm">
                  <ArrowUpRight className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white rounded-3xl p-6 flex justify-between items-center border border-slate-200 shadow-sm">
                <div>
                  <p className="text-xs font-semibold text-slate-400 mb-1">Sedang Dimasak</p>
                  <p className="text-4xl font-extrabold text-slate-800">
                    {antrian.filter(a => a.status_item === 'Diproses').length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-slate-200 text-slate-700 rounded-2xl flex items-center justify-center">
                  <ArrowUpRight className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white rounded-3xl p-6 flex justify-between items-center border border-slate-200 shadow-sm">
                <div>
                  <p className="text-xs font-semibold text-slate-400 mb-1">Selesai Hari Ini</p>
                  <p className="text-4xl font-extrabold text-slate-800">{riwayat.length}</p>
                </div>
                <div className="w-12 h-12 bg-slate-200 text-slate-700 rounded-2xl flex items-center justify-center">
                  <ArrowUpRight className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Pesanan Section */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-800">Pesanan Dapur</h2>
              <div className="flex gap-3">
                {['Semua', 'Baru', 'Sedang Dimasak', 'Siap Di Antar'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setFilterPesanan(tab as any)}
                    className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      filterPesanan === tab
                        ? 'bg-white text-slate-900 border-slate-300 shadow-xs'
                        : 'bg-transparent text-slate-400 border-transparent hover:text-slate-600'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Items Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {antrian.map((item) => (
                  <div key={item.id_detail_pesanan} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-[#FA6338]">Meja #{item.pesanan?.meja?.nomor_meja}</span>
                      <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-2.5 py-0.5 rounded-full">
                        {item.status_item}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">{item.menu?.nama_menu}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">{item.jumlah} porsi</p>
                    </div>
                    <button
                      onClick={() => handleSelesaikan(item.id_detail_pesanan)}
                      disabled={updatingId === item.id_detail_pesanan}
                      className="w-full py-2.5 bg-[#FA6338] hover:bg-orange-600 text-white rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-xs"
                    >
                      {updatingId === item.id_detail_pesanan ? 'Memproses...' : 'Tandai Selesai Dimasak'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* PESANAN TAB */}
        {activeTab === 'PESANAN' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-4 top-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari menu atau meja..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:outline-none"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase">
                    <th className="pb-3">No</th>
                    <th className="pb-3">Meja</th>
                    <th className="pb-3">Nama Menu</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredAntrian.map((item, idx) => (
                    <tr key={item.id_detail_pesanan}>
                      <td className="py-4">#{item.id_detail_pesanan.slice(0, 5)}</td>
                      <td className="py-4 font-bold">{item.pesanan?.meja?.nomor_meja}</td>
                      <td className="py-4">{item.menu?.nama_menu} ({item.jumlah}x)</td>
                      <td className="py-4">
                        <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md font-semibold text-[10px]">
                          {item.status_item}
                        </span>
                      </td>
                      <td className="py-4">
                        <button
                          onClick={() => handleSelesaikan(item.id_detail_pesanan)}
                          className="px-3 py-1.5 bg-[#FA6338] text-white rounded-lg font-bold hover:bg-orange-600 transition-all shadow-xs cursor-pointer"
                        >
                          Selesai
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* RIWAYAT TAB */}
        {activeTab === 'RIWAYAT' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-4 top-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari..."
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:outline-none"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase">
                    <th className="pb-3">Tanggal</th>
                    <th className="pb-3">No</th>
                    <th className="pb-3">Meja</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {riwayat.map((item) => (
                    <tr key={item.id_detail_pesanan}>
                      <td className="py-4">{item.pesanan?.tanggal ? new Date(item.pesanan.tanggal).toLocaleDateString('id-ID') : 'Hari ini'}</td>
                      <td className="py-4">#{item.id_detail_pesanan.slice(0, 5)}</td>
                      <td className="py-4 font-bold">{item.pesanan?.meja?.nomor_meja}</td>
                      <td className="py-4">
                        <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md font-semibold text-[10px]">
                          Selesai
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}


