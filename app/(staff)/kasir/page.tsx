'use client';

import { useState, useEffect } from 'react';
import { getPesananPendingKasirAction, prosesPembayaranAction } from '@/lib/actions/kasir';
import { logoutStaffAction } from '@/lib/actions/auth';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { LogOut, Printer, Wallet, QrCode, ArrowLeft, RefreshCw, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function KasirPage() {
  const router = useRouter();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [pesananList, setPesananList] = useState<any[]>([]);
  const [selectedPesanan, setSelectedPesanan] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [metodePembayaran, setMetodePembayaran] = useState<'tunai' | 'qr_gopay'>('tunai');
  const [nominalDiterima, setNominalDiterima] = useState<number>(0);

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
  const subtotalPrice = details.reduce((sum: number, item: any) => sum + Number(item.subtotal || 0), 0);
  const serviceCharge = details.length > 0 ? 5000 : 0;
  const totalPrice = subtotalPrice + serviceCharge;
  const kembalian = Math.max(0, nominalDiterima - totalPrice);

  async function handleProsesBayar(withPrint: boolean) {
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
      if (withPrint) window.print();
      fetchPesananList();
      setStep(1);
      setSelectedPesanan(null);
    } else {
      toast.error(res.error || 'Gagal memproses pembayaran');
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      {/* Header */}
      <header className="bg-[#1e2d42] text-white px-6 py-4 flex items-center justify-between shadow-lg no-print">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-orange-500 rounded-xl p-1.5 shadow-md">
            <img src="/logo.png" alt="Pak Resto" className="w-full h-full object-contain" />
          </div>
          <div>
            <p className="font-black text-sm text-white">PAK RESTO</p>
            <p className="text-[10px] text-blue-300">Kasir</p>
          </div>
        </div>

        {/* Step Breadcrumb */}
        <div className="hidden md:flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-full border border-white/10 text-xs">
          {[1, 2, 3].map((n) => (
            <span key={n} className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
              step === n ? 'bg-orange-500 text-white' : step > n ? 'bg-emerald-500 text-white' : 'bg-white/10 text-slate-400'
            }`}>
              {step > n ? '✓' : n}
            </span>
          ))}
          <span className="text-slate-300 font-semibold ml-1 text-[11px]">
            {step === 1 && 'Pilih Meja'}
            {step === 2 && `Pesanan Meja ${selectedPesanan?.meja?.nomor_meja}`}
            {step === 3 && `Bayar Meja ${selectedPesanan?.meja?.nomor_meja}`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={fetchPesananList} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-300 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all">
            <LogOut className="w-4 h-4" /> Keluar
          </button>
        </div>
      </header>

      <main className="flex-1 p-5 max-w-5xl mx-auto w-full flex flex-col justify-start">
        {/* STEP 1: Grid Meja */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="font-black text-slate-800 text-base">Daftar Meja</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Meja berwarna oranye menunggu pembayaran</p>
                </div>
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-orange-500" />Menunggu Bayar</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-200" />Kosong/Proses</span>
                </div>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
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
                          toast.info(`Meja ${nomorMeja} tidak ada tagihan menunggu`);
                        }
                      }}
                      className={`h-24 rounded-2xl flex flex-col items-center justify-center transition-all border-2 font-black ${
                        hasPending
                          ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-200 hover:bg-orange-600 scale-[1.02]'
                          : 'bg-white border-slate-100 text-slate-300 hover:border-slate-200'
                      }`}
                    >
                      <span className="text-2xl">{nomorMeja}</span>
                      <span className="text-[9px] font-bold mt-0.5 opacity-80">
                        {hasPending ? 'BAYAR' : 'KOSONG'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Detail Pesanan */}
        {step === 2 && selectedPesanan && (
          <div className="space-y-4">
            <button onClick={() => setStep(1)} className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar Meja
            </button>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Item list */}
              <div className="md:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-50">
                  <h2 className="font-black text-slate-800">Pesanan Meja #{selectedPesanan.meja?.nomor_meja}</h2>
                  <p className="text-xs text-slate-400 mt-0.5">{details.length} jenis menu</p>
                </div>
                <div className="divide-y divide-slate-50">
                  {details.map((item: any) => (
                    <div key={item.id_detail_pesanan} className="flex items-center justify-between px-5 py-4">
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{item.menu?.nama_menu}</p>
                        <p className="text-xs text-slate-400">{item.jumlah} × Rp {Number(item.menu?.harga || 0).toLocaleString('id-ID')}</p>
                      </div>
                      <span className="font-bold text-slate-800 text-sm">
                        Rp {Number(item.subtotal).toLocaleString('id-ID')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col justify-between">
                <div className="space-y-3">
                  <h3 className="font-black text-slate-800">Ringkasan</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-slate-500">
                      <span>Subtotal</span>
                      <span>Rp {subtotalPrice.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Biaya Layanan</span>
                      <span>Rp {serviceCharge.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between font-black text-slate-800 text-base pt-2 border-t border-slate-100">
                      <span>Total</span>
                      <span className="text-orange-500">Rp {totalPrice.toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setStep(3)}
                  className="w-full py-3 mt-5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl text-sm transition-colors shadow-md"
                >
                  Proses Pembayaran &rarr;
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Pembayaran */}
        {step === 3 && selectedPesanan && (
          <div className="space-y-4">
            <button onClick={() => setStep(2)} className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors no-print">
              <ArrowLeft className="w-4 h-4" /> Kembali ke Detail Pesanan
            </button>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Struk area */}
              <div className="md:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden print-area">
                <div className="px-5 py-4 text-center border-b border-slate-100">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <img src="/logo.png" alt="Pak Resto" className="w-6 h-6 object-contain" />
                    <h2 className="font-black text-slate-800">PAK RESTO UNIKOM</h2>
                  </div>
                  <p className="text-xs text-slate-400">Meja #{selectedPesanan.meja?.nomor_meja} — Struk Pembayaran</p>
                </div>
                <div className="divide-y divide-slate-50">
                  {details.map((item: any) => (
                    <div key={item.id_detail_pesanan} className="flex items-center justify-between px-5 py-3.5">
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{item.menu?.nama_menu}</p>
                        <p className="text-xs text-slate-400">{item.jumlah} porsi</p>
                      </div>
                      <span className="font-bold text-slate-800 text-sm">
                        Rp {Number(item.subtotal).toLocaleString('id-ID')}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="px-5 py-3 space-y-2 border-t border-slate-100 bg-slate-50">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Subtotal</span><span>Rp {subtotalPrice.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Biaya Layanan</span><span>Rp {serviceCharge.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between font-black text-slate-800 text-base pt-2 border-t border-slate-200">
                    <span>Total Bayar</span>
                    <span className="text-orange-500">Rp {totalPrice.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>

              {/* Metode bayar */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-4 no-print">
                <h3 className="font-black text-slate-800">Metode Pembayaran</h3>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'tunai', label: 'Tunai', icon: <Wallet className="w-4 h-4" /> },
                    { value: 'qr_gopay', label: 'QRIS GoPay', icon: <QrCode className="w-4 h-4" /> },
                  ].map(({ value, label, icon }) => (
                    <button
                      key={value}
                      onClick={() => setMetodePembayaran(value as 'tunai' | 'qr_gopay')}
                      className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl font-bold text-xs transition-all border-2 ${
                        metodePembayaran === value
                          ? 'bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-200'
                          : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      {icon} {label}
                    </button>
                  ))}
                </div>

                {metodePembayaran === 'tunai' ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                        Uang Diterima
                      </label>
                      <input
                        type="number"
                        value={nominalDiterima || ''}
                        onChange={(e) => setNominalDiterima(Number(e.target.value))}
                        placeholder="Contoh: 50000"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 font-bold focus:outline-none focus:border-orange-400 text-sm transition-colors"
                      />
                    </div>
                    <div className="flex justify-between items-center bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
                      <span className="text-xs text-emerald-700 font-semibold">Kembalian</span>
                      <span className="text-sm font-black text-emerald-700">
                        Rp {kembalian.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-2xl p-3 flex flex-col items-center gap-2 border border-slate-100">
                    <p className="text-[11px] font-bold text-slate-500">Scan QR GoPay Kasir</p>
                    <img
                      src="/gopay.png"
                      alt="QR GoPay"
                      className="w-40 h-40 object-contain rounded-xl"
                      onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                    />
                  </div>
                )}

                <div className="space-y-2 mt-auto">
                  <button
                    onClick={() => handleProsesBayar(true)}
                    disabled={loading}
                    className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition-colors shadow-md disabled:opacity-60"
                  >
                    {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Printer className="w-4 h-4" /> Bayar & Cetak Struk</>}
                  </button>
                  <button
                    onClick={() => handleProsesBayar(false)}
                    disabled={loading}
                    className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Konfirmasi Tanpa Struk
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
