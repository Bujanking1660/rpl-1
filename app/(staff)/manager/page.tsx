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
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ShieldCheck, LayoutDashboard, Users, Utensils, Table, FileText, Plus, Edit2, Trash2, LogOut, X } from 'lucide-react';
import { PeranPegawai, StatusMenu, StatusMeja } from '@/lib/types/database';

export default function ManagerPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'USER' | 'MENU' | 'MEJA'>('DASHBOARD');
  const [stats, setStats] = useState<any>({ totalPegawai: 0, totalPemasukan: 0, totalMeja: 0, mejaTerisi: 0, okupansiPersen: 0 });
  
  // Data lists
  const [pegawaiList, setPegawaiList] = useState<any[]>([]);
  const [menuList, setMenuList] = useState<any[]>([]);
  const [mejaList, setMejaList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Modals state
  const [showModal, setShowModal] = useState<string | null>(null); // 'USER' | 'MENU' | 'MEJA'
  const [editingItem, setEditingItem] = useState<any | null>(null);

  // Form states
  const [userForm, setUserForm] = useState({ nama: '', peran: 'pelayan' as PeranPegawai, username: '', password: '' });
  const [menuForm, setMenuForm] = useState({ nama: '', harga: 15000, kategori: 'Food', status: 'tersedia' as StatusMenu });
  const [mejaForm, setMejaForm] = useState({ nomor: '', kapasitas: 4, status: 'tersedia' as StatusMeja });

  useEffect(() => {
    fetchStats();
    fetchPegawai();
    fetchMenu();
    fetchMeja();
  }, []);

  async function fetchStats() {
    const data = await getDashboardStatsAction();
    setStats(data);
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

  // Recharts mock revenue dataset
  const revenueChartData = [
    { month: 'Juni', total: 45 },
    { month: 'Juli', total: 68 },
    { month: 'Agustus', total: 95 },
    { month: 'September', total: 110 },
    { month: 'Oktober', total: 140 },
    { month: 'November', total: stats.totalPemasukan ? Math.round(stats.totalPemasukan / 1000000) : 85 },
  ];

  const pieData = [
    { name: 'Meja Terisi', value: stats.mejaTerisi || 1 },
    { name: 'Meja Kosong', value: Math.max(1, stats.totalMeja - stats.mejaTerisi) },
  ];
  const COLORS = ['#ff6b4a', '#2b3a55'];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row">
      {/* Sidebar Navigation matching ui/Manager.png */}
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 p-6 flex flex-col justify-between shadow-sm">
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 p-1 flex items-center justify-center shadow">
              <img src="/logo.png" alt="Logo Pak Resto" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="font-extrabold text-slate-800 text-base tracking-wider block">PAK RESTO.</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Manajer Restoran</span>
            </div>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('DASHBOARD')}
              className={`w-full px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-3 transition ${
                activeTab === 'DASHBOARD' ? 'bg-slate-900 text-[#ff6b4a] shadow-sm' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" /> DASHBOARD
            </button>
            <button
              onClick={() => setActiveTab('USER')}
              className={`w-full px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-3 transition ${
                activeTab === 'USER' ? 'bg-slate-900 text-[#ff6b4a] shadow-sm' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Users className="w-4 h-4" /> KELOLA USER
            </button>
            <button
              onClick={() => setActiveTab('MENU')}
              className={`w-full px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-3 transition ${
                activeTab === 'MENU' ? 'bg-slate-900 text-[#ff6b4a] shadow-sm' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Utensils className="w-4 h-4" /> KELOLA MENU
            </button>
            <button
              onClick={() => setActiveTab('MEJA')}
              className={`w-full px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-3 transition ${
                activeTab === 'MEJA' ? 'bg-slate-900 text-[#ff6b4a] shadow-sm' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Table className="w-4 h-4" /> KELOLA MEJA
            </button>
          </nav>
        </div>

        <button
          onClick={handleLogout}
          className="w-full px-4 py-3 rounded-2xl text-xs font-bold text-slate-500 hover:bg-red-50 hover:text-red-600 flex items-center gap-3 transition mt-8"
        >
          <LogOut className="w-4 h-4" /> LOGOUT
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-10 max-w-6xl w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Manager Dashboard</h1>
            <p className="text-xs text-slate-400 mt-1">Laporan Operasional & Pengelolaan Data Master</p>
          </div>
        </div>

        {/* DASHBOARD TAB matching ui/Manager.png */}
        {activeTab === 'DASHBOARD' && (
          <div className="space-y-8">
            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400">Total Pegawai</p>
                  <h2 className="text-4xl font-black mt-2">{stats.totalPegawai}</h2>
                </div>
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-orange-400 font-bold">
                  <Users className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400">Total Pemasukan Bersih</p>
                  <h2 className="text-3xl font-black text-slate-800 mt-2">
                    Rp {Number(stats.totalPemasukan).toLocaleString('id-ID')}
                  </h2>
                </div>
                <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-[#ff6b4a]">
                  <FileText className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400">Okupansi Meja</p>
                  <h2 className="text-3xl font-black text-slate-800 mt-2">
                    {stats.okupansiPersen}% <span className="text-xs font-normal text-slate-400">({stats.mejaTerisi}/{stats.totalMeja})</span>
                  </h2>
                </div>
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                  <Table className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Recharts Analytics Charts matching ui/Manager.png */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 mb-6">Pendapatan Restoran (Dalam Juta)</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueChartData}>
                      <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                      <YAxis stroke="#94a3b8" fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="total" fill="#2b3a55" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <h3 className="text-sm font-bold text-slate-800 mb-2">Distribusi Okupansi Meja</h3>
                <div className="h-48 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-4 text-xs font-semibold text-slate-600">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#ff6b4a]" /> Terisi ({stats.mejaTerisi})</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#2b3a55]" /> Kosong ({stats.totalMeja - stats.mejaTerisi})</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* KELOLA USER (PEGAWAI) TAB matching ui/Manager.png */}
        {activeTab === 'USER' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800">Daftar Akun Pegawai</h2>
              <button
                onClick={() => {
                  setEditingItem(null);
                  setUserForm({ nama: '', peran: 'pelayan', username: '', password: '' });
                  setShowModal('USER');
                }}
                className="px-4 py-2 bg-[#ff6b4a] hover:bg-orange-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow"
              >
                <Plus className="w-4 h-4" /> Tambah User
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-400 uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Nama Pegawai</th>
                    <th className="py-3 px-4">Username</th>
                    <th className="py-3 px-4">Peran (Role)</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {pegawaiList.map((p) => (
                    <tr key={p.id_pegawai}>
                      <td className="py-3.5 px-4 font-bold text-slate-800">{p.nama_pegawai}</td>
                      <td className="py-3.5 px-4 text-slate-600">{p.username}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-800 font-bold rounded-full uppercase text-[10px]">
                          {p.peran}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            setEditingItem(p);
                            setUserForm({ nama: p.nama_pegawai, peran: p.peran, username: p.username, password: '' });
                            setShowModal('USER');
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg mr-1"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm(`Hapus pegawai ${p.nama_pegawai}?`)) {
                              await deletePegawaiAction(p.id_pegawai);
                              toast.success('Pegawai dihapus');
                              fetchPegawai();
                            }
                          }}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
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

        {/* KELOLA MENU TAB matching ui/Manager.png */}
        {activeTab === 'MENU' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800">Daftar Master Menu Restoran</h2>
              <button
                onClick={() => {
                  setEditingItem(null);
                  setMenuForm({ nama: '', harga: 15000, kategori: 'Food', status: 'tersedia' });
                  setShowModal('MENU');
                }}
                className="px-4 py-2 bg-[#ff6b4a] hover:bg-orange-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow"
              >
                <Plus className="w-4 h-4" /> Tambah Menu
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-400 uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Nama Menu</th>
                    <th className="py-3 px-4">Kategori</th>
                    <th className="py-3 px-4">Harga</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {menuList.map((m) => (
                    <tr key={m.id_menu}>
                      <td className="py-3.5 px-4 font-bold text-slate-800">{m.nama_menu}</td>
                      <td className="py-3.5 px-4 text-slate-600">{m.kategori}</td>
                      <td className="py-3.5 px-4 font-bold text-[#ff6b4a]">Rp {Number(m.harga).toLocaleString('id-ID')}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${m.status_ketersediaan === 'tersedia' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {m.status_ketersediaan}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            setEditingItem(m);
                            setMenuForm({ nama: m.nama_menu, harga: Number(m.harga), kategori: m.kategori, status: m.status_ketersediaan });
                            setShowModal('MENU');
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg mr-1"
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
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
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

        {/* KELOLA MEJA TAB matching ui/Manager.png */}
        {activeTab === 'MEJA' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800">Daftar Meja Restoran</h2>
              <button
                onClick={() => {
                  setEditingItem(null);
                  setMejaForm({ nomor: '', kapasitas: 4, status: 'tersedia' });
                  setShowModal('MEJA');
                }}
                className="px-4 py-2 bg-[#ff6b4a] hover:bg-orange-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow"
              >
                <Plus className="w-4 h-4" /> Tambah Meja
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              {mejaList.map((m) => (
                <div key={m.id_meja} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center flex flex-col items-center justify-between">
                  <span className="text-2xl font-extrabold text-slate-800">{m.nomor_meja}</span>
                  <span className="text-xs text-slate-500 font-medium my-1">Kapasitas: {m.kapasitas} orang</span>
                  <div className="flex gap-1 mt-2">
                    <button
                      onClick={() => {
                        setEditingItem(m);
                        setMejaForm({ nomor: m.nomor_meja, kapasitas: m.kapasitas, status: m.status_ketersediaan });
                        setShowModal('MEJA');
                      }}
                      className="p-1 bg-white border rounded text-blue-600"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm(`Hapus Meja ${m.nomor_meja}?`)) {
                          await deleteMejaAction(m.id_meja);
                          toast.success('Meja dihapus');
                          fetchMeja();
                        }
                      }}
                      className="p-1 bg-white border rounded text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MODAL USER FORM */}
        {showModal === 'USER' && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-800">{editingItem ? 'Edit Pegawai' : 'Tambah Pegawai Baru'}</h3>
                <button onClick={() => setShowModal(null)}><X className="w-5 h-5 text-slate-400" /></button>
              </div>
              <form onSubmit={handleSaveUser} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Nama Pegawai</label>
                  <input
                    type="text"
                    required
                    value={userForm.nama}
                    onChange={(e) => setUserForm({ ...userForm, nama: e.target.value })}
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Role (Peran)</label>
                  <select
                    value={userForm.peran}
                    onChange={(e) => setUserForm({ ...userForm, peran: e.target.value as PeranPegawai })}
                    className="w-full p-2.5 border rounded-xl bg-white"
                  >
                    <option value="pelayan">Pelayan</option>
                    <option value="kasir">Kasir</option>
                    <option value="koki">Koki</option>
                    <option value="manajer">Manajer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Username</label>
                  <input
                    type="text"
                    required
                    value={userForm.username}
                    onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">
                    {editingItem ? 'Password Baru (Kosongkan jika tidak diubah)' : 'Password'}
                  </label>
                  <input
                    type="password"
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
                <button type="submit" disabled={loading} className="w-full py-3 bg-[#ff6b4a] text-white font-bold rounded-xl">
                  Simpan Pegawai
                </button>
              </form>
            </div>
          </div>
        )}

        {/* MODAL MENU FORM */}
        {showModal === 'MENU' && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-800">{editingItem ? 'Edit Menu' : 'Tambah Menu Baru'}</h3>
                <button onClick={() => setShowModal(null)}><X className="w-5 h-5 text-slate-400" /></button>
              </div>
              <form onSubmit={handleSaveMenu} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Nama Menu</label>
                  <input
                    type="text"
                    required
                    value={menuForm.nama}
                    onChange={(e) => setMenuForm({ ...menuForm, nama: e.target.value })}
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Harga (Rp)</label>
                  <input
                    type="number"
                    required
                    value={menuForm.harga}
                    onChange={(e) => setMenuForm({ ...menuForm, harga: Number(e.target.value) })}
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Kategori</label>
                  <select
                    value={menuForm.kategori}
                    onChange={(e) => setMenuForm({ ...menuForm, kategori: e.target.value })}
                    className="w-full p-2.5 border rounded-xl bg-white"
                  >
                    <option value="Food">Food</option>
                    <option value="Drink">Drink</option>
                    <option value="Dessert">Dessert</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Status Ketersediaan</label>
                  <select
                    value={menuForm.status}
                    onChange={(e) => setMenuForm({ ...menuForm, status: e.target.value as StatusMenu })}
                    className="w-full p-2.5 border rounded-xl bg-white"
                  >
                    <option value="tersedia">Tersedia</option>
                    <option value="habis">Habis</option>
                  </select>
                </div>
                <button type="submit" disabled={loading} className="w-full py-3 bg-[#ff6b4a] text-white font-bold rounded-xl">
                  Simpan Menu
                </button>
              </form>
            </div>
          </div>
        )}

        {/* MODAL MEJA FORM */}
        {showModal === 'MEJA' && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-800">{editingItem ? 'Edit Meja' : 'Tambah Meja Baru'}</h3>
                <button onClick={() => setShowModal(null)}><X className="w-5 h-5 text-slate-400" /></button>
              </div>
              <form onSubmit={handleSaveMeja} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Nomor Meja</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 11"
                    value={mejaForm.nomor}
                    onChange={(e) => setMejaForm({ ...mejaForm, nomor: e.target.value })}
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Kapasitas (Orang)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={mejaForm.kapasitas}
                    onChange={(e) => setMejaForm({ ...mejaForm, kapasitas: Number(e.target.value) })}
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
                <button type="submit" disabled={loading} className="w-full py-3 bg-[#ff6b4a] text-white font-bold rounded-xl">
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
