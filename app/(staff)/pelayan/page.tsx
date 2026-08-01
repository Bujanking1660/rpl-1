'use client';

import { useState, useEffect } from 'react';
import { getMejaListAction, alokasikanMejaAction, bersihkanMejaAction } from '@/lib/actions/pelayan';
import { logoutStaffAction } from '@/lib/actions/auth';
import { useRouter } from 'next/navigation';
import { Meja } from '@/lib/types/database';
import { toast } from 'sonner';
import { LogOut, ArrowRight, ArrowLeft, QrCode, Sparkles, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PelayanPage() {
  const router = useRouter();

  const [mainTab, setMainTab] = useState<'ALOKASI' | 'STATUS'>('ALOKASI');
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [jumlahPelanggan, setJumlahPelanggan] = useState(0);
  const [mejaList, setMejaList] = useState<Meja[]>([]);
  const [selectedMejaId, setSelectedMejaId] = useState<string | null>(null);
  const [allocatedToken, setAllocatedToken] = useState<string | null>(null);
  const [allocatedMejaNomor, setAllocatedMejaNomor] = useState<string>('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMejaList();

    const supabase = createClient();
    const channel = supabase
      .channel('pelayan-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meja' }, () => fetchMejaList())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function fetchMejaList() {
    const res = await getMejaListAction();
    if (res.success && res.data) setMejaList(res.data as Meja[]);
  }

  async function handleAlokasikanMeja() {
    if (!selectedMejaId) { toast.error('Pilih meja terlebih dahulu'); return; }

    const targetMeja = mejaList.find((m) => m.id_meja === selectedMejaId);
    if (!targetMeja) return;

    setLoading(true);
    const res = await alokasikanMejaAction(selectedMejaId, jumlahPelanggan || 2);
    setLoading(false);

    if (res.success && res.token_sesi) {
      setAllocatedToken(res.token_sesi);
      setAllocatedMejaNomor(targetMeja.nomor_meja);
      setShowConfirmModal(false);
      setStep(3);
      toast.success(`Meja ${targetMeja.nomor_meja} berhasil diaktifkan!`);
      fetchMejaList();
    } else {
      toast.error(res.error || 'Gagal mengalokasikan meja');
    }
  }

  async function handleBersihkanMeja(id_meja: string, nomor: string) {
    if (!confirm(`Bersihkan Meja ${nomor} dan ubah status menjadi tersedia?`)) return;
    const res = await bersihkanMejaAction(id_meja);
    if (res.success) {
      toast.success(`Meja ${nomor} sekarang tersedia`);
      fetchMejaList();
    } else {
      toast.error(res.error || 'Gagal membersihkan meja');
    }
  }

  async function handleLogout() {
    await logoutStaffAction('pelayan');
    router.push('/login');
  }

  const customerUrl = allocatedToken
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/meja/${allocatedToken}/menu`
    : '';

  return (
    <div className="min-h-screen bg-[#35485E] p-4 md:p-8 flex flex-col items-center justify-between relative">
      {/* Top Bar with Navigation Tabs & Logout */}
      <div className="w-full max-w-2xl flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 bg-white/10 p-1 rounded-2xl border border-white/20 backdrop-blur-md">
          <button
            onClick={() => setMainTab('ALOKASI')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              mainTab === 'ALOKASI' ? 'bg-[#FA6338] text-white shadow-md' : 'text-slate-200 hover:text-white'
            }`}
          >
            <QrCode className="w-4 h-4" /> Alokasi Meja
          </button>
          <button
            onClick={() => setMainTab('STATUS')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              mainTab === 'STATUS' ? 'bg-[#FA6338] text-white shadow-md' : 'text-slate-200 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" /> Kelola Status Meja
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={fetchMejaList} className="p-2 text-white/80 hover:text-white bg-white/10 rounded-xl">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all"
          >
            <LogOut className="w-4 h-4" /> Keluar
          </button>
        </div>
      </div>

      {/* Main Container Card */}
      <div className="w-full max-w-2xl bg-[#EAEAEA] rounded-3xl p-6 md:p-8 shadow-2xl border-4 border-[#2B4263] flex flex-col justify-between min-h-[460px] relative">
        
        {/* ALOKASI MEJA TAB */}
        {mainTab === 'ALOKASI' && (
          <>
            {/* STEP 1: JUMLAH PELANGGAN */}
            {step === 1 && (
              <div className="flex-1 flex flex-col justify-between items-center text-center space-y-6 py-4">
                <h2 className="text-sm font-extrabold text-slate-800 tracking-wider uppercase">
                  JUMLAH PELANGGAN
                </h2>

                <div className="w-full max-w-md bg-white rounded-2xl p-6 flex items-center justify-between border border-slate-300 shadow-inner">
                  <span className="text-5xl font-black text-[#FA6338]">{jumlahPelanggan}</span>
                  <div className="w-20 h-20 relative flex items-center justify-center">
                    <img src="/logo.png" alt="Pak Resto Icon" className="w-full h-full object-contain" />
                  </div>
                </div>

                <div className="w-full max-w-md flex gap-4">
                  <button
                    onClick={() => setJumlahPelanggan((p) => Math.max(0, p - 1))}
                    className="w-16 h-14 bg-[#262626] hover:bg-black text-white text-3xl font-black rounded-2xl transition-all shadow-md active:scale-95"
                  >
                    -
                  </button>
                  <button
                    onClick={() => setJumlahPelanggan((p) => p + 1)}
                    className="w-16 h-14 bg-[#262626] hover:bg-black text-white text-3xl font-black rounded-2xl transition-all shadow-md active:scale-95"
                  >
                    +
                  </button>
                  <button
                    onClick={() => setStep(2)}
                    className="flex-1 py-4 bg-[#FA6338] hover:bg-orange-600 active:scale-98 text-white font-extrabold rounded-2xl text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    LANJUT <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: TABLE SELECTION GRID */}
            {step === 2 && (
              <div className="flex-1 flex flex-col justify-between space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    PILIH MEJA (TAMU: {jumlahPelanggan})
                  </span>
                  <button
                    onClick={() => setStep(1)}
                    className="flex items-center gap-1 text-xs font-bold text-[#FA6338] hover:underline"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Kembali
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                  {Array.from({ length: 10 }).map((_, index) => {
                    const nomorMeja = String(index + 1).padStart(2, '0');
                    const mejaObj = mejaList.find((m) => m.nomor_meja === nomorMeja);
                    const isSelected = selectedMejaId === mejaObj?.id_meja;
                    const isTerisi = mejaObj?.status_ketersediaan === 'terisi';

                    return (
                      <button
                        key={nomorMeja}
                        disabled={isTerisi}
                        onClick={() => mejaObj && setSelectedMejaId(mejaObj.id_meja)}
                        className={`h-24 rounded-2xl font-black text-2xl transition-all flex flex-col items-center justify-center ${
                          isSelected
                            ? 'bg-[#FA6338] text-white scale-105 shadow-xl border-2 border-white'
                            : isTerisi
                            ? 'bg-[#8C8C8C] text-white cursor-not-allowed opacity-80'
                            : 'bg-[#262626] text-white hover:bg-black'
                        }`}
                      >
                        <span>{nomorMeja}</span>
                        <span className="text-[9px] font-semibold opacity-70 mt-1 uppercase">
                          {isTerisi ? 'Terisi' : 'Kosong'}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-300">
                  <button
                    onClick={() => setStep(1)}
                    className="px-6 py-3.5 bg-slate-300 hover:bg-slate-400 text-slate-800 font-extrabold rounded-2xl text-xs uppercase tracking-wider transition-all flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" /> KEMBALI
                  </button>

                  <button
                    disabled={!selectedMejaId}
                    onClick={() => setShowConfirmModal(true)}
                    className="px-8 py-3.5 bg-[#FA6338] hover:bg-orange-600 disabled:opacity-50 text-white font-extrabold rounded-2xl text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-2 cursor-pointer"
                  >
                    LANJUT <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: QR CODE DISPLAY */}
            {step === 3 && allocatedToken && (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 py-4">
                <div className="bg-white p-6 rounded-3xl shadow-xl flex items-center gap-8 border border-slate-200">
                  <QRCodeSVG value={customerUrl} size={180} level="H" includeMargin={true} />
                  <div className="w-24 h-24 relative flex items-center justify-center">
                    <img src="/logo.png" alt="Pak Resto Icon" className="w-full h-full object-contain" />
                  </div>
                </div>

                <p className="text-xs font-bold text-slate-700 bg-white px-4 py-2 rounded-xl border border-slate-300">
                  Meja #{allocatedMejaNomor} — Scan untuk Membuka Menu
                </p>

                <div className="flex justify-end w-full pt-4 border-t border-slate-300">
                  <button
                    onClick={() => { setStep(1); setSelectedMejaId(null); setAllocatedToken(null); }}
                    className="px-8 py-3.5 bg-[#FA6338] hover:bg-orange-600 text-white font-extrabold rounded-2xl text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-2 cursor-pointer"
                  >
                    LANJUT <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* KELOLA STATUS MEJA TAB */}
        {mainTab === 'STATUS' && (
          <div className="flex-1 flex flex-col justify-between space-y-6">
            <div>
              <h2 className="text-sm font-extrabold text-slate-800 tracking-wider uppercase mb-1">
                KELOLA & PEMBERSIHAN MEJA
              </h2>
              <p className="text-xs text-slate-500 font-medium">Ubah status meja terisi menjadi kosong/tersedia</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              {mejaList.map((m) => (
                <div
                  key={m.id_meja}
                  className={`rounded-2xl border p-4 flex flex-col items-center justify-between text-center gap-2 ${
                    m.status_ketersediaan === 'terisi'
                      ? 'bg-amber-100 border-amber-300 shadow-md'
                      : 'bg-white border-slate-300'
                  }`}
                >
                  <span className="font-extrabold text-2xl text-slate-800">{m.nomor_meja}</span>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                    m.status_ketersediaan === 'terisi' ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {m.status_ketersediaan}
                  </span>
                  {m.status_ketersediaan === 'terisi' && (
                    <button
                      onClick={() => handleBersihkanMeja(m.id_meja, m.nomor_meja)}
                      className="w-full py-2 bg-[#2B4263] hover:bg-[#1f3049] text-white text-xs font-bold rounded-xl transition-all shadow-xs"
                    >
                      Bersihkan
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-300 text-right">
              <button
                onClick={() => setMainTab('ALOKASI')}
                className="px-6 py-3 bg-[#FA6338] text-white font-extrabold text-xs rounded-2xl uppercase tracking-wider"
              >
                Kembali ke Alokasi Meja
              </button>
            </div>
          </div>
        )}

        {/* Footer Brand */}
        <div className="text-center font-black text-orange-500 text-xs tracking-widest uppercase mt-4">
          RESTO PAK RESTO
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center space-y-6 shadow-2xl border border-slate-200">
            <h3 className="text-sm font-bold text-[#2B4263] leading-relaxed">
              Apakah yakin ingin mengubah status meja menjadi aktif?
            </h3>

            <div className="flex gap-4">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-3 bg-[#FA6338] hover:bg-orange-600 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-md cursor-pointer"
              >
                BATAL
              </button>
              <button
                onClick={handleAlokasikanMeja}
                disabled={loading}
                className="flex-1 py-3 bg-[#2B4263] hover:bg-[#1f3049] text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-md flex items-center justify-center gap-1 cursor-pointer"
              >
                {loading ? 'Proses...' : <>LANJUT <ArrowRight className="w-3.5 h-3.5" /></>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


