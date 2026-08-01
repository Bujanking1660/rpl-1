'use client';

import { useState, useEffect } from 'react';
import { getMejaListAction, alokasikanMejaAction, bersihkanMejaAction } from '@/lib/actions/pelayan';
import { logoutStaffAction } from '@/lib/actions/auth';
import { useRouter } from 'next/navigation';
import { Meja } from '@/lib/types/database';
import { toast } from 'sonner';
import { CheckCircle2, LogOut, Users, QrCode, RefreshCw, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { QRCodeSVG } from 'qrcode.react';

export default function PelayanPage() {
  const router = useRouter();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [jumlahPelanggan, setJumlahPelanggan] = useState(2);
  const [mejaList, setMejaList] = useState<Meja[]>([]);
  const [selectedMejaId, setSelectedMejaId] = useState<string | null>(null);
  const [allocatedToken, setAllocatedToken] = useState<string | null>(null);
  const [allocatedMejaNomor, setAllocatedMejaNomor] = useState<string>('');
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

    if (targetMeja.kapasitas < jumlahPelanggan) {
      toast.error(`Kapasitas meja hanya ${targetMeja.kapasitas} orang`);
      return;
    }

    setLoading(true);
    const res = await alokasikanMejaAction(selectedMejaId, jumlahPelanggan);
    setLoading(false);

    if (res.success && res.token_sesi) {
      setAllocatedToken(res.token_sesi);
      setAllocatedMejaNomor(targetMeja.nomor_meja);
      setStep(3);
      toast.success(`Meja ${targetMeja.nomor_meja} berhasil dialokasikan!`);
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

  const mejaTersedia = mejaList.filter((m) => m.status_ketersediaan === 'tersedia').length;
  const mejaTerisi = mejaList.filter((m) => m.status_ketersediaan === 'terisi').length;

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      {/* Header */}
      <header className="bg-[#1e2d42] text-white px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center p-1.5 shadow-md">
            <img src="/logo.png" alt="Pak Resto" className="w-full h-full object-contain" />
          </div>
          <div>
            <p className="font-black text-sm text-white">PAK RESTO</p>
            <p className="text-[10px] text-blue-300">Pelayan</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchMejaList} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-300 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all">
            <LogOut className="w-4 h-4" /> Keluar
          </button>
        </div>
      </header>

      <main className="flex-1 p-5 max-w-4xl mx-auto w-full space-y-5">
        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-800">{mejaTersedia}</p>
              <p className="text-xs text-slate-400 font-medium">Meja Tersedia</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-800">{mejaTerisi}</p>
              <p className="text-xs text-slate-400 font-medium">Meja Terisi</p>
            </div>
          </div>
        </div>

        {/* Alokasi Meja Card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-50 flex items-center gap-2">
            <QrCode className="w-4 h-4 text-orange-500" />
            <h2 className="font-black text-slate-800 text-sm">Alokasi Meja Baru</h2>
          </div>

          <div className="p-5">
            {/* Step 1: Jumlah Pelanggan */}
            {step === 1 && (
              <div className="flex flex-col items-center text-center py-4 gap-6">
                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest mb-1">Jumlah Tamu</p>
                  <div className="flex items-center gap-4 mt-3">
                    <button
                      onClick={() => setJumlahPelanggan((p) => Math.max(1, p - 1))}
                      className="w-12 h-12 bg-slate-100 hover:bg-slate-200 rounded-2xl text-slate-800 text-xl font-black transition-colors"
                    >-</button>
                    <div className="w-20 h-14 bg-orange-500 rounded-2xl flex items-center justify-center text-white text-3xl font-black shadow-md shadow-orange-200">
                      {jumlahPelanggan}
                    </div>
                    <button
                      onClick={() => setJumlahPelanggan((p) => p + 1)}
                      className="w-12 h-12 bg-slate-100 hover:bg-slate-200 rounded-2xl text-slate-800 text-xl font-black transition-colors"
                    >+</button>
                  </div>
                </div>
                <button
                  onClick={() => { setSelectedMejaId(null); setStep(2); }}
                  className="px-8 py-3 bg-[#1e2d42] hover:bg-[#2b3a55] text-white font-bold rounded-2xl text-sm transition-colors shadow-md"
                >
                  Pilih Meja &rarr;
                </button>
              </div>
            )}

            {/* Step 2: Pilih Meja */}
            {step === 2 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-bold text-slate-800 text-sm">Pilih Meja — {jumlahPelanggan} Tamu</p>
                    <p className="text-xs text-slate-400 mt-0.5">Meja aktif kapasitas ≥ {jumlahPelanggan} orang</p>
                  </div>
                  <button onClick={() => setStep(1)} className="text-xs text-orange-500 font-bold hover:underline">
                    ← Ubah Jumlah
                  </button>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-5">
                  {mejaList.map((m) => {
                    const isSelected = selectedMejaId === m.id_meja;
                    const isTerisi = m.status_ketersediaan === 'terisi';
                    const isKurang = m.kapasitas < jumlahPelanggan;
                    const isDisabled = isTerisi || isKurang;

                    return (
                      <button
                        key={m.id_meja}
                        disabled={isDisabled}
                        onClick={() => setSelectedMejaId(m.id_meja)}
                        className={`h-20 rounded-2xl flex flex-col items-center justify-center transition-all text-center border-2 ${
                          isSelected
                            ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-200 scale-105'
                            : isDisabled
                            ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-orange-300 hover:shadow-sm'
                        }`}
                      >
                        <span className="text-lg font-black">{m.nomor_meja}</span>
                        <span className="text-[9px] font-bold mt-0.5">
                          {isTerisi ? 'TERISI' : isKurang ? `Maks ${m.kapasitas}` : `${m.kapasitas} org`}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={handleAlokasikanMeja}
                  disabled={loading || !selectedMejaId}
                  className="w-full py-3 bg-[#1e2d42] hover:bg-[#2b3a55] disabled:opacity-50 text-white font-bold rounded-2xl text-sm transition-colors shadow-md"
                >
                  {loading ? 'Memproses...' : 'Alokasikan & Buat QR Code'}
                </button>
              </div>
            )}

            {/* Step 3: QR Code */}
            {step === 3 && allocatedToken && (
              <div className="flex flex-col items-center text-center gap-5 py-2">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-base">Meja #{allocatedMejaNomor} Siap!</h3>
                  <p className="text-xs text-slate-400 mt-1">Persilakan tamu scan QR berikut untuk membuka menu</p>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-lg border border-slate-100">
                  <QRCodeSVG value={customerUrl} size={200} level="H" includeMargin={true} />
                  <p className="text-[10px] text-slate-500 font-mono mt-2 bg-slate-50 px-2 py-1 rounded-lg">
                    Meja #{allocatedMejaNomor}
                  </p>
                </div>

                <div className="w-full bg-slate-50 rounded-xl px-3 py-2 flex items-center gap-2 border border-slate-100">
                  <span className="text-[10px] text-slate-400 truncate flex-1 font-mono">{customerUrl}</span>
                  <button
                    onClick={() => { navigator.clipboard.writeText(customerUrl); toast.success('Link tersalin!'); }}
                    className="text-[10px] font-bold text-orange-500 hover:text-orange-600 shrink-0"
                  >
                    Salin
                  </button>
                </div>

                <div className="flex gap-3 w-full">
                  <a
                    href={`/meja/${allocatedToken}/menu`}
                    target="_blank"
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl text-xs text-center transition-colors"
                  >
                    Buka Menu
                  </a>
                  <button
                    onClick={() => { setStep(1); setSelectedMejaId(null); setAllocatedToken(null); }}
                    className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl text-xs transition-colors"
                  >
                    Alokasi Baru
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Pembersihan Meja */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-50 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h2 className="font-black text-slate-800 text-sm">Status & Pembersihan Meja</h2>
          </div>
          <div className="p-4 grid grid-cols-3 sm:grid-cols-5 gap-3">
            {mejaList.map((m) => (
              <div
                key={m.id_meja}
                className={`rounded-2xl border p-3 flex flex-col items-center gap-1.5 text-center ${
                  m.status_ketersediaan === 'terisi'
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-slate-50 border-slate-100 opacity-70'
                }`}
              >
                <span className="font-black text-slate-800 text-base">{m.nomor_meja}</span>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                  m.status_ketersediaan === 'terisi' ? 'bg-amber-400 text-white' : 'bg-slate-200 text-slate-500'
                }`}>
                  {m.status_ketersediaan === 'terisi' ? 'Terisi' : 'Kosong'}
                </span>
                {m.status_ketersediaan === 'terisi' && (
                  <button
                    onClick={() => handleBersihkanMeja(m.id_meja, m.nomor_meja)}
                    className="w-full py-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold rounded-lg transition-colors"
                  >
                    Bersihkan
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
