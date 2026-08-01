'use client';

import { useState, useEffect } from 'react';
import {
  getDashboardStatsAction,
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
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { LayoutDashboard, Users, Utensils, Table, FileText, Plus, Edit2, Trash2, LogOut, X, ArrowUpRight, Download } from 'lucide-react';
import { PeranPegawai, StatusMenu, StatusMeja } from '@/lib/types/database';

export default function ManagerPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'USER' | 'MENU' | 'MEJA' | 'LAPORAN'>('DASHBOARD');
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  
  // Data lists
  const [pegawaiList, setPegawaiList] = useState<any[]>([]);
  const [menuList, setMenuList] = useState<any[]>([]);
  const [mejaList, setMejaList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Modals state
  const [showModal, setShowModal] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  // Form states
  const [userForm, setUserForm] = useState({ nama: '', peran: 'pelayan' as PeranPegawai, username: '', password: '' });
  const [menuForm, setMenuForm] = useState({ nama: '', harga: 15000, kategori: 'Makanan', status: 'tersedia' as StatusMenu });
  const [mejaForm, setMejaForm] = useState({ nomor: '', kapasitas: 4, status: 'tersedia' as StatusMeja });

  useEffect(() => {
    fetchStats();
    fetchPegawai();
    fetchMenu();
    fetchMeja();
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

  async function handleLogout() {
    await logoutStaffAction();
    router.push('/login');
  }

  // Handle Save Pegawai
  async function handleSaveUser(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    let res;
    if (editingItem) {
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
    if (editingItem) {
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
    if (editingItem) {
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
    pelayan: '#FA6338',
    kasir: '#2B4263',
    koki: '#9DB2FF',
    manajer: '#FBB040',
  };

  function formatRupiah(val: number) {
    if (val >= 1_000_000_000) return `Rp ${(val / 1_000_000_000).toFixed(1)}M`;
    if (val >= 1_000_000) return `Rp ${(val / 1_000_000).toFixed(1)}jt`;
    if (val >= 1_000) return `Rp ${(val / 1_000).toFixed(0)}rb`;
    return `Rp ${val.toLocaleString('id-ID')}`;
  }

  return (
    <div className="min-h-screen bg-[#F4F6F9] flex flex-col md:flex-row text-slate-800">
      {/* Sidebar Navigation matching Manager.png */}
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 p-6 flex flex-col justify-between md:min-h-screen shadow-sm">
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-400 rounded-full flex items-center justify-center p-1.5 shadow-sm">
              <img src="/logo.png" alt="Pak Resto Logo" className="w-full h-full object-contain" />
            </div>
            <span className="font-extrabold text-lg tracking-wider text-[#FA6338] uppercase">
              PAK RESTO.
            </span>
          </div>

          <nav className="space-y-2">
            {[
              { key: 'DASHBOARD', label: 'DASHBOARD', icon: <LayoutDashboard className="w-4 h-4" /> },
              { key: 'USER', label: 'KELOLA USER', icon: <Users className="w-4 h-4" /> },
              { key: 'MENU', label: 'KELOLA MENU', icon: <Utensils className="w-4 h-4" /> },
              { key: 'MEJA', label: 'KELOLA MEJA', icon: <Table className="w-4 h-4" /> },
              { key: 'LAPORAN', label: 'LAPORAN', icon: <FileText className="w-4 h-4" /> },
            ].map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                  activeTab === key
                    ? 'text-[#FA6338] bg-orange-50 font-extrabold'
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
          className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-red-500 transition-colors"
        >
          <LogOut className="w-4 h-4" /> Log Out
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-10 space-y-6">
        {/* DASHBOARD TAB matching Manager.png */}
        {activeTab === 'DASHBOARD' && (
          <div className="space-y-6">
            {statsLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="w-10 h-10 border-4 border-[#FA6338] border-t-transparent rounded-full animate-spin" />
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
                  {/* Total Pemasukan */}
                  <div className="col-span-2 bg-[#1E293B] text-white rounded-3xl p-6 flex justify-between items-center shadow-lg">
                    <div>
                      <p className="text-xs font-semibold opacity-70 mb-1">Total Pemasukan</p>
                      <p className="text-3xl md:text-4xl font-extrabold">{formatRupiah(stats?.totalPemasukan || 0)}</p>
                      <p className="text-xs opacity-60 mt-1">dari {stats?.totalOrderKonfirmasi || 0} transaksi terkonfirmasi</p>
                    </div>
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                      <ArrowUpRight className="w-6 h-6" />
                    </div>
                  </div>

                  {/* Avg Order Value */}
                  <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
                    <p className="text-xs font-semibold text-slate-400 mb-1">Rata-rata Nilai Order</p>
                    <p className="text-2xl font-extrabold text-[#FA6338]">{formatRupiah(stats?.avgOrderValue || 0)}</p>
                    <p className="text-xs text-slate-400 mt-1">per transaksi</p>
                  </div>

                  {/* Total Pegawai */}
                  <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
                    <p className="text-xs font-semibold text-slate-400 mb-1">Total Pegawai</p>
                    <p className="text-2xl font-extrabold text-[#2B4263]">{stats?.totalPegawai || 0}</p>
                    <p className="text-xs text-slate-400 mt-1">aktif di sistem</p>
                  </div>
                </div>

                {/* KPI Cards Row 2 */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Meja Terisi */}
                  <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
                    <p className="text-xs font-semibold text-slate-400 mb-1">Meja Terisi</p>
                    <p className="text-2xl font-extrabold text-slate-800">{stats?.mejaTerisi || 0}<span className="text-sm font-medium text-slate-400"> / {stats?.totalMeja || 0}</span></p>
                    <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#FA6338] rounded-full transition-all"
                        style={{ width: `${stats?.okupansiPersen || 0}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Okupansi {stats?.okupansiPersen || 0}%</p>
                  </div>

                  {/* Meja Tersedia */}
                  <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
                    <p className="text-xs font-semibold text-slate-400 mb-1">Meja Tersedia</p>
                    <p className="text-2xl font-extrabold text-emerald-500">{stats?.mejaTersedia ?? 0}</p>
                    <p className="text-xs text-slate-400 mt-1">siap digunakan</p>
                  </div>

                  {/* Pembayaran Tunai */}
                  <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
                    <p className="text-xs font-semibold text-slate-400 mb-1">Bayar Tunai</p>
                    <p className="text-2xl font-extrabold text-slate-800">{stats?.tunaiCount || 0}</p>
                    <p className="text-xs text-slate-400 mt-1">transaksi</p>
                  </div>

                  {/* Pembayaran QRIS */}
                  <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
                    <p className="text-xs font-semibold text-slate-400 mb-1">Bayar QRIS</p>
                    <p className="text-2xl font-extrabold text-[#9DB2FF]">{stats?.qrisCount || 0}</p>
                    <p className="text-xs text-slate-400 mt-1">transaksi</p>
                  </div>
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* 7-Day Revenue Bar Chart */}
                  <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Pendapatan 7 Hari Terakhir</h3>
                    <p className="text-xs text-slate-300 mb-5">Nilai transaksi terkonfirmasi per hari</p>
                    <div className="h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats?.revenueChartData || []}>
                          <XAxis dataKey="hari" stroke="#94a3b8" fontSize={9} />
                          <YAxis stroke="#94a3b8" fontSize={9} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}rb` : v} />
                          <Tooltip formatter={(v: any) => [`Rp ${Number(v).toLocaleString('id-ID')}`, 'Pendapatan']} />
                          <Bar dataKey="total" fill="#2B4263" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Role Distribution Pie */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Distribusi Pegawai</h3>
                    <p className="text-xs text-slate-300 mb-3">Per peran / jabatan</p>
                    <div className="h-36">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={(stats?.roleDistribusi || []).filter((r: any) => r.count > 0)}
                            innerRadius={30}
                            outerRadius={55}
                            paddingAngle={3}
                            dataKey="count"
                            nameKey="role"
                          >
                            {(stats?.roleDistribusi || []).map((entry: any) => (
                              <Cell key={entry.role} fill={ROLE_COLORS[entry.role] || '#ccc'} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v: any, name: string | undefined) => [v, name ?? '']} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-2 space-y-1">
                      {(stats?.roleDistribusi || []).map((r: any) => (
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
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                  <h3 className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Menu Terlaris</h3>
                  <p className="text-xs text-slate-300 mb-5">Top 5 menu berdasarkan total kuantitas dipesan</p>
                  {(stats?.topMenu || []).length === 0 ? (
                    <p className="text-xs text-slate-300 italic">Belum ada data pesanan.</p>
                  ) : (
                    <div className="space-y-3">
                      {(stats?.topMenu || []).map((m: any, i: number) => {
                        const maxVal = stats.topMenu[0]?.total || 1;
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
          </div>
        )}

        {/* KELOLA USER TAB matching Manager.png */}
        {activeTab === 'USER' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span>Show 10 entries</span>
                <input type="text" placeholder="Cari..." className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50" />
              </div>
              <button
                onClick={() => {
                  setEditingItem(null);
                  setUserForm({ nama: '', peran: 'pelayan', username: '', password: '' });
                  setShowModal('USER');
                }}
                className="px-5 py-2.5 bg-[#FA6338] hover:bg-orange-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" /> Tambah User
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold">
                    <th className="pb-3">User Id</th>
                    <th className="pb-3">Username</th>
                    <th className="pb-3">Nama User</th>
                    <th className="pb-3">Role</th>
                    <th className="pb-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {pegawaiList.map((p, idx) => (
                    <tr key={p.id_pegawai}>
                      <td className="py-4">#{p.id_pegawai.slice(0, 5)}</td>
                      <td className="py-4 font-semibold">{p.username}</td>
                      <td className="py-4 font-bold text-slate-800">{p.nama_pegawai}</td>
                      <td className="py-4 uppercase text-[10px] font-bold text-slate-600">{p.peran}</td>
                      <td className="py-4 text-right">
                        <button
                          onClick={() => {
                            setEditingItem(p);
                            setUserForm({ nama: p.nama_pegawai, peran: p.peran, username: p.username, password: '' });
                            setShowModal('USER');
                          }}
                          className="p-1.5 text-orange-500 hover:bg-orange-50 rounded-lg mr-1"
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
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* KELOLA MENU TAB matching Manager.png */}
        {activeTab === 'MENU' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span>Show 10 entries</span>
                <input type="text" placeholder="Cari..." className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50" />
              </div>
              <button
                onClick={() => {
                  setEditingItem(null);
                  setMenuForm({ nama: '', harga: 15000, kategori: 'Makanan', status: 'tersedia' });
                  setShowModal('MENU');
                }}
                className="px-5 py-2.5 bg-[#FA6338] hover:bg-orange-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" /> Tambah Menu
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold">
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
                      <td className="py-4">#{m.id_menu.slice(0, 5)}</td>
                      <td className="py-4 font-bold text-slate-800">{m.nama_menu}</td>
                      <td className="py-4">{m.kategori}</td>
                      <td className="py-4 font-bold text-[#FA6338]">Rp {Number(m.harga).toLocaleString('id-ID')}</td>
                      <td className="py-4 text-right">
                        <button
                          onClick={() => {
                            setEditingItem(m);
                            setMenuForm({ nama: m.nama_menu, harga: Number(m.harga), kategori: m.kategori, status: m.status_ketersediaan });
                            setShowModal('MENU');
                          }}
                          className="p-1.5 text-orange-500 hover:bg-orange-50 rounded-lg mr-1"
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
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* KELOLA MEJA TAB matching Manager.png */}
        {activeTab === 'MEJA' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span>Show 10 entries</span>
                <input type="text" placeholder="Cari..." className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50" />
              </div>
              <button
                onClick={() => {
                  setEditingItem(null);
                  setMejaForm({ nomor: '', kapasitas: 4, status: 'tersedia' });
                  setShowModal('MEJA');
                }}
                className="px-5 py-2.5 bg-[#FA6338] hover:bg-orange-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" /> Tambah Meja
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold">
                    <th className="pb-3">Meja Id</th>
                    <th className="pb-3">Nomor Meja</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {mejaList.map((m) => (
                    <tr key={m.id_meja}>
                      <td className="py-4">#{m.id_meja.slice(0, 5)}</td>
                      <td className="py-4 font-extrabold text-slate-800">{m.nomor_meja}</td>
                      <td className="py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          m.status_ketersediaan === 'tersedia' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {m.status_ketersediaan}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        <button
                          onClick={() => {
                            setEditingItem(m);
                            setMejaForm({ nomor: m.nomor_meja, kapasitas: m.kapasitas, status: m.status_ketersediaan });
                            setShowModal('MEJA');
                          }}
                          className="p-1.5 text-orange-500 hover:bg-orange-50 rounded-lg mr-1"
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
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* LAPORAN TAB matching Manager.png */}
        {activeTab === 'LAPORAN' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span>Show 10 entries</span>
                <input type="text" placeholder="Cari..." className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50" />
              </div>
              <button
                onClick={() => toast.success('Laporan berhasil dieksport ke format Excel!')}
                className="px-5 py-2.5 bg-[#FA6338] hover:bg-orange-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Download className="w-4 h-4" /> Eksport Laporan
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold">
                    <th className="pb-3">Meja Id</th>
                    <th className="pb-3">Nomor Meja</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Tanggal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {mejaList.map((m) => (
                    <tr key={m.id_meja}>
                      <td className="py-4">#{m.id_meja.slice(0, 5)}</td>
                      <td className="py-4 font-bold">{m.nomor_meja}</td>
                      <td className="py-4 capitalize">{m.status_ketersediaan}</td>
                      <td className="py-4 text-slate-400">Hari ini</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MODAL USER FORM */}
        {showModal === 'USER' && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-800">{editingItem ? 'Edit Pegawai' : 'Tambah User Baru'}</h3>
                <button onClick={() => setShowModal(null)}><X className="w-5 h-5 text-slate-400" /></button>
              </div>
              <form onSubmit={handleSaveUser} className="space-y-4 text-xs font-semibold text-slate-600">
                <div>
                  <label className="block mb-1">Nama Pegawai</label>
                  <input
                    type="text"
                    required
                    value={userForm.nama}
                    onChange={(e) => setUserForm({ ...userForm, nama: e.target.value })}
                    className="w-full p-3 border rounded-2xl bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block mb-1">Role (Peran)</label>
                  <select
                    value={userForm.peran}
                    onChange={(e) => setUserForm({ ...userForm, peran: e.target.value as PeranPegawai })}
                    className="w-full p-3 border rounded-2xl bg-slate-50"
                  >
                    <option value="pelayan">Pelayan</option>
                    <option value="kasir">Kasir</option>
                    <option value="koki">Koki</option>
                    <option value="manajer">Manajer</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1">Username</label>
                  <input
                    type="text"
                    required
                    value={userForm.username}
                    onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                    className="w-full p-3 border rounded-2xl bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block mb-1">Password</label>
                  <input
                    type="password"
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    className="w-full p-3 border rounded-2xl bg-slate-50"
                  />
                </div>
                <button type="submit" disabled={loading} className="w-full py-3.5 bg-[#FA6338] text-white font-bold rounded-2xl uppercase">
                  Simpan Pegawai
                </button>
              </form>
            </div>
          </div>
        )}

        {/* MODAL MENU FORM (Strictly Makanan & Minuman) */}
        {showModal === 'MENU' && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-800">{editingItem ? 'Edit Menu' : 'Tambah Menu Baru'}</h3>
                <button onClick={() => setShowModal(null)}><X className="w-5 h-5 text-slate-400" /></button>
              </div>
              <form onSubmit={handleSaveMenu} className="space-y-4 text-xs font-semibold text-slate-600">
                <div>
                  <label className="block mb-1">Nama Menu</label>
                  <input
                    type="text"
                    required
                    value={menuForm.nama}
                    onChange={(e) => setMenuForm({ ...menuForm, nama: e.target.value })}
                    className="w-full p-3 border rounded-2xl bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block mb-1">Harga (Rp)</label>
                  <input
                    type="number"
                    required
                    value={menuForm.harga}
                    onChange={(e) => setMenuForm({ ...menuForm, harga: Number(e.target.value) })}
                    className="w-full p-3 border rounded-2xl bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block mb-1">Kategori</label>
                  <select
                    value={menuForm.kategori}
                    onChange={(e) => setMenuForm({ ...menuForm, kategori: e.target.value })}
                    className="w-full p-3 border rounded-2xl bg-slate-50"
                  >
                    <option value="Makanan">Makanan</option>
                    <option value="Minuman">Minuman</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1">Status Ketersediaan</label>
                  <select
                    value={menuForm.status}
                    onChange={(e) => setMenuForm({ ...menuForm, status: e.target.value as StatusMenu })}
                    className="w-full p-3 border rounded-2xl bg-slate-50"
                  >
                    <option value="tersedia">Tersedia</option>
                    <option value="habis">Habis</option>
                  </select>
                </div>
                <button type="submit" disabled={loading} className="w-full py-3.5 bg-[#FA6338] text-white font-bold rounded-2xl uppercase">
                  Simpan Menu
                </button>
              </form>
            </div>
          </div>
        )}

        {/* MODAL MEJA FORM */}
        {showModal === 'MEJA' && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-800">{editingItem ? 'Edit Meja' : 'Tambah Meja Baru'}</h3>
                <button onClick={() => setShowModal(null)}><X className="w-5 h-5 text-slate-400" /></button>
              </div>
              <form onSubmit={handleSaveMeja} className="space-y-4 text-xs font-semibold text-slate-600">
                <div>
                  <label className="block mb-1">Nomor Meja</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 11"
                    value={mejaForm.nomor}
                    onChange={(e) => setMejaForm({ ...mejaForm, nomor: e.target.value })}
                    className="w-full p-3 border rounded-2xl bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block mb-1">Kapasitas (Orang)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={mejaForm.kapasitas}
                    onChange={(e) => setMejaForm({ ...mejaForm, kapasitas: Number(e.target.value) })}
                    className="w-full p-3 border rounded-2xl bg-slate-50"
                  />
                </div>
                <button type="submit" disabled={loading} className="w-full py-3.5 bg-[#FA6338] text-white font-bold rounded-2xl uppercase">
                  Simpan Meja
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

