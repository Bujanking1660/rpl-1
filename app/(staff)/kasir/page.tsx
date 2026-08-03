'use client';

import { useState, useEffect } from 'react';
import { getPesananPendingKasirAction, prosesPembayaranAction } from '@/lib/actions/kasir';
import { logoutStaffAction, getStaffSessionAction } from '@/lib/actions/auth';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Wallet, QrCode, ArrowLeft, ArrowRight, Receipt, LogOut, RefreshCw, LayoutDashboard } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

interface KasirDetail {
  id_detail_pesanan: string;
  jumlah: number;
  subtotal: number;
  menu?: { id_menu?: string; nama_menu?: string; harga?: number; kategori?: string } | null;
}

interface KasirPesanan {
  id_pesanan: string;
  status: string;
  meja?: { nomor_meja?: string } | null;
  detail_pesanan?: KasirDetail[];
}

export default function KasirPage() {
  const router = useRouter();

  const [session, setSession] = useState<{ nama_pegawai?: string } | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [pesananList, setPesananList] = useState<KasirPesanan[]>([]);
  const [selectedPesanan, setSelectedPesanan] = useState<KasirPesanan | null>(null);
  const [loading, setLoading] = useState(false);
  const [metodePembayaran, setMetodePembayaran] = useState<'tunai' | 'qr_gopay'>('tunai');
  const [nominalDiterima, setNominalDiterima] = useState<number>(0);
  const [categoryFilter, setCategoryFilter] = useState('Semua');

  useEffect(() => {
    fetchPesananList();
    getStaffSessionAction('kasir').then((sess) => setSession(sess));

    const supabase = createClient();
    const channel = supabase
      .channel('kasir-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pesanan' }, () => fetchPesananList())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pembayaran' }, () => fetchPesananList())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meja' }, () => fetchPesananList())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function fetchPesananList() {
    const res = await getPesananPendingKasirAction();
    if (res.success && res.data) setPesananList(res.data);
  }

  async function handleLogout() {
    await logoutStaffAction('kasir');
    router.push('/login');
  }

  const details = selectedPesanan?.detail_pesanan || [];
  const filteredDetails = categoryFilter === 'Semua'
    ? details
    : details.filter((d) => d.menu?.kategori === categoryFilter);

  const subtotalPrice = details.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
  const serviceCharge = details.length > 0 ? 5000 : 0;
  const totalPrice = subtotalPrice + serviceCharge;
  const totalItemsCount = details.reduce((sum, item) => sum + item.jumlah, 0);
  const kembalian = Math.max(0, nominalDiterima - totalPrice);

  // H1: Dashboard KPI derived from live pending orders
  const pendingCount = pesananList.length;
  const totalTagihanPending = pesananList.reduce((sum, p) => {
    const items = p.detail_pesanan || [];
    const subtotal = items.reduce((s, d) => s + Number(d.subtotal || 0), 0);
    const service = items.length > 0 ? 5000 : 0;
    return sum + subtotal + service;
  }, 0);
  const totalItemsPending = pesananList.reduce((sum, p) => sum + (p.detail_pesanan || []).reduce((s, d) => s + d.jumlah, 0), 0);

  function formatRupiah(val: number) {
    return `Rp ${val.toLocaleString('id-ID')}`;
  }

  async function handleProsesBayar() {
    if (!selectedPesanan) return;

    if (metodePembayaran === 'tunai' && nominalDiterima < totalPrice) {
      toast.error('Nominal uang kurang dari total tagihan');
      return;
    }

    setLoading(true);
    const res = await prosesPembayaranAction(selectedPesanan.id_pesanan, totalPrice, metodePembayaran);
    setLoading(false);

    if (res.success) {
      toast.success('Pembayaran terkonfirmasi! Pesanan diteruskan ke dapur.');
      window.print();
      fetchPesananList();
      setStep(1);
      setSelectedPesanan(null);
    } else {
      toast.error(res.error || 'Gagal memproses pembayaran');
    }
  }

  const kpiStats = [
    { label: 'Menunggu Bayar', value: String(pendingCount), sub: 'meja aktif', theme: 'bg-gradient-to-br from-[#2B4263] to-[#355070] text-white', icon: <Receipt className="w-5 h-5" /> },
    { label: 'Total Tagihan', value: formatRupiah(totalTagihanPending), sub: 'menunggu konfirmasi', theme: 'bg-white text-slate-800 border border-slate-100', icon: <Wallet className="w-5 h-5" /> },
    { label: 'Total Item', value: String(totalItemsPending), sub: 'porsi dipesan', theme: 'bg-white text-slate-800 border border-slate-100', icon: <LayoutDashboard className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen app-bg flex flex-col md:flex-row text-slate-800">
      {/* Sidebar Navigation */}
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
            <button
              onClick={() => setStep(1)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer bg-[#2B4263] text-white shadow-md"
            >
              <Receipt className="w-4 h-4" />
              <span>Pembayaran</span>
              {pendingCount > 0 && (
                <span className="ml-auto text-[9px] font-black bg-[#FA6338] text-white rounded-full min-w-[18px] h-[18px] px-0.5 flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </button>
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
        {/* Greeting + status header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-[#2B4263]">
              Selamat Datang, {session?.nama_pegawai || 'Kasir'}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {pendingCount > 0
                ? `${pendingCount} meja menunggu pembayaran · ${formatRupiah(totalTagihanPending)}`
                : 'Tidak ada tagihan yang menunggu saat ini'}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Realtime
            </span>
            <button
              onClick={fetchPesananList}
              title="Muat ulang data"
              aria-label="Muat ulang data"
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-white rounded-xl transition-all cursor-pointer bg-white/60"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* KPI Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {kpiStats.map(({ label, value, sub, theme, icon }) => (
            <div key={label} className={`rounded-3xl p-6 flex justify-between items-center shadow-sm ${theme}`}>
              <div>
                <p className="text-xs font-semibold opacity-70 mb-1">{label}</p>
                <p className="text-2xl font-extrabold truncate">{value}</p>
                <p className="text-[10px] opacity-60 mt-0.5 font-medium">{sub}</p>
              </div>
              <div className="w-12 h-12 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center">
                {icon}
              </div>
            </div>
          ))}
        </div>

        {/* STEP FLOW */}
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="card p-6 md:p-8"
            >
              {/* Status indicators */}
              <div className="flex items-center gap-4 text-xs font-bold text-slate-500 mb-5">
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-lg bg-white border border-slate-200 shadow-sm" /> Kosong
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-lg bg-[#FFF0EB] border border-[#FBD9CC]" /> Menunggu Bayar
                </span>
              </div>

              {/* Grid 10 Tables */}
              <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-3">
                {Array.from({ length: 10 }).map((_, index) => {
                  const nomorMeja = String(index + 1).padStart(2, '0');
                  const pesananTarget = pesananList.find(
                    (p) => p.meja?.nomor_meja === nomorMeja && p.status === 'menunggu_pembayaran'
                  );
                  const hasPending = !!pesananTarget;

                  return (
                    <button
                      key={nomorMeja}
                      onClick={() => {
                        if (pesananTarget) {
                          setSelectedPesanan(pesananTarget);
                          setNominalDiterima(0);
                          setStep(2);
                        } else {
                          toast.info(`Meja ${nomorMeja} tidak memiliki tagihan aktif`);
                        }
                      }}
                      className={`h-24 rounded-2xl flex flex-col items-center justify-center font-black text-2xl transition-all cursor-pointer ${
                        hasPending
                          ? 'bg-[#FFF0EB] text-[#FA6338] scale-105 border-2 border-[#FBD9CC] shadow-md'
                          : 'bg-white text-[#2B4263] border border-slate-200 hover:border-[#2B4263]/40 hover:shadow-md'
                      }`}
                    >
                      <span>{nomorMeja}</span>
                      <span className="text-[9px] font-semibold opacity-80 mt-1 uppercase">
                        {hasPending ? 'Menunggu Bayar' : 'Kosong'}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="text-center text-[10px] font-black text-slate-400 tracking-widest uppercase mt-6 pt-5 border-t border-slate-100">
                Resto Pak Resto
              </div>
            </motion.div>
          )}

          {/* STEP 2: DETAIL PESANAN MEJA XX */}
          {step === 2 && selectedPesanan && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
              className="card p-6 md:p-8"
            >
              <button
                onClick={() => { setStep(1); setSelectedPesanan(null); }}
                aria-label="Kembali ke daftar meja"
                className="btn-ghost !py-2 !px-3.5 mb-5"
              >
                <ArrowLeft className="w-4 h-4" /> Kembali
              </button>

              {/* Category tabs */}
              <div className="flex gap-2 mb-6">
                {['Semua', 'Makanan', 'Minuman'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-4 py-2 rounded-xl font-extrabold text-xs transition-all cursor-pointer ${
                      categoryFilter === cat
                        ? 'bg-[#2B4263] text-white shadow-md'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Menu items list */}
                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-1">
                  {filteredDetails.map((item) => (
                    <div
                      key={item.id_detail_pesanan}
                      className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col justify-between shadow-sm h-28"
                    >
                      <div className="font-extrabold text-sm leading-tight text-slate-800">
                        {item.menu?.nama_menu} <span className="text-[#FA6338]">x{item.jumlah}</span>
                      </div>
                      <div className="text-[#2B4263] font-black text-base">
                        Rp {Number(item.menu?.harga || 0).toLocaleString('id-ID')}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Order Summary sidebar */}
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="font-black text-base text-slate-800 border-b border-slate-200 pb-3 mb-3 flex items-center gap-2">
                      <span className="w-7 h-7 bg-[#2B4263] text-white rounded-lg flex items-center justify-center text-xs">{selectedPesanan.meja?.nomor_meja}</span>
                      Meja #{selectedPesanan.meja?.nomor_meja}
                    </h3>
                    <div className="space-y-2 text-xs font-semibold text-slate-600">
                      {details.map((item) => (
                        <div key={item.id_detail_pesanan} className="flex justify-between">
                          <span>{item.menu?.nama_menu}</span>
                          <span className="font-bold">{item.jumlah}x</span>
                        </div>
                      ))}
                    </div>
                    <div className="pt-3 mt-3 border-t border-dashed border-slate-300 flex justify-between text-xs font-black text-slate-800">
                      <span>Total Item :</span>
                      <span>{totalItemsCount} Item</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setStep(3)}
                    className="btn-primary w-full"
                  >
                    Lanjut Bayar <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 3: PEMBAYARAN MEJA XX */}
          {step === 3 && selectedPesanan && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
              className="card p-6 md:p-8"
            >
              <button
                onClick={() => setStep(2)}
                aria-label="Kembali ke detail pesanan"
                className="btn-ghost !py-2 !px-3.5 mb-5 no-print"
              >
                <ArrowLeft className="w-4 h-4" /> Kembali
              </button>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Ringkasan Pesanan Box */}
                <div className="md:col-span-2 bg-slate-50 rounded-2xl p-5 border border-slate-100 flex flex-col justify-between print-area">
                  <div>
                    <h2 className="font-black text-slate-800 text-sm uppercase tracking-wider border-b border-slate-200 pb-3 mb-4">
                      Ringkasan Pesanan — Meja {selectedPesanan.meja?.nomor_meja}
                    </h2>
                    <div className="space-y-3">
                      {details.map((item) => (
                        <div key={item.id_detail_pesanan} className="flex justify-between text-xs font-bold text-slate-700">
                          <span>{item.menu?.nama_menu} {item.jumlah}x</span>
                          <span>Rp {Number(item.subtotal).toLocaleString('id-ID')}</span>
                        </div>
                      ))}
                    </div>
                    <div className="pt-4 mt-6 border-t border-dashed border-slate-300 space-y-2 text-xs">
                      <div className="flex justify-between text-slate-500 font-medium">
                        <span>Service charge</span>
                        <span>Rp {serviceCharge.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex justify-between font-bold text-slate-700">
                        <span>Total Item :</span>
                        <span>{totalItemsCount} Item</span>
                      </div>
                      <div className="flex justify-between font-black text-slate-900 text-lg pt-2">
                        <span>Total Tagihan:</span>
                        <span className="text-[#FA6338]">Rp {totalPrice.toLocaleString('id-ID')}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Metode Pembayaran Box */}
                <div className="bg-white border border-slate-100 rounded-2xl p-5 flex flex-col justify-between space-y-4 no-print shadow-sm">
                  <div className="space-y-4">
                    <h3 className="font-black text-slate-800 text-xs uppercase tracking-wider border-b border-slate-200 pb-2">
                      Metode Pembayaran
                    </h3>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setMetodePembayaran('tunai')}
                        className={`flex flex-col items-center justify-center p-3 rounded-2xl font-black text-xs transition-all cursor-pointer border ${
                          metodePembayaran === 'tunai' ? 'bg-[#2B4263] text-white border-[#2B4263] shadow-md' : 'bg-white text-slate-600 border-slate-200'
                        }`}
                      >
                        <Wallet className="w-5 h-5 mb-1" /> Tunai
                      </button>
                      <button
                        onClick={() => setMetodePembayaran('qr_gopay')}
                        className={`flex flex-col items-center justify-center p-3 rounded-2xl font-black text-xs transition-all cursor-pointer border ${
                          metodePembayaran === 'qr_gopay' ? 'bg-[#FA6338] text-white border-[#FA6338] shadow-md' : 'bg-white text-slate-600 border-slate-200'
                        }`}
                      >
                        <QrCode className="w-5 h-5 mb-1" /> QRIS
                      </button>
                    </div>

                    {metodePembayaran === 'qr_gopay' ? (
                      <div className="bg-slate-50 p-4 rounded-2xl text-center border border-slate-100 space-y-2">
                        <div className="w-40 h-40 mx-auto relative rounded-xl overflow-hidden shadow-inner border border-slate-200">
                          <img
                            src="/WhatsApp Image 2026-08-01 at 17.24.05.jpeg"
                            alt="QRIS Payment Code"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Scan QRIS Pembayaran
                        </p>
                      </div>
                    ) : (
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                          Nominal Diterima
                        </label>
                        <input
                          type="number"
                          value={nominalDiterima || ''}
                          onChange={(e) => setNominalDiterima(Number(e.target.value))}
                          placeholder="Rp 50.000"
                          className="input-field font-extrabold text-sm"
                        />
                      </div>
                    )}

                    {metodePembayaran === 'tunai' && (
                      <div className="flex justify-between items-center text-xs font-bold text-slate-700 pt-2 border-t border-slate-200">
                        <span>Kembalian</span>
                        <span className="text-[#FA6338] text-base font-black">Rp {kembalian.toLocaleString('id-ID')}</span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleProsesBayar}
                    disabled={loading}
                    className="btn-primary w-full"
                  >
                    {loading ? 'Memproses...' : 'Bayar & Cetak Struk'}
                  </button>
                </div>
              </div>

              <div className="text-center text-[10px] font-black text-slate-400 tracking-widest uppercase mt-6 pt-5 border-t border-slate-100 no-print">
                Resto Pak Resto
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
