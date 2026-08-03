'use client';

import { useState, useEffect } from 'react';
import {
  getDashboardStatsAction,
  getLaporanTransaksiAction,
  getPegawaiListAction,
  createPegawaiAction,
  updatePegawaiAction,
  deletePegawaiAction,
  getMenuListAction,
  createMenuAction,
  updateMenuAction,
  deleteMenuAction,
  createMejaAction,
  updateMejaAction,
  deleteMejaAction,
} from '@/lib/actions/manager';
import { getMejaListAction } from '@/lib/actions/pelayan';
import { logoutStaffAction } from '@/lib/actions/auth';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { LayoutDashboard, Users, Utensils, Table, FileText, Plus, Edit2, Trash2, LogOut, X, ArrowUpRight, TrendingUp, TrendingDown, Calendar, Search } from 'lucide-react';
import { PeranPegawai, StatusMenu, StatusMeja } from '@/lib/types/database';
import { motion, AnimatePresence } from 'framer-motion';

interface DashboardStats {
  totalPegawai: number;
  totalPemasukan: number;
  totalOrderKonfirmasi: number;
  avgOrderValue: number;
  tunaiCount: number;
  qrisCount: number;
  totalMeja: number;
  mejaTerisi: number;
  mejaTersedia: number;
  okupansiPersen: number;
  topMenu: { nama: string; kategori: string; total: number }[];
  roleDistribusi: { role: string; count: number }[];
  revenueChartData: { hari: string; total: number }[];
  pendapatanHariIni: number;
  pendapatanKemarin: number;
  pendapatanMingguIni: number;
  growthHarian: number;
}

interface PegawaiRow {
  id_pegawai: string;
  nama_pegawai: string;
  peran: string;
  username: string;
}

interface MenuRow {
  id_menu: string;
  nama_menu: string;
  kategori: string;
  harga: number;
  status_ketersediaan: string;
}

interface MejaRow {
  id_meja: string;
  nomor_meja: string;
  kapasitas: number;
  status_ketersediaan: string;
}

interface LaporanRow {
  id_pembayaran: string;
  total_bayar: number;
  metode_pembayaran: string;
  waktu_konfirmasi: string | null;
  pesanan?: { meja?: { nomor_meja?: string } | null } | null;
}

