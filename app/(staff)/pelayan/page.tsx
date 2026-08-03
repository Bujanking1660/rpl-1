'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getMejaListAction,
  alokasikanMejaAction,
  bersihkanMejaAction,
} from '@/lib/actions/pelayan';
import { logoutStaffAction, getStaffSessionAction } from '@/lib/actions/auth';
import { useRouter } from 'next/navigation';
import { Meja } from '@/lib/types/database';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Table2,
  LogOut,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  Minus,
  Plus,
  X,
  Copy,
  Check,
  Sparkles,
  Info,
  Trash2,
  CheckCircle2,
} from 'lucide-react';

type Tab = 'ALOKASI' | 'STATUS';
type AlokasiStep = 1 | 2;

// H7: Quick presets reduce keystrokes for common party sizes
const QUICK_PRESETS = [2, 4, 6, 8];

export default function PelayanPage() {
  const router = useRouter();

  // ── Navigation ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<Tab>('ALOKASI');
  const [session, setSession] = useState<{ nama_pegawai?: string } | null>(null);

  // ── Alokasi state ────────────────────────────────────────────────────────────
  const [alokasiStep, setAlokasiStep] = useState<AlokasiStep>(1);
  const [jumlahPelanggan, setJumlahPelanggan] = useState(0);
  const [inputStr, setInputStr] = useState('0');
  const [selectedMejaId, setSelectedMejaId] = useState<string | null>(null);

  // ── Global data ──────────────────────────────────────────────────────────────
  const [mejaList, setMejaList] = useState<Meja[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [allocatedTokens, setAllocatedTokens] = useState<Record<string, string>>({});

  // ── Modals ───────────────────────────────────────────────────────────────────
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isAllocating, setIsAllocating] = useState(false);
  const [qrModalMeja, setQrModalMeja] = useState<Meja | null>(null);
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanConfirmId, setCleanConfirmId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [lanIp, setLanIp] = useState<string | null>(null);

  // ── Realtime / data fetching ─────────────────────────────────────────────────
  const fetchMejaList = useCallback(async () => {
    setIsFetching(true);
    const res = await getMejaListAction();
    if (res.success && res.data) setMejaList(res.data as Meja[]);
    setIsFetching(false);
  }, []);

  const refreshAll = useCallback(() => {
    fetchMejaList();
  }, [fetchMejaList]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      fetchMejaList();
      getStaffSessionAction('pelayan').then((sess) => setSession(sess));
    }, 0);
    fetch('/api/lan-ip')
      .then((r) => r.json())
      .then((d) => { if (d.ip) setLanIp(d.ip as string); })
      .catch(() => {});
    const supabase = createClient();
    const channel = supabase
      .channel('pelayan-meja')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meja' }, fetchMejaList)
      .subscribe();
    return () => {
      window.clearTimeout(initialLoad);
      supabase.removeChannel(channel);
    };
  }, [fetchMejaList]);

  // ── H7: Keyboard support – Enter to advance, Esc to close modals ────────────
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (showConfirmModal) setShowConfirmModal(false);
        if (qrModalMeja) setQrModalMeja(null);
        if (cleanConfirmId) setCleanConfirmId(null);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showConfirmModal, qrModalMeja, cleanConfirmId]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  function handleTabChange(tab: Tab) {
    setActiveTab(tab);
    // H3: Preserve context when switching tabs
    if (tab === 'ALOKASI') setAlokasiStep(1);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    if (raw === '') {
      setInputStr('');
      setJumlahPelanggan(0);
    } else {
      const num = parseInt(raw, 10);
      const clamped = Math.min(num, 20); // H5: cap to reasonable max
      setInputStr(String(clamped));
      setJumlahPelanggan(clamped);
    }
  }

  function adjustCount(delta: number) {
    const next = Math.min(20, Math.max(0, jumlahPelanggan + delta));
    setJumlahPelanggan(next);
    setInputStr(String(next));
  }

  function advanceToTableSelection() {
    if (jumlahPelanggan >= 1) setAlokasiStep(2);
  }

  function jumpToAlokasiFor(meja: Meja) {
    // H7: Smart default – prefill count & table, skip redundant steps
    setActiveTab('ALOKASI');
    setAlokasiStep(2);
    setSelectedMejaId(meja.id_meja);
    setJumlahPelanggan(meja.kapasitas);
    setInputStr(String(meja.kapasitas));
    setQrModalMeja(null);
    toast.info(`Meja ${meja.nomor_meja} dipilih — sesuaikan jumlah tamu jika perlu`);
  }

  async function handleAlokasikanMeja() {
    if (!selectedMejaId) return;
    const targetMeja = mejaList.find(m => m.id_meja === selectedMejaId);
    if (!targetMeja) return;

    setIsAllocating(true);
    const res = await alokasikanMejaAction(selectedMejaId, jumlahPelanggan);
    setIsAllocating(false);

    if (res.success && res.token_sesi) {
      setAllocatedTokens(prev => ({ ...prev, [targetMeja.id_meja]: res.token_sesi as string }));
      setShowConfirmModal(false);
      setQrModalMeja(targetMeja);
      toast.success(`Meja ${targetMeja.nomor_meja} berhasil diaktifkan!`);
      fetchMejaList();
      // Reset alokasi flow for next session
      setSelectedMejaId(null);
      setAlokasiStep(1);
      setJumlahPelanggan(0);
      setInputStr('0');
    } else {
      toast.error(res.error || 'Gagal mengalokasikan meja. Coba lagi.');
    }
  }

  async function handleBersihkanMeja(id_meja: string, nomor: string) {
    setIsCleaning(true);
    const res = await bersihkanMejaAction(id_meja);
    setIsCleaning(false);
    if (res.success) {
      setAllocatedTokens(prev => {
        const next = { ...prev };
        delete next[id_meja];
        return next;
      });
      toast.success(`Meja ${nomor} sudah siap untuk tamu berikutnya`);
      setCleanConfirmId(null);
      setQrModalMeja(null);
      fetchMejaList();
    } else {
      toast.error(res.error || 'Gagal membersihkan meja. Coba lagi.');
    }
  }

  async function handleLogout() {
    await logoutStaffAction('pelayan');
    router.push('/login');
  }

  function copyQrLink(url: string) {
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  // ── Meja helpers ─────────────────────────────────────────────────────────────
  function getMejaState(m: Meja) {
    const isOccupied = m.status_ketersediaan === 'terisi';
    const canFit = m.kapasitas >= jumlahPelanggan;
    const isSelected = m.id_meja === selectedMejaId;
    return { isOccupied, canFit, isSelected, isDisabled: isOccupied || !canFit };
  }

  function getMejaClass(m: Meja): string {
    const { isOccupied, canFit, isSelected } = getMejaState(m);
    if (isSelected) return 'bg-[#2B4263] text-white ring-2 ring-[#2B4263]/25 scale-105 shadow-lg';
    if (isOccupied) return 'bg-[#FFF0EB] text-[#FA6338] cursor-not-allowed border border-[#FBD9CC]';
    if (!canFit) return 'bg-slate-50 text-slate-300 cursor-not-allowed border border-dashed border-slate-200';
    return 'bg-white text-[#2B4263] border border-slate-200 hover:border-[#2B4263]/40 hover:shadow-md active:scale-95 shadow-sm';
  }

  function getMejaLabel(m: Meja): string {
    const { isOccupied, canFit } = getMejaState(m);
    if (isOccupied) return 'Terisi';
    if (!canFit) return `Maks ${m.kapasitas}`;
    return `${m.kapasitas} org`;
  }

  function getStatusMejaClass(m: Meja): string {
    if (m.status_ketersediaan === 'terisi') return 'bg-[#FA6338] text-white hover:bg-[#e8552a] active:scale-95 shadow-md';
    return 'bg-white text-[#2B4263] border border-slate-200 hover:border-[#2B4263]/40 hover:shadow-md active:scale-95 shadow-sm';
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const port = typeof window !== 'undefined' ? window.location.port : '';
  const qrBaseUrl = lanIp ? `http://${lanIp}${port ? `:${port}` : ''}` : origin;

  // H1: Derived counts shown throughout for system status visibility
  const terisiCount = mejaList.filter(m => m.status_ketersediaan === 'terisi').length;
  const tersediaCount = mejaList.filter(m => m.status_ketersediaan === 'tersedia').length;
  const totalMeja = mejaList.length;
  const okupansiPct = totalMeja > 0 ? Math.round((terisiCount / totalMeja) * 100) : 0;

  const navItems: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'ALOKASI', label: 'Alokasi Meja', icon: <Users className="w-4 h-4" /> },
    { key: 'STATUS', label: 'Status Meja', icon: <Table2 className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen app-bg flex flex-col md:flex-row text-slate-800">
      {/* ═══════════════════════════════════════════════════════════════════════
          SIDEBAR NAVIGATION (H4: consistency across staff pages)
      ═══════════════════════════════════════════════════════════════════════ */}
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

          {/* Navigation Links (H6: recognition) */}
          <nav className="space-y-2">
            {navItems.map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => handleTabChange(key)}
                aria-current={activeTab === key ? 'page' : undefined}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === key
                    ? 'bg-[#2B4263] text-white shadow-md'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                {icon}
                <span>{label}</span>
                {key === 'STATUS' && terisiCount > 0 && (
                  <span className="ml-auto text-[9px] font-black bg-[#FA6338] text-white rounded-full min-w-[18px] h-[18px] px-0.5 flex items-center justify-center">
                    {terisiCount}
                  </span>
                )}
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

      {/* ═══════════════════════════════════════════════════════════════════════
          MAIN CONTENT AREA
      ═══════════════════════════════════════════════════════════════════════ */}
      <main className="flex-1 p-6 md:p-10 space-y-6">
        {/* Greeting + status header (H1: system status visibility) */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-[#2B4263]">
              Selamat Datang, {session?.nama_pegawai || 'Pelayan'}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {totalMeja > 0
                ? `${terisiCount} dari ${totalMeja} meja terisi · ${okupansiPct}% okupansi`
                : 'Memuat status meja…'}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Realtime
            </span>
            <button
              onClick={refreshAll}
              title="Muat ulang data"
              aria-label="Muat ulang data"
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-white rounded-xl transition-all cursor-pointer bg-white/60"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* ═══════════════════════════════════════════════════════════════════
              TAB: ALOKASI MEJA
          ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'ALOKASI' && (
            <motion.section
              key="alokasi"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* H1: Step indicator */}
              <div className="flex items-center justify-center gap-2">
                {[1, 2].map(step => (
                  <div key={step} className="flex items-center gap-2">
                    <div
                      className={`flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest transition-all ${
                        alokasiStep >= step ? 'text-[#2B4263]' : 'text-slate-400'
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] transition-all ${
                          alokasiStep >= step ? 'bg-[#2B4263] text-white' : 'bg-slate-200 text-slate-400'
                        }`}
                      >
                        {step}
                      </span>
                      {step === 1 ? 'Jumlah Tamu' : 'Pilih Meja'}
                    </div>
                    {step === 1 && <div className={`h-0.5 w-10 rounded ${alokasiStep === 2 ? 'bg-[#2B4263]' : 'bg-slate-200'}`} />}
                  </div>
                ))}
              </div>

              {/* ── STEP 1: Jumlah Pelanggan ─────────────────────────────────── */}
              {alokasiStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="card p-6 md:p-8"
                >
                  <div className="max-w-md mx-auto space-y-5">
                    <div className="text-center">
                      <div className="w-12 h-12 rounded-2xl bg-[#EEF2F8] flex items-center justify-center mx-auto mb-3">
                        <Users className="w-6 h-6 text-[#2B4263]" />
                      </div>
                      <h2 className="text-base font-black text-slate-800">Berapa Tamu?</h2>
                      <p className="text-[11px] text-slate-400 mt-1">Pilih jumlah orang yang akan duduk</p>
                    </div>

                    {/* H2: Big, readable number */}
                    <div>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={inputStr}
                        placeholder="0"
                        aria-label="Jumlah pelanggan"
                        onFocus={(e) => e.target.select()}
                        onChange={handleInputChange}
                        onKeyDown={(e) => { if (e.key === 'Enter') advanceToTableSelection(); }}
                        className="w-full text-center text-6xl font-black text-[#2B4263] border-2 border-slate-200 rounded-2xl py-4 focus:outline-none focus:border-[#2B4263] bg-slate-50 focus:bg-white transition-colors"
                      />
                      {/* H5: real-time validation hint */}
                      <p className={`text-[10px] mt-2 text-center font-semibold ${jumlahPelanggan < 1 ? 'text-red-400' : 'text-emerald-500'}`}>
                        {jumlahPelanggan < 1
                          ? 'Masukkan minimal 1 tamu untuk melanjutkan'
                          : jumlahPelanggan >= 20
                            ? 'Maksimal 20 tamu per meja'
                            : `${jumlahPelanggan} tamu · silakan lanjut`}
                      </p>
                    </div>

                    {/* H7: Quick presets */}
                    <div className="flex justify-center gap-2">
                      {QUICK_PRESETS.map(n => (
                        <button
                          key={n}
                          onClick={() => { setJumlahPelanggan(n); setInputStr(String(n)); }}
                          aria-label={`Pilih ${n} tamu`}
                          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                            jumlahPelanggan === n
                              ? 'bg-[#2B4263] text-white shadow-md'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          {n} org
                        </button>
                      ))}
                    </div>

                    <div className="flex gap-3">
                      {/* H5: disable minus at 0 */}
                      <button
                        onClick={() => adjustCount(-1)}
                        disabled={jumlahPelanggan <= 0}
                        aria-label="Kurangi satu tamu"
                        className="flex-1 h-12 bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-[#2B4263] rounded-xl transition-all active:scale-95 flex items-center justify-center cursor-pointer"
                      >
                        <Minus className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => adjustCount(1)}
                        disabled={jumlahPelanggan >= 20}
                        aria-label="Tambah satu tamu"
                        className="flex-1 h-12 bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-[#2B4263] rounded-xl transition-all active:scale-95 flex items-center justify-center cursor-pointer"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                      <button
                        disabled={jumlahPelanggan < 1}
                        onClick={advanceToTableSelection}
                        aria-label="Lanjut ke pilih meja"
                        className="flex-[2] h-12 bg-[#2B4263] hover:bg-[#1f3049] disabled:opacity-40 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1 shadow-md"
                      >
                        Pilih Meja <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-5 mt-6 border-t border-slate-100 text-[10px] text-slate-400 font-semibold">
                    <span className="uppercase tracking-widest">Resto Pak Resto</span>
                    <span>{isFetching ? 'Memperbarui…' : `${tersediaCount} meja tersedia saat ini`}</span>
                  </div>
                </motion.div>
              )}

              {/* ── STEP 2: Pilih Meja ───────────────────────────────────────── */}
              {alokasiStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="card p-6 md:p-8"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      {/* H6: Recognition – legend */}
                      <div className="flex items-center gap-3 text-[9px] font-semibold text-slate-400">
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-white border border-slate-200 inline-block" /> Tersedia</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#2B4263] inline-block" /> Dipilih</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#FFF0EB] border border-[#FBD9CC] inline-block" /> Terisi</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-slate-50 border border-dashed border-slate-200 inline-block" /> Kurang muat</span>
                      </div>
                      <p className="text-[10px] font-extrabold text-[#2B4263] uppercase tracking-widest">
                        Cari meja untuk {jumlahPelanggan} tamu
                      </p>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-6 gap-3">
                      {mejaList.map(m => {
                        const { isDisabled } = getMejaState(m);
                        return (
                          <button
                            key={m.id_meja}
                            disabled={isDisabled}
                            onClick={() => !isDisabled && setSelectedMejaId(prev => prev === m.id_meja ? null : m.id_meja)}
                            title={isDisabled
                              ? (m.status_ketersediaan === 'terisi'
                                  ? `Meja ${m.nomor_meja} sedang terisi`
                                  : `Meja ${m.nomor_meja} hanya cukup untuk ${m.kapasitas} orang`)
                              : `Pilih Meja ${m.nomor_meja} (${m.kapasitas} orang)`}
                            aria-pressed={getMejaState(m).isSelected}
                            className={`rounded-xl flex flex-col items-center justify-center py-3 gap-0.5 font-black text-xl transition-all cursor-pointer ${getMejaClass(m)}`}
                          >
                            <span>{m.nomor_meja}</span>
                            <span className="text-[8px] font-semibold opacity-80 uppercase tracking-wide">
                              {getMejaLabel(m)}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* H1: selected meja feedback */}
                    {selectedMejaId ? (
                      <div className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-[#EEF2F8] border border-[#2B4263]/15 rounded-xl text-xs text-[#2B4263] font-semibold">
                        <CheckCircle2 className="w-4 h-4" />
                        Meja {mejaList.find(m => m.id_meja === selectedMejaId)?.nomor_meja} dipilih — tekan Lanjut untuk konfirmasi
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] text-slate-400">
                        <Info className="w-3.5 h-3.5" />
                        Tekan salah satu meja untuk memilihnya
                      </div>
                    )}
                  </div>

                  {/* H3: easy undo – back / cancel */}
                  <div className="flex justify-between items-center pt-5 mt-6 border-t border-slate-100">
                    <button
                      onClick={() => { setAlokasiStep(1); setSelectedMejaId(null); }}
                      aria-label="Kembali ke jumlah tamu"
                      className="btn-ghost"
                    >
                      <ArrowLeft className="w-4 h-4" /> Kembali
                    </button>
                    <button
                      disabled={!selectedMejaId}
                      onClick={() => setShowConfirmModal(true)}
                      aria-label="Konfirmasi alokasi meja"
                      className="btn-primary"
                    >
                      Lanjut <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.section>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              TAB: STATUS MEJA
          ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'STATUS' && (
            <motion.section
              key="status"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="card p-6 md:p-8">
                {/* H1: Occupancy summary */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="bg-gradient-to-br from-[#2B4263] to-[#355070] rounded-2xl p-4 text-white flex items-center justify-between shadow-md">
                    <div>
                      <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Terisi</p>
                      <p className="text-3xl font-black mt-0.5">{terisiCount}</p>
                    </div>
                    <span className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                      <Table2 className="w-5 h-5 text-orange-300" />
                    </span>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tersedia</p>
                      <p className="text-3xl font-black text-[#2B4263] mt-0.5">{tersediaCount}</p>
                    </div>
                    <span className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    </span>
                  </div>
                </div>

                {/* H6: Legend */}
                <div className="flex items-center gap-3 mb-4 text-[9px] font-semibold text-slate-400">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#FA6338] inline-block" /> Terisi (klik untuk kelola)</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-white border border-slate-200 inline-block" /> Kosong</span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-6 gap-3">
                  {mejaList.map(m => (
                    <button
                      key={m.id_meja}
                      onClick={() => setQrModalMeja(m)}
                      title={`Meja ${m.nomor_meja} — ${m.status_ketersediaan === 'terisi' ? 'Terisi, klik untuk lihat QR / bersihkan' : 'Kosong, klik untuk langsung alokasikan'}`}
                      aria-label={`Meja ${m.nomor_meja}, ${m.status_ketersediaan === 'terisi' ? 'terisi' : 'kosong'}`}
                      className={`rounded-xl flex flex-col items-center justify-center py-3 gap-0.5 font-black text-xl transition-all cursor-pointer ${getStatusMejaClass(m)}`}
                    >
                      <span>{m.nomor_meja}</span>
                      <span className="text-[8px] font-semibold opacity-80 uppercase tracking-wide">
                        {m.status_ketersediaan === 'terisi' ? 'Terisi' : 'Kosong'}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-5 mt-6 border-t border-slate-100 text-[10px] text-slate-400 font-semibold">
                  <span className="uppercase tracking-widest">Resto Pak Resto</span>
                  <span>{isFetching ? 'Memperbarui…' : 'Data diperbarui secara otomatis'}</span>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL: KONFIRMASI ALOKASI
      ═══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showConfirmModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-end justify-center p-6 z-50 sm:items-center"
            onClick={() => setShowConfirmModal(false)}
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-2xl text-center space-y-4"
              onClick={e => e.stopPropagation()}
              role="alertdialog"
              aria-label="Konfirmasi alokasi meja"
            >
              <div className="w-12 h-12 bg-[#EEF2F8] rounded-2xl flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6 text-[#2B4263]" />
              </div>
              <p className="text-sm font-bold text-slate-800 leading-snug">
                Aktifkan Meja {mejaList.find(m => m.id_meja === selectedMejaId)?.nomor_meja}?
              </p>
              <p className="text-[11px] text-slate-400">
                Meja akan ditandai terisi dan QR dibuat untuk <b>{jumlahPelanggan}</b> tamu.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={handleAlokasikanMeja}
                  disabled={isAllocating}
                  className="flex-1 py-3 bg-[#2B4263] hover:bg-[#1f3049] disabled:opacity-50 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  {isAllocating ? (
                    <><span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" /> Memproses…</>
                  ) : 'Ya, Aktifkan'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL: QR / KELOLA MEJA
      ═══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {qrModalMeja && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setQrModalMeja(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl overflow-hidden w-full max-w-sm shadow-2xl"
              onClick={e => e.stopPropagation()}
              role="dialog"
              aria-label={`Kelola meja ${qrModalMeja.nomor_meja}`}
            >
              <div className="flex items-center justify-between px-6 pt-5">
                <div>
                  <p className="text-[10px] font-extrabold text-slate-400 tracking-widest uppercase">Meja {qrModalMeja.nomor_meja}</p>
                  <span className={`mt-1 inline-block text-[9px] font-bold px-3 py-0.5 rounded-full uppercase tracking-widest ${
                    qrModalMeja.status_ketersediaan === 'terisi' ? 'bg-[#FFF0EB] text-[#FA6338]' : 'bg-emerald-50 text-emerald-600'
                  }`}>
                    {qrModalMeja.status_ketersediaan === 'terisi' ? 'Terisi' : 'Kosong'}
                  </span>
                </div>
                <button
                  onClick={() => setQrModalMeja(null)}
                  aria-label="Tutup"
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 flex flex-col items-center gap-4">
                {allocatedTokens[qrModalMeja.id_meja] ? (
                  <>
                    <div className="bg-white p-3 rounded-2xl border-2 border-slate-100 shadow-sm">
                      <QRCodeSVG
                        value={`${qrBaseUrl}/meja/${allocatedTokens[qrModalMeja.id_meja]}/menu`}
                        size={200}
                        level="H"
                        includeMargin
                      />
                    </div>
                    <div className="w-full flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                      <span className="flex-1 text-[10px] text-slate-500 break-all font-medium leading-relaxed">
                        {`${qrBaseUrl}/meja/${allocatedTokens[qrModalMeja.id_meja]}/menu`}
                      </span>
                      <button
                        onClick={() => copyQrLink(`${qrBaseUrl}/meja/${allocatedTokens[qrModalMeja.id_meja]}/menu`)}
                        aria-label="Salin tautan QR"
                        title="Salin tautan"
                        className="p-1.5 text-slate-400 hover:text-[#2B4263] hover:bg-white rounded-lg transition-all cursor-pointer"
                      >
                        {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400 text-center -mt-1">
                      Tunjukkan QR ini ke pelanggan untuk membuka menu di meja
                    </p>

                    {/* H5/H9: destructive action needs explicit confirm step */}
                    {cleanConfirmId === qrModalMeja.id_meja ? (
                      <div className="w-full bg-red-50 border border-red-200 rounded-2xl p-4 space-y-3 text-center">
                        <p className="text-xs font-bold text-red-600">
                          Yakin bersihkan Meja {qrModalMeja.nomor_meja}?
                        </p>
                        <p className="text-[10px] text-red-400">Pesanan berjalan akan ditutup dan meja kembali kosong.</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setCleanConfirmId(null)}
                            className="flex-1 py-2.5 bg-white text-slate-600 font-bold rounded-xl text-xs uppercase tracking-wider border border-slate-200 transition-all cursor-pointer"
                          >
                            Batal
                          </button>
                          <button
                            onClick={() => handleBersihkanMeja(qrModalMeja.id_meja, qrModalMeja.nomor_meja)}
                            disabled={isCleaning}
                            className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-bold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer"
                          >
                            {isCleaning ? 'Membersihkan…' : 'Ya, Bersihkan'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setCleanConfirmId(qrModalMeja.id_meja)}
                        disabled={isCleaning}
                        aria-label={`Bersihkan meja ${qrModalMeja.nomor_meja}`}
                        className="w-full py-2.5 bg-slate-100 hover:bg-red-50 hover:text-red-500 text-slate-700 font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" /> Bersihkan Meja
                      </button>
                    )}
                  </>
                ) : (
                  <div className="py-6 flex flex-col items-center gap-3 text-center">
                    <span className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center">
                      <Table2 className="w-6 h-6 text-slate-300" />
                    </span>
                    {qrModalMeja.status_ketersediaan === 'terisi' ? (
                      <>
                        <p className="text-sm text-slate-500 font-semibold">QR tidak tersedia saat ini</p>
                        <p className="text-[11px] text-slate-400 max-w-[220px]">Token sesi meja ini tidak ditemukan. Bersihkan meja untuk memulai ulang.</p>
                        {cleanConfirmId === qrModalMeja.id_meja ? (
                          <div className="w-full bg-red-50 border border-red-200 rounded-2xl p-4 space-y-3 text-center">
                            <p className="text-xs font-bold text-red-600">
                              Yakin bersihkan Meja {qrModalMeja.nomor_meja}?
                            </p>
                            <p className="text-[10px] text-red-400">Pesanan berjalan akan ditutup dan meja kembali kosong.</p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setCleanConfirmId(null)}
                                className="flex-1 py-2.5 bg-white text-slate-600 font-bold rounded-xl text-xs uppercase tracking-wider border border-slate-200 transition-all cursor-pointer"
                              >
                                Batal
                              </button>
                              <button
                                onClick={() => handleBersihkanMeja(qrModalMeja.id_meja, qrModalMeja.nomor_meja)}
                                disabled={isCleaning}
                                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-bold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer"
                              >
                                {isCleaning ? 'Membersihkan…' : 'Ya, Bersihkan'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setCleanConfirmId(qrModalMeja.id_meja); }}
                            disabled={isCleaning}
                            className="mt-1 px-5 py-2.5 bg-slate-100 hover:bg-red-50 hover:text-red-500 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                          >
                            Bersihkan Meja
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-slate-500 font-semibold">Meja masih kosong</p>
                        <p className="text-[11px] text-slate-400 max-w-[220px]">Langsung alokasikan meja ini untuk tamu berikutnya.</p>
                        <button
                          onClick={() => jumpToAlokasiFor(qrModalMeja)}
                          className="mt-1 flex items-center gap-1.5 px-5 py-2.5 bg-[#2B4263] hover:bg-[#1f3049] text-white text-xs font-extrabold rounded-xl uppercase tracking-wider transition-all cursor-pointer shadow-md"
                        >
                          Alokasikan Meja Ini <ArrowRight className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-black text-slate-400 tracking-widest uppercase">Resto Pak Resto</span>
                <button
                  onClick={() => setQrModalMeja(null)}
                  className="px-4 py-2 bg-[#2B4263] hover:bg-[#1f3049] text-white font-extrabold rounded-lg text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
