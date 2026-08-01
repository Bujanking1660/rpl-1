'use client';

import { useState, useEffect } from 'react';
import { getPesananPendingKasirAction, prosesPembayaranAction } from '@/lib/actions/kasir';
import { logoutStaffAction } from '@/lib/actions/auth';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { LogOut, Wallet, QrCode, ArrowLeft, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

export default function KasirPage() {
  const router = useRouter();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [pesananList, setPesananList] = useState<any[]>([]);
  const [selectedPesanan, setSelectedPesanan] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [metodePembayaran, setMetodePembayaran] = useState<'tunai' | 'qr_gopay'>('tunai');
  const [nominalDiterima, setNominalDiterima] = useState<number>(0);
  const [categoryFilter, setCategoryFilter] = useState('Semua');

  useEffect(() => {
    fetchPesananList();

    const supabase = createClient();
    const channel = supabase
      .channel('kasir-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pesanan' }, () => fetchPesananList())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pembayaran' }, () => fetchPesananList())
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
    : details.filter((d: any) => d.menu?.kategori === categoryFilter);

  const subtotalPrice = details.reduce((sum: number, item: any) => sum + Number(item.subtotal || 0), 0);
  const serviceCharge = details.length > 0 ? 5000 : 0;
  const totalPrice = subtotalPrice + serviceCharge;
  const totalItemsCount = details.reduce((sum: number, item: any) => sum + item.jumlah, 0);
  const kembalian = Math.max(0, nominalDiterima - totalPrice);

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

  return (
    <div className="min-h-screen bg-[#35485E] p-4 md:p-8 text-slate-800 flex flex-col justify-between">
      <div>
        {/* Top Header Bar without step/takeaway matching user request */}
        <div className="flex items-center justify-between mb-6 bg-white rounded-2xl px-6 py-3.5 shadow-md no-print">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#FA6338] rounded-xl flex items-center justify-center text-white font-black text-sm">
              K
            </div>
            <h1 className="text-base font-black text-slate-800 uppercase tracking-wide">
              KASIR POS — RESTO PAK RESTO
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {step !== 1 && (
              <button
                onClick={() => setStep((step - 1) as 1 | 2)}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#FA6338] text-white rounded-xl text-xs font-extrabold uppercase hover:bg-orange-600 transition-all shadow-xs cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Kembali
              </button>
            )}

            <button onClick={fetchPesananList} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl" title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500 rounded-xl" title="Keluar">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* STEP 1: PILIHAN MEJA */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#2B4263] rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 max-w-4xl mx-auto border-4 border-white/10"
          >
            {/* Status indicators: ONLY KOSONG & MENUNGGU BAYAR */}
            <div className="flex items-center gap-6 text-xs text-white font-bold bg-white/10 px-5 py-3 rounded-2xl w-fit">
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-lg bg-[#262626] border border-white/20" /> KOSONG
              </span>
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-lg bg-[#9DB2FF] border border-white/20" /> MENUNGGU BAYAR
              </span>
            </div>

            {/* Grid 10 Tables matching Pelayan grid design */}
            <div className="bg-[#EAEAEA] rounded-3xl p-6 md:p-8 grid grid-cols-2 sm:grid-cols-5 gap-4 border-2 border-[#2B4263]">
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
                    className={`h-24 rounded-2xl flex flex-col items-center justify-center font-black text-2xl transition-all shadow-md cursor-pointer ${
                      hasPending
                        ? 'bg-[#9DB2FF] text-[#2B4263] scale-105 shadow-xl border-2 border-white ring-4 ring-[#9DB2FF]/30'
                        : 'bg-[#262626] text-white hover:bg-black'
                    }`}
                  >
                    <span>{nomorMeja}</span>
                    <span className="text-[9px] font-semibold opacity-70 mt-1 uppercase">
                      {hasPending ? 'MENUNGGU BAYAR' : 'KOSONG'}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="text-center font-black text-orange-400 text-xs tracking-widest uppercase">
              RESTO PAK RESTO
            </div>
          </motion.div>
        )}

        {/* STEP 2: DETAIL PESANAN MEJA XX */}
        {step === 2 && selectedPesanan && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#2B4263] rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 max-w-5xl mx-auto border-4 border-white/10"
          >
            {/* Category tabs */}
            <div className="flex gap-3">
              {['Semua', 'Makanan', 'Minuman'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-6 py-2.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer ${
                    categoryFilter === cat
                      ? 'bg-[#262626] text-white shadow-md'
                      : 'bg-white/80 text-slate-700 hover:bg-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Menu items list */}
              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[420px] overflow-y-auto pr-1">
                {filteredDetails.map((item: any) => (
                  <div
                    key={item.id_detail_pesanan}
                    className="bg-[#1E293B] text-white rounded-2xl p-5 flex flex-col justify-between border border-white/10 shadow-md h-32"
                  >
                    <div className="font-extrabold text-sm leading-tight">
                      {item.menu?.nama_menu} <span className="text-[#FA6338]">x{item.jumlah}</span>
                    </div>
                    <div className="text-orange-400 font-black text-base">
                      Rp {Number(item.menu?.harga || 0).toLocaleString('id-ID')}
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Summary sidebar */}
              <div className="bg-[#EAEAEA] text-slate-800 rounded-3xl p-6 flex flex-col justify-between space-y-6 border-2 border-slate-300">
                <div>
                  <h3 className="font-black text-base text-slate-900 border-b border-slate-300 pb-3 mb-4">
                    Meja #{selectedPesanan.meja?.nomor_meja}
                  </h3>
                  <div className="space-y-2 text-xs font-semibold text-slate-700">
                    {details.map((item: any) => (
                      <div key={item.id_detail_pesanan} className="flex justify-between">
                        <span>{item.menu?.nama_menu}</span>
                        <span className="font-bold">{item.jumlah}x</span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-4 mt-4 border-t border-dashed border-slate-400 flex justify-between text-xs font-black text-slate-900">
                    <span>Total Item :</span>
                    <span>{totalItemsCount} Item</span>
                  </div>
                </div>

                <button
                  onClick={() => setStep(3)}
                  className="w-full py-4 bg-[#FA6338] hover:bg-orange-600 text-white font-extrabold rounded-2xl text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer"
                >
                  LANJUT BAYAR &rarr;
                </button>
              </div>
            </div>

            <div className="text-center font-black text-orange-400 text-xs tracking-widest uppercase">
              RESTO PAK RESTO
            </div>
          </motion.div>
        )}

        {/* STEP 3: PEMBAYARAN MEJA XX */}
        {step === 3 && selectedPesanan && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#2B4263] rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 max-w-5xl mx-auto border-4 border-white/10"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Ringkasan Pesanan Box */}
              <div className="md:col-span-2 bg-[#EAEAEA] rounded-3xl p-6 md:p-8 flex flex-col justify-between border-2 border-slate-300 print-area">
                <div>
                  <h2 className="font-black text-slate-900 text-sm uppercase tracking-wider border-b border-slate-300 pb-3 mb-4">
                    RINGKASAN PESANAN - MEJA {selectedPesanan.meja?.nomor_meja}
                  </h2>
                  <div className="space-y-3">
                    {details.map((item: any) => (
                      <div key={item.id_detail_pesanan} className="flex justify-between text-xs font-bold text-slate-800">
                        <span>{item.menu?.nama_menu} {item.jumlah}x</span>
                        <span>Rp {Number(item.subtotal).toLocaleString('id-ID')}</span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-4 mt-6 border-t border-dashed border-slate-400 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600 font-medium">
                      <span>Service charge</span>
                      <span>Rp {serviceCharge.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-800">
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
              <div className="bg-[#EAEAEA] rounded-3xl p-6 flex flex-col justify-between space-y-4 border-2 border-slate-300 no-print">
                <div className="space-y-4">
                  <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider border-b border-slate-300 pb-2">
                    Metode Pembayaran
                  </h3>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setMetodePembayaran('tunai')}
                      className={`flex flex-col items-center justify-center p-3 rounded-2xl font-black text-xs transition-all cursor-pointer ${
                        metodePembayaran === 'tunai' ? 'bg-[#FA6338] text-white shadow-md' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      <Wallet className="w-5 h-5 mb-1" /> Tunai
                    </button>
                    <button
                      onClick={() => setMetodePembayaran('qr_gopay')}
                      className={`flex flex-col items-center justify-center p-3 rounded-2xl font-black text-xs transition-all cursor-pointer ${
                        metodePembayaran === 'qr_gopay' ? 'bg-[#262626] text-white shadow-md' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      <QrCode className="w-5 h-5 mb-1" /> QRIS
                    </button>
                  </div>

                  {/* If QRIS selected, show WhatsApp image asset per user request */}
                  {metodePembayaran === 'qr_gopay' ? (
                    <div className="bg-white p-4 rounded-2xl text-center border border-slate-200 space-y-2">
                      <div className="w-40 h-40 mx-auto relative rounded-xl overflow-hidden shadow-inner border border-slate-300">
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
                      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                        Nominal Diterima
                      </label>
                      <input
                        type="number"
                        value={nominalDiterima || ''}
                        onChange={(e) => setNominalDiterima(Number(e.target.value))}
                        placeholder="Rp 50.000"
                        className="w-full px-4 py-3 rounded-2xl bg-[#262626] text-white font-extrabold text-sm focus:outline-none placeholder-slate-400"
                      />
                    </div>
                  )}

                  {metodePembayaran === 'tunai' && (
                    <div className="flex justify-between items-center text-xs font-bold text-slate-800 pt-2 border-t border-slate-300">
                      <span>Kembalian</span>
                      <span className="text-[#FA6338] text-base font-black">Rp {kembalian.toLocaleString('id-ID')}</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleProsesBayar}
                  disabled={loading}
                  className="w-full py-4 bg-[#FA6338] hover:bg-orange-600 text-white font-extrabold rounded-2xl text-xs uppercase tracking-wider transition-all shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Memproses...' : 'Bayar & Cetak Struk'}
                </button>
              </div>
            </div>

            <div className="text-center font-black text-orange-400 text-xs tracking-widest uppercase">
              RESTO PAK RESTO
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}