export default function ManagerPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'USER' | 'MENU' | 'MEJA' | 'LAPORAN'>('DASHBOARD');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Data lists
  const [pegawaiList, setPegawaiList] = useState<PegawaiRow[]>([]);
  const [menuList, setMenuList] = useState<MenuRow[]>([]);
  const [mejaList, setMejaList] = useState<MejaRow[]>([]);
  const [laporanList, setLaporanList] = useState<LaporanRow[]>([]);
  const [laporanLoading, setLaporanLoading] = useState(false);
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');
  const [loading, setLoading] = useState(false);

  // Modals state
  const [showModal, setShowModal] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<PegawaiRow | MenuRow | MejaRow | null>(null);

  // Form states
  const [userForm, setUserForm] = useState({ nama: '', peran: 'pelayan' as PeranPegawai, username: '', password: '' });
  const [menuForm, setMenuForm] = useState({ nama: '', harga: 15000, kategori: 'Makanan', status: 'tersedia' as StatusMenu });
  const [mejaForm, setMejaForm] = useState({ nomor: '', kapasitas: 4, status: 'tersedia' as StatusMeja });

  useEffect(() => {
    fetchStats();
    fetchPegawai();
    fetchMenu();
    fetchMeja();
    fetchLaporan();
  }, []);

  async function fetchStats() {
    setStatsLoading(true);
    const data = await getDashboardStatsAction();
    if (data) setStats(data);
    setStatsLoading(false);
  }

  async function fetchPegawai() {
    const res = await getPegawaiListAction();
    if (res.success && res.data) setPegawaiList(res.data);
  }

  async function fetchMenu() {
    const res = await getMenuListAction();
    if (res.success && res.data) setMenuList(res.data);
  }

  async function fetchMeja() {
    const res = await getMejaListAction();
    if (res.success && res.data) setMejaList(res.data);
  }

  async function fetchLaporan(start?: string, end?: string) {
    setLaporanLoading(true);
    const res = await getLaporanTransaksiAction(start, end);
    if (res.success && res.data) setLaporanList(res.data);
    setLaporanLoading(false);
  }

  async function handleLogout() {
    await logoutStaffAction();
    router.push('/login');
  }

  // Handle Save Pegawai
  async function handleSaveUser(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    let res;
    if (editingItem && 'id_pegawai' in editingItem) {
      res = await updatePegawaiAction(editingItem.id_pegawai, userForm.nama, userForm.peran, userForm.username, userForm.password);
    } else {
      res = await createPegawaiAction(userForm.nama, userForm.peran, userForm.username, userForm.password || 'password123');
    }
    setLoading(false);
    if (res.success) {
      toast.success(editingItem ? 'Pegawai berhasil diupdate' : 'Pegawai baru berhasil ditambahkan');
      setShowModal(null);
      fetchPegawai();
      fetchStats();
    } else {
      toast.error(res.error || 'Gagal menyimpan pegawai');
    }
  }

  // Handle Save Menu
  async function handleSaveMenu(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    let res;
    if (editingItem && 'id_menu' in editingItem) {
      res = await updateMenuAction(editingItem.id_menu, menuForm.nama, menuForm.harga, menuForm.kategori, menuForm.status);
    } else {
      res = await createMenuAction(menuForm.nama, menuForm.harga, menuForm.kategori, menuForm.status);
    }
    setLoading(false);
    if (res.success) {
      toast.success('Menu berhasil disimpan');
      setShowModal(null);
      fetchMenu();
    } else {
      toast.error(res.error || 'Gagal menyimpan menu');
    }
  }

  // Handle Save Meja
  async function handleSaveMeja(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    let res;
    if (editingItem && 'id_meja' in editingItem) {
      res = await updateMejaAction(editingItem.id_meja, mejaForm.nomor, mejaForm.kapasitas, mejaForm.status);
    } else {
      res = await createMejaAction(mejaForm.nomor, mejaForm.kapasitas);
    }
    setLoading(false);
    if (res.success) {
      toast.success('Meja berhasil disimpan');
      setShowModal(null);
      fetchMeja();
    } else {
      toast.error(res.error || 'Gagal menyimpan meja');
    }
  }

  const ROLE_COLORS: Record<string, string> = {
    pelayan: '#2B4263',
    kasir: '#FA6338',
    koki: '#355070',
    manajer: '#FBB040',
  };

  function formatRupiah(val: number) {
    if (val >= 1_000_000_000) return `Rp ${(val / 1_000_000_000).toFixed(1)}M`;
    if (val >= 1_000_000) return `Rp ${(val / 1_000_000).toFixed(1)}jt`;
    if (val >= 1_000) return `Rp ${(val / 1_000).toFixed(0)}rb`;
    return `Rp ${val.toLocaleString('id-ID')}`;
  }

  const navItems: { key: 'DASHBOARD' | 'USER' | 'MENU' | 'MEJA' | 'LAPORAN'; label: string; icon: React.ReactNode }[] = [
    { key: 'DASHBOARD', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { key: 'USER', label: 'Kelola User', icon: <Users className="w-4 h-4" /> },
    { key: 'MENU', label: 'Kelola Menu', icon: <Utensils className="w-4 h-4" /> },
    { key: 'MEJA', label: 'Kelola Meja', icon: <Table className="w-4 h-4" /> },
    { key: 'LAPORAN', label: 'Laporan', icon: <FileText className="w-4 h-4" /> },
  ];

  const modalConfig: Record<string, { title: string; editingTitle: string }> = {
    USER: { title: 'Tambah Pegawai', editingTitle: 'Edit Pegawai' },
    MENU: { title: 'Tambah Menu', editingTitle: 'Edit Menu' },
    MEJA: { title: 'Tambah Meja', editingTitle: 'Edit Meja' },
  };

  return (
    <div className="min-h-screen app-bg flex flex-col md:flex-row text-slate-800">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-white/80 backdrop-blur-xl border-r border-slate-200/70 p-6 flex flex-col justify-between md:min-h-screen shadow-sm">
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-[#2B4263] to-[#355070] rounded-2xl flex items-center justify-center p-1.5 shadow-md">
              <img src="/logo.png" alt="Pak Resto Logo" className="w-full h-full object-contain" />
            </div>
            <span className="font-extrabold text-lg tracking-wide text-[#2B4263] uppercase">
              Pak Resto.
            </span>
          </div>

          <nav className="space-y-2">
            {navItems.map(({ key, label, icon }) => (
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
        <AnimatePresence mode="wait">
          {/* DASHBOARD TAB */}
          {activeTab === 'DASHBOARD' && (
            <motion.div key="dash" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              {statsLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="w-10 h-10 border-4 border-[#2B4263] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  {/* Page Header */}
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-800">Dashboard Strategis</h2>
                    <p className="text-xs text-slate-400 mt-1">Ringkasan kinerja bisnis secara real-time</p>
                  </div>

                  {/* KPI Cards Row 1 */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="col-span-2 bg-gradient-to-br from-[#2B4263] to-[#355070] text-white rounded-3xl p-6 flex justify-between items-center shadow-md">
                      <div>
                        <p className="text-xs font-semibold opacity-70 mb-1">Total Pemasukan</p>
                        <p className="text-3xl md:text-4xl font-extrabold">{formatRupiah(stats?.totalPemasukan || 0)}</p>
                        <p className="text-xs opacity-60 mt-1">dari {stats?.totalOrderKonfirmasi || 0} transaksi terkonfirmasi</p>
                      </div>
                      <div className="w-12 h-12 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                        <ArrowUpRight className="w-6 h-6" />
                      </div>
                    </div>

                    <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
                      <p className="text-xs font-semibold text-slate-400 mb-1">Rata-rata Nilai Order</p>
                      <p className="text-2xl font-extrabold text-[#FA6338]">{formatRupiah(stats?.avgOrderValue || 0)}</p>
                      <p className="text-xs text-slate-400 mt-1">per transaksi</p>
                    </div>

                    <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
                      <p className="text-xs font-semibold text-slate-400 mb-1">Total Pegawai</p>
                      <p className="text-2xl font-extrabold text-[#2B4263]">{stats?.totalPegawai || 0}</p>
                      <p className="text-xs text-slate-400 mt-1">aktif di sistem</p>
                    </div>
                  </div>

                  {/* KPI Cards Row 2 */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="col-span-2 bg-gradient-to-br from-[#FA6338] to-[#FF8B6B] text-white rounded-3xl p-5 shadow-md">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs font-semibold opacity-80 mb-1">Pendapatan Hari Ini</p>
                          <p className="text-3xl font-extrabold">{formatRupiah(stats?.pendapatanHariIni || 0)}</p>
                          <p className="text-xs opacity-70 mt-1">dibanding kemarin: {formatRupiah(stats?.pendapatanKemarin || 0)}</p>
                        </div>
                        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                          (stats?.growthHarian || 0) >= 0 ? 'bg-white/20 text-white' : 'bg-black/20 text-white'
                        }`}>
                          {(stats?.growthHarian || 0) >= 0
                            ? <TrendingUp className="w-3.5 h-3.5" />
                            : <TrendingDown className="w-3.5 h-3.5" />}
                          {Math.abs(stats?.growthHarian || 0)}%
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
                      <p className="text-xs font-semibold text-slate-400 mb-1">Pendapatan Minggu Ini</p>
                      <p className="text-2xl font-extrabold text-[#2B4263]">{formatRupiah(stats?.pendapatanMingguIni || 0)}</p>
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-1"><Calendar className="w-3 h-3" />minggu berjalan</p>
                    </div>

                    <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
                      <p className="text-xs font-semibold text-slate-400 mb-1">Meja Terisi</p>
                      <p className="text-2xl font-extrabold text-slate-800">{stats?.mejaTerisi || 0}<span className="text-sm font-medium text-slate-400"> / {stats?.totalMeja || 0}</span></p>
                      <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#2B4263] rounded-full transition-all"
                          style={{ width: `${stats?.okupansiPersen || 0}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-400 mt-1">Okupansi {stats?.okupansiPersen || 0}%</p>
                    </div>
                  </div>

                  {/* KPI Cards Row 3 */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
                      <p className="text-xs font-semibold text-slate-400 mb-1">Meja Tersedia</p>
                      <p className="text-2xl font-extrabold text-emerald-500">{stats?.mejaTersedia ?? 0}</p>
                      <p className="text-xs text-slate-400 mt-1">siap digunakan</p>
                    </div>
                    <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
                      <p className="text-xs font-semibold text-slate-400 mb-1">Bayar Tunai</p>
                      <p className="text-2xl font-extrabold text-slate-800">{stats?.tunaiCount || 0}</p>
                      <p className="text-xs text-slate-400 mt-1">transaksi</p>
                    </div>
                    <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
                      <p className="text-xs font-semibold text-slate-400 mb-1">Bayar QRIS</p>
                      <p className="text-2xl font-extrabold text-[#FA6338]">{stats?.qrisCount || 0}</p>
                      <p className="text-xs text-slate-400 mt-1">transaksi</p>
                    </div>
                    <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
                      <p className="text-xs font-semibold text-slate-400 mb-1">Rata-rata Nilai Order</p>
                      <p className="text-2xl font-extrabold text-[#FA6338]">{formatRupiah(stats?.avgOrderValue || 0)}</p>
                      <p className="text-xs text-slate-400 mt-1">per transaksi</p>
                    </div>
                  </div>

                  {/* Charts Row */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                      <h3 className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Pendapatan 7 Hari Terakhir</h3>
                      <p className="text-xs text-slate-300 mb-5">Nilai transaksi terkonfirmasi per hari</p>
                      <div className="h-52">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={stats?.revenueChartData || []}>
                            <XAxis dataKey="hari" stroke="#94a3b8" fontSize={9} />
                            <YAxis stroke="#94a3b8" fontSize={9} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}rb` : v} />
                            <Tooltip formatter={(v) => [`Rp ${Number(v).toLocaleString('id-ID')}`, 'Pendapatan']} />
                            <Bar dataKey="total" fill="#2B4263" radius={[6, 6, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Role Distribution Pie */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                      <h3 className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Distribusi Pegawai</h3>
                      <p className="text-xs text-slate-300 mb-3">Per peran / jabatan</p>
                      <div className="h-36">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={(stats?.roleDistribusi || []).filter((r) => r.count > 0)}
                              innerRadius={30}
                              outerRadius={55}
                              paddingAngle={3}
                              dataKey="count"
                              nameKey="role"
                            >
                              {(stats?.roleDistribusi || []).map((entry) => (
                                <Cell key={entry.role} fill={ROLE_COLORS[entry.role] || '#ccc'} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(v, name) => [v, String(name ?? '')]} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="mt-2 space-y-1">
                        {(stats?.roleDistribusi || []).map((r) => (
                          <div key={r.role} className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-1.5 capitalize text-slate-600">
                              <span className="w-2 h-2 rounded-full" style={{ background: ROLE_COLORS[r.role] }} />
                              {r.role}
                            </span>
                            <span className="font-bold text-slate-800">{r.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Top 5 Menu Terlaris */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Menu Terlaris</h3>
                    <p className="text-xs text-slate-300 mb-5">Top 5 menu berdasarkan total kuantitas dipesan</p>
                    {(stats?.topMenu || []).length === 0 ? (
                      <p className="text-xs text-slate-300 italic">Belum ada data pesanan.</p>
                    ) : (
                      <div className="space-y-3">
                        {(stats?.topMenu || []).map((m, i) => {
                          const maxVal = stats?.topMenu[0]?.total || 1;
                          const pct = Math.round((m.total / maxVal) * 100);
                          return (
                            <div key={m.nama}>
                              <div className="flex justify-between items-center mb-1">
                                <span className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 font-bold text-[10px] flex items-center justify-center">{i + 1}</span>
                                  {m.nama}
                                  <span className="text-[10px] text-slate-400 font-normal capitalize">{m.kategori}</span>
                                </span>
                                <span className="text-xs font-bold text-[#FA6338]">{m.total}x</span>
                              </div>
                              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{ width: `${pct}%`, background: i === 0 ? '#FA6338' : '#2B4263' }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* KELOLA USER TAB */}
          {activeTab === 'USER' && (
            <motion.div key="user" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="card p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span>Show {pegawaiList.length} data</span>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" placeholder="Cari..." className="input-field !py-2 !pl-9 !text-xs max-w-[180px]" />
                  </div>
                </div>
                <button
                  onClick={() => {
                    setEditingItem(null);
                    setUserForm({ nama: '', peran: 'pelayan', username: '', password: '' });
                    setShowModal('USER');
                  }}
                  className="btn-primary"
                >
                  <Plus className="w-4 h-4" /> Tambah User
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase">
                      <th className="pb-3">User Id</th>
                      <th className="pb-3">Username</th>
                      <th className="pb-3">Nama User</th>
                      <th className="pb-3">Role</th>
                      <th className="pb-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {pegawaiList.map((p) => (
                      <tr key={p.id_pegawai}>
                        <td className="py-4 text-slate-400">#{p.id_pegawai.slice(0, 5)}</td>
                        <td className="py-4 font-semibold">{p.username}</td>
                        <td className="py-4 font-bold text-slate-800">{p.nama_pegawai}</td>
                        <td className="py-4 uppercase text-[10px] font-bold text-[#2B4263]">{p.peran}</td>
                        <td className="py-4 text-right">
                          <button
                            onClick={() => {
                              setEditingItem(p);
                              setUserForm({ nama: p.nama_pegawai, peran: p.peran as PeranPegawai, username: p.username, password: '' });
                              setShowModal('USER');
                            }}
                            className="p-1.5 text-[#2B4263] hover:bg-[#EEF2F8] rounded-lg mr-1 cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm(`Hapus user ${p.nama_pegawai}?`)) {
                                await deletePegawaiAction(p.id_pegawai);
                                toast.success('User dihapus');
                                fetchPegawai();
                              }
                            }}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* KELOLA MENU TAB */}
          {activeTab === 'MENU' && (
            <motion.div key="menu" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="card p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span>Show {menuList.length} data</span>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" placeholder="Cari..." className="input-field !py-2 !pl-9 !text-xs max-w-[180px]" />
                  </div>
                </div>
                <button
                  onClick={() => {
                    setEditingItem(null);
                    setMenuForm({ nama: '', harga: 15000, kategori: 'Makanan', status: 'tersedia' });
                    setShowModal('MENU');
                  }}
                  className="btn-primary"
                >
                  <Plus className="w-4 h-4" /> Tambah Menu
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase">
                      <th className="pb-3">Menu Id</th>
                      <th className="pb-3">Nama menu</th>
                      <th className="pb-3">Kategori</th>
                      <th className="pb-3">Harga</th>
                      <th className="pb-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {menuList.map((m) => (
                      <tr key={m.id_menu}>
                        <td className="py-4 text-slate-400">#{m.id_menu.slice(0, 5)}</td>
                        <td className="py-4 font-bold text-slate-800">{m.nama_menu}</td>
                        <td className="py-4">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 capitalize">{m.kategori}</span>
                        </td>
                        <td className="py-4 font-bold text-[#2B4263]">Rp {Number(m.harga).toLocaleString('id-ID')}</td>
                        <td className="py-4 text-right">
                          <button
                            onClick={() => {
                              setEditingItem(m);
                              setMenuForm({ nama: m.nama_menu, harga: Number(m.harga), kategori: m.kategori, status: m.status_ketersediaan as StatusMenu });
                              setShowModal('MENU');
                            }}
                            className="p-1.5 text-[#2B4263] hover:bg-[#EEF2F8] rounded-lg mr-1 cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm(`Hapus menu ${m.nama_menu}?`)) {
                                await deleteMenuAction(m.id_menu);
                                toast.success('Menu dihapus');
                                fetchMenu();
                              }
                            }}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* KELOLA MEJA TAB */}
          {activeTab === 'MEJA' && (
            <motion.div key="meja" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="card p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span>Show {mejaList.length} data</span>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" placeholder="Cari..." className="input-field !py-2 !pl-9 !text-xs max-w-[180px]" />
                  </div>
                </div>
                <button
                  onClick={() => {
                    setEditingItem(null);
                    setMejaForm({ nomor: '', kapasitas: 4, status: 'tersedia' });
                    setShowModal('MEJA');
                  }}
                  className="btn-primary"
                >
                  <Plus className="w-4 h-4" /> Tambah Meja
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase">
                      <th className="pb-3">Meja Id</th>
                      <th className="pb-3">Nomor Meja</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {mejaList.map((m) => (
                      <tr key={m.id_meja}>
                        <td className="py-4 text-slate-400">#{m.id_meja.slice(0, 5)}</td>
                        <td className="py-4 font-extrabold text-[#2B4263]">{m.nomor_meja}</td>
                        <td className="py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            m.status_ketersediaan === 'tersedia' ? 'bg-emerald-50 text-emerald-600' : 'bg-[#FFF0EB] text-[#FA6338]'
                          }`}>
                            {m.status_ketersediaan}
                          </span>
                        </td>
                        <td className="py-4 text-right">
                          <button
                            onClick={() => {
                              setEditingItem(m);
                              setMejaForm({ nomor: m.nomor_meja, kapasitas: m.kapasitas, status: m.status_ketersediaan as StatusMeja });
                              setShowModal('MEJA');
                            }}
                            className="p-1.5 text-[#2B4263] hover:bg-[#EEF2F8] rounded-lg mr-1 cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm(`Hapus Meja ${m.nomor_meja}?`)) {
                                await deleteMejaAction(m.id_meja);
                                toast.success('Meja dihapus');
                                fetchMeja();
                              }
                            }}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* LAPORAN TAB */}
          {activeTab === 'LAPORAN' && (
            <motion.div key="laporan" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="card p-6 space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-extrabold text-slate-800">Laporan Transaksi</h2>
                  <p className="text-xs text-slate-400 mt-0.5">50 transaksi terkonfirmasi terbaru</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 text-xs">
                    <label className="text-slate-400 font-semibold">Dari</label>
                    <input
                      type="date"
                      value={filterStart}
                      onChange={(e) => setFilterStart(e.target.value)}
                      className="input-field !py-2 !text-xs max-w-[150px]"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <label className="text-slate-400 font-semibold">Sampai</label>
                    <input
                      type="date"
                      value={filterEnd}
                      onChange={(e) => setFilterEnd(e.target.value)}
                      className="input-field !py-2 !text-xs max-w-[150px]"
                    />
                  </div>
                  <button
                    onClick={() => fetchLaporan(
                      filterStart ? new Date(filterStart).toISOString() : undefined,
                      filterEnd ? new Date(filterEnd + 'T23:59:59').toISOString() : undefined
                    )}
                    className="btn-primary !py-2"
                  >
                    Filter
                  </button>
                  <button
                    onClick={() => { setFilterStart(''); setFilterEnd(''); fetchLaporan(); }}
                    className="btn-ghost !py-2"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Summary strip */}
              {laporanList.length > 0 && (
                <div className="flex flex-wrap gap-3">
                  <div className="px-4 py-2 bg-slate-50 rounded-2xl text-xs border border-slate-100">
                    <span className="text-slate-400">Total Transaksi: </span>
                    <span className="font-extrabold text-slate-800">{laporanList.length}</span>
                  </div>
                  <div className="px-4 py-2 bg-[#FFF0EB] rounded-2xl text-xs border border-[#FBD9CC]">
                    <span className="text-slate-400">Total Pendapatan: </span>
                    <span className="font-extrabold text-[#FA6338]">
                      {formatRupiah(laporanList.reduce((s, l) => s + Number(l.total_bayar || 0), 0))}
                    </span>
                  </div>
                  <div className="px-4 py-2 bg-slate-50 rounded-2xl text-xs border border-slate-100">
                    <span className="text-slate-400">Tunai: </span>
                    <span className="font-extrabold text-slate-800">{laporanList.filter(l => l.metode_pembayaran === 'tunai').length}x</span>
                  </div>
                  <div className="px-4 py-2 bg-slate-50 rounded-2xl text-xs border border-slate-100">
                    <span className="text-slate-400">QRIS: </span>
                    <span className="font-extrabold text-[#FA6338]">{laporanList.filter(l => l.metode_pembayaran === 'qr_gopay').length}x</span>
                  </div>
                </div>
              )}

              {laporanLoading ? (
                <div className="flex items-center justify-center h-40">
                  <div className="w-8 h-8 border-4 border-[#2B4263] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase">
                        <th className="pb-3">#</th>
                        <th className="pb-3">Meja</th>
                        <th className="pb-3">Metode</th>
                        <th className="pb-3">Total Bayar</th>
                        <th className="pb-3">Waktu Konfirmasi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {laporanList.length === 0 ? (
                        <tr><td colSpan={5} className="py-8 text-center text-slate-300 italic">Belum ada data transaksi terkonfirmasi.</td></tr>
                      ) : laporanList.map((l, idx: number) => (
                        <tr key={l.id_pembayaran}>
                          <td className="py-3 text-slate-400">{idx + 1}</td>
                          <td className="py-3 font-extrabold text-[#2B4263]">
                            Meja {l.pesanan?.meja?.nomor_meja ?? '—'}
                          </td>
                          <td className="py-3">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                              l.metode_pembayaran === 'tunai' ? 'bg-[#FFF0EB] text-[#FA6338]' : 'bg-[#EEF2F8] text-[#2B4263]'
                            }`}>
                              {l.metode_pembayaran === 'qr_gopay' ? 'QRIS' : 'Tunai'}
                            </span>
                          </td>
                          <td className="py-3 font-bold text-[#2B4263]">{formatRupiah(Number(l.total_bayar))}</td>
                          <td className="py-3 text-slate-500">
                            {l.waktu_konfirmasi
                              ? new Date(l.waktu_konfirmasi).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                              : '—'
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* MODAL SHEETS */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowModal(null)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-800">
                  {modalConfig[showModal][editingItem ? 'editingTitle' : 'title']}
                </h3>
                <button onClick={() => setShowModal(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {showModal === 'USER' && (
                <form onSubmit={handleSaveUser} className="space-y-4 text-xs font-semibold text-slate-600">
                  <div>
                    <label className="block mb-1.5">Nama Pegawai</label>
                    <input
                      type="text"
                      required
                      value={userForm.nama}
                      onChange={(e) => setUserForm({ ...userForm, nama: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block mb-1.5">Role (Peran)</label>
                    <select
                      value={userForm.peran}
                      onChange={(e) => setUserForm({ ...userForm, peran: e.target.value as PeranPegawai })}
                      className="input-field"
                    >
                      <option value="pelayan">Pelayan</option>
                      <option value="kasir">Kasir</option>
                      <option value="koki">Koki</option>
                      <option value="manajer">Manajer</option>
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1.5">Username</label>
                    <input
                      type="text"
                      required
                      value={userForm.username}
                      onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block mb-1.5">Password</label>
                    <input
                      type="password"
                      value={userForm.password}
                      onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <button type="submit" disabled={loading} className="btn-primary w-full !py-3.5">
                    Simpan Pegawai
                  </button>
                </form>
              )}

              {showModal === 'MENU' && (
                <form onSubmit={handleSaveMenu} className="space-y-4 text-xs font-semibold text-slate-600">
                  <div>
                    <label className="block mb-1.5">Nama Menu</label>
                    <input
                      type="text"
                      required
                      value={menuForm.nama}
                      onChange={(e) => setMenuForm({ ...menuForm, nama: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block mb-1.5">Harga (Rp)</label>
                    <input
                      type="number"
                      required
                      value={menuForm.harga}
                      onChange={(e) => setMenuForm({ ...menuForm, harga: Number(e.target.value) })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block mb-1.5">Kategori</label>
                    <select
                      value={menuForm.kategori}
                      onChange={(e) => setMenuForm({ ...menuForm, kategori: e.target.value })}
                      className="input-field"
                    >
                      <option value="Makanan">Makanan</option>
                      <option value="Minuman">Minuman</option>
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1.5">Status Ketersediaan</label>
                    <select
                      value={menuForm.status}
                      onChange={(e) => setMenuForm({ ...menuForm, status: e.target.value as StatusMenu })}
                      className="input-field"
                    >
                      <option value="tersedia">Tersedia</option>
                      <option value="habis">Habis</option>
                    </select>
                  </div>
                  <button type="submit" disabled={loading} className="btn-primary w-full !py-3.5">
                    Simpan Menu
                  </button>
                </form>
              )}

              {showModal === 'MEJA' && (
                <form onSubmit={handleSaveMeja} className="space-y-4 text-xs font-semibold text-slate-600">
                  <div>
                    <label className="block mb-1.5">Nomor Meja</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: 11"
                      value={mejaForm.nomor}
                      onChange={(e) => setMejaForm({ ...mejaForm, nomor: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block mb-1.5">Kapasitas (Orang)</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={mejaForm.kapasitas}
                      onChange={(e) => setMejaForm({ ...mejaForm, kapasitas: Number(e.target.value) })}
                      className="input-field"
                    />
                  </div>
                  <button type="submit" disabled={loading} className="btn-primary w-full !py-3.5">
                    Simpan Meja
                  </button>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
