'use client';

import { useState, useEffect } from 'react';
import { getAntrianKokiAction, updateStatusItemKokiAction, getRiwayatKokiAction } from '@/lib/actions/koki';
import { logoutStaffAction, getStaffSessionAction } from '@/lib/actions/auth';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { LayoutDashboard, ShoppingBag, History, Search, ArrowUpRight, LogOut, Clock, CheckCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

interface KokiItem {
  id_detail_pesanan: string;
  jumlah: number;
  status_item: string;
  menu?: { nama_menu?: string } | null;
  pesanan?: {
    id_pesanan: string;
    status: string;
    tanggal?: string | null;
    meja?: { nomor_meja?: string } | null;
  } | null;
}

export default function KokiPage() {
  const router = useRouter();

  const [session, setSession] = useState<{ nama_pegawai?: string } | null>(null);
  const [antrian, setAntrian] = useState<KokiItem[]>([]);
  const [riwayat, setRiwayat] = useState<KokiItem[]>([]);
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'PESANAN' | 'RIWAYAT'>('DASHBOARD');
  const [filterPesanan, setFilterPesanan] = useState<'Semua' | 'Baru' | 'Sedang Dimasak' | 'Siap Di Antar'>('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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

  useEffect(() => {
    const t = window.setTimeout(() => {
      loadSession();
      fetchData();
    }, 0);

    const supabase = createClient();
    const channel = supabase
      .channel('koki-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'detail_pesanan' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pesanan' }, () => fetchData())
      .subscribe();

    return () => {
      window.clearTimeout(t);
      supabase.removeChannel(channel);
    };
  }, []);

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

  const menuItems: { key: 'DASHBOARD' | 'PESANAN' | 'RIWAYAT'; label: string; icon: React.ReactNode }[] = [
    { key: 'DASHBOARD', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { key: 'PESANAN', label: 'Pesanan', icon: <ShoppingBag className="w-4 h-4" /> },
    { key: 'RIWAYAT', label: 'Riwayat', icon: <History className="w-4 h-4" /> },
  ];

  const stats = [
    { label: 'Pesanan Baru', value: antrian.length, icon: <ArrowUpRight className="w-5 h-5" />, theme: 'bg-gradient-to-br from-[#2B4263] to-[#355070] text-white' },
    { label: 'Sedang Dimasak', value: antrian.filter(a => a.status_item === 'Diproses').length, icon: <Clock className="w-5 h-5" />, theme: 'bg-white text-slate-800 border border-slate-100' },
    { label: 'Selesai Hari Ini', value: riwayat.length, icon: <CheckCheck className="w-5 h-5" />, theme: 'bg-white text-slate-800 border border-slate-100' },
  ];

  return (
    <div className="min-h-screen app-bg flex flex-col md:flex-row text-slate-800">
      {/* Left Sidebar */}
      <aside className="w-full md:w-64 bg-white/80 backdrop-blur-xl border-r border-slate-200/70 p-6 flex flex-col justify-between md:min-h-screen shadow-sm">
        <div className="space-y-8">
          {/* Logo Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-[#2B4263] to-[#355070] rounded-2xl flex items-center justify-center p-1.5 shadow-md">
              <img src="/logo.png" alt="Pak Resto Logo" className="w-full h-full object-contain" />
            </div>
            <span className="font-extrabold text-lg tracking-wide text-[#2B4263] uppercase">
              Pak Resto.
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-2">
            {menuItems.map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === key
                    ? 'bg-[#2B4263] text-white shadow-md'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
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
        <AnimatePresence mode="wait">
          {activeTab === 'DASHBOARD' && (
            <motion.div key="dash" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
              <div>
                <h1 className="text-2xl font-black text-[#2B4263]">
                  Selamat Datang, {session?.nama_pegawai || 'Koki'}
                </h1>
                <p className="text-xs text-slate-400 mt-1">Ringkasan aktivitas dapur hari ini</p>
              </div>

              {/* Stat Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {stats.map(({ label, value, icon, theme }) => (
                  <div key={label} className={`rounded-3xl p-6 flex justify-between items-center shadow-sm ${theme}`}>
                    <div>
                      <p className="text-xs font-semibold opacity-70 mb-1">{label}</p>
                      <p className="text-4xl font-extrabold">{value}</p>
                    </div>
                    <div className="w-12 h-12 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center">
                      {icon}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pesanan Section */}
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-slate-800">Pesanan Dapur</h2>
                <div className="flex gap-2 flex-wrap">
                  {['Semua', 'Baru', 'Sedang Dimasak', 'Siap Di Antar'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setFilterPesanan(tab as 'Semua' | 'Baru' | 'Sedang Dimasak' | 'Siap Di Antar')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        filterPesanan === tab
                          ? 'bg-[#2B4263] text-white shadow-md'
                          : 'bg-white text-slate-400 border border-slate-100 hover:text-slate-600'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Items Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {antrian.map((item) => (
                    <div key={item.id_detail_pesanan} className="card p-5 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-[#2B4263]">Meja #{item.pesanan?.meja?.nomor_meja}</span>
                        <span className="text-[10px] font-semibold bg-[#FFF0EB] text-[#FA6338] px-2.5 py-0.5 rounded-full">
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
                        className="w-full py-2.5 bg-[#2B4263] hover:bg-[#1f3049] disabled:opacity-50 text-white rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-md"
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
            <motion.div key="pesanan" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="card p-6 space-y-5">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-4 top-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari menu atau meja..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-field pl-11"
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
                      <th className="pb-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredAntrian.map((item) => (
                      <tr key={item.id_detail_pesanan}>
                        <td className="py-4 text-slate-400">#{item.id_detail_pesanan.slice(0, 5)}</td>
                        <td className="py-4 font-bold text-[#2B4263]">{item.pesanan?.meja?.nomor_meja}</td>
                        <td className="py-4">{item.menu?.nama_menu} ({item.jumlah}x)</td>
                        <td className="py-4">
                          <span className="bg-[#FFF0EB] text-[#FA6338] px-2 py-0.5 rounded-md font-semibold text-[10px]">
                            {item.status_item}
                          </span>
                        </td>
                        <td className="py-4 text-right">
                          <button
                            onClick={() => handleSelesaikan(item.id_detail_pesanan)}
                            className="px-3 py-1.5 bg-[#2B4263] hover:bg-[#1f3049] text-white rounded-lg font-bold transition-all cursor-pointer"
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
            <motion.div key="riwayat" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="card p-6 space-y-5">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-4 top-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari..."
                  className="input-field pl-11"
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
                        <td className="py-4 text-slate-500">{item.pesanan?.tanggal ? new Date(item.pesanan.tanggal).toLocaleDateString('id-ID') : 'Hari ini'}</td>
                        <td className="py-4 text-slate-400">#{item.id_detail_pesanan.slice(0, 5)}</td>
                        <td className="py-4 font-bold text-[#2B4263]">{item.pesanan?.meja?.nomor_meja}</td>
                        <td className="py-4">
                          <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md font-semibold text-[10px]">
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
        </AnimatePresence>
      </main>
    </div>
  );
}
