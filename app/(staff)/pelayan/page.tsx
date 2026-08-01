'use client';

import { useState, useEffect, useCallback } from 'react';
import { getMejaListAction, alokasikanMejaAction, bersihkanMejaAction } from '@/lib/actions/pelayan';
import { logoutStaffAction } from '@/lib/actions/auth';
import { useRouter } from 'next/navigation';
import { Meja } from '@/lib/types/database';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { QRCodeSVG } from 'qrcode.react';

type Tab = 'ALOKASI' | 'STATUS';
type AlokasiStep = 1 | 2; // 1 = input jumlah, 2 = pilih meja

export default function PelayanPage() {
  const router = useRouter();

  // ── Navigation ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<Tab>('ALOKASI');

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

  // ── Realtime fetch ───────────────────────────────────────────────────────────
  const fetchMejaList = useCallback(async () => {
    setIsFetching(true);
    const res = await getMejaListAction();
    if (res.success && res.data) setMejaList(res.data as Meja[]);
    setIsFetching(false);
  }, []);

  useEffect(() => {
    fetchMejaList();
    const supabase = createClient();
    const channel = supabase
      .channel('pelayan-meja')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meja' }, fetchMejaList)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchMejaList]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  function handleTabChange(tab: Tab) {
    setActiveTab(tab);
    // H3: User control – preserve context when switching tabs
    if (tab === 'ALOKASI') setAlokasiStep(1); // reset step only when going back to alokasi
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    if (raw === '') {
      setInputStr('');
      setJumlahPelanggan(0);
    } else {
      const num = parseInt(raw, 10);
      setInputStr(String(num)); // strips leading zeros
      setJumlahPelanggan(num);
    }
  }

  function adjustCount(delta: number) {
    const next = Math.max(0, jumlahPelanggan + delta);
    setJumlahPelanggan(next);
    setInputStr(String(next));
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
      // H1: Visibility – success toast with table name
      toast.success(`Meja ${targetMeja.nomor_meja} berhasil diaktifkan!`);
      fetchMejaList();
      // Reset alokasi flow for next session
      setSelectedMejaId(null);
      setAlokasiStep(1);
      setJumlahPelanggan(0);
      setInputStr('0');
    } else {
      // H9: Help users recover from errors – descriptive message
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
      toast.success(`Meja ${nomor} sekarang tersedia`);
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

  // ── Meja helpers ─────────────────────────────────────────────────────────────
  function getMejaState(m: Meja) {
    const isOccupied = m.status_ketersediaan === 'terisi';
    const canFit = m.kapasitas >= jumlahPelanggan;
    const isSelected = m.id_meja === selectedMejaId;
    return { isOccupied, canFit, isSelected, isDisabled: isOccupied || !canFit };
  }

  function getMejaClass(m: Meja): string {
    const { isOccupied, canFit, isSelected } = getMejaState(m);
    if (isSelected) return 'bg-[#FA6338] text-white ring-2 ring-orange-300 scale-105';
    if (isOccupied || !canFit) return 'bg-[#C0C0C0] text-[#888] cursor-not-allowed opacity-60';
    return 'bg-[#262626] text-white hover:bg-[#3a3a3a] active:scale-95';
  }

  function getMejaLabel(m: Meja): string {
    const { isOccupied, canFit } = getMejaState(m);
    if (isOccupied) return 'Terisi';
    if (!canFit) return `Maks ${m.kapasitas}`;
    return `${m.kapasitas} org`;
  }

  function getStatusMejaClass(m: Meja): string {
    if (m.status_ketersediaan === 'terisi') return 'bg-[#FA6338] text-white hover:bg-orange-600 active:scale-95';
    return 'bg-[#262626] text-white hover:bg-[#3a3a3a] active:scale-95';
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  // Derived counts for status badge (H1: system status visibility)
  const terisiCount = mejaList.filter(m => m.status_ketersediaan === 'terisi').length;
  const tersediaCount = mejaList.filter(m => m.status_ketersediaan === 'tersedia').length;

  return (
    <div className="min-h-screen bg-[#4A4A4A] flex flex-col items-center justify-center gap-4 p-6">

      {/* ── NAV MENU (H4 Consistency, H6 Recognition, H1 Status) ─────────────── */}
      <div className="w-full max-w-xl">
        {/* Tab switcher */}
        <div className="flex items-center bg-[#2B4263] rounded-2xl p-1.5 gap-1.5 shadow-lg">
          <button
            onClick={() => handleTabChange('ALOKASI')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all ${
              activeTab === 'ALOKASI'
                ? 'bg-[#FA6338] text-white shadow-md'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Alokasi Meja
          </button>
          <button
            onClick={() => handleTabChange('STATUS')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all relative ${
              activeTab === 'STATUS'
                ? 'bg-[#FA6338] text-white shadow-md'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Status Meja
            {/* H1: Badge showing occupied count */}
            {terisiCount > 0 && (
              <span className="absolute -top-1.5 -right-1 bg-red-500 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                {terisiCount}
              </span>
            )}
          </button>
          {/* Logout – always accessible (H3: user control) */}
          <button
            onClick={handleLogout}
            title="Keluar"
            className="px-3 py-2.5 rounded-xl text-white/50 hover:text-white hover:bg-white/10 text-xs font-bold transition-all"
          >
            Keluar
          </button>
        </div>

        {/* H1: Step indicator for alokasi tab */}
        {activeTab === 'ALOKASI' && (
          <div className="flex items-center justify-center gap-2 mt-3 mb-1">
            <div className={`w-2 h-2 rounded-full transition-all ${alokasiStep === 1 ? 'bg-[#FA6338] scale-125' : 'bg-white/30'}`} />
            <div className={`h-0.5 w-12 rounded transition-all ${alokasiStep === 2 ? 'bg-[#FA6338]' : 'bg-white/20'}`} />
            <div className={`w-2 h-2 rounded-full transition-all ${alokasiStep === 2 ? 'bg-[#FA6338] scale-125' : 'bg-white/30'}`} />
            <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest ml-1">
              {alokasiStep === 1 ? 'Langkah 1: Jumlah Tamu' : 'Langkah 2: Pilih Meja'}
            </span>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB: ALOKASI
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'ALOKASI' && (
        <>
          {/* ── STEP 1: Input Jumlah Pelanggan ────────────────────────────────── */}
          {alokasiStep === 1 && (
            <div
              className="w-full max-w-sm bg-white rounded-2xl overflow-hidden shadow-2xl"
              style={{ border: '4px solid #2B4263' }}
            >
              {/* H8: Minimalist – simple header */}
              <div className="px-6 pt-5 pb-3 text-center">
                <p className="text-xs font-extrabold text-[#2B4263] tracking-widest uppercase">Jumlah Pelanggan</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Masukkan jumlah tamu yang akan duduk</p>
              </div>

              {/* H2: Real-world language – angka besar, mudah dibaca */}
              <div className="mx-6 mb-3">
                <input
                  type="text"
                  inputMode="numeric"
                  value={inputStr}
                  placeholder="0"
                  aria-label="Jumlah pelanggan"
                  onFocus={() => { if (inputStr === '0') setInputStr(''); }}
                  onBlur={() => { if (!inputStr) { setInputStr('0'); setJumlahPelanggan(0); } }}
                  onChange={handleInputChange}
                  className="w-full text-center text-6xl font-black text-[#FA6338] border-2 border-slate-200 rounded-xl py-4 focus:outline-none focus:border-[#FA6338] bg-slate-50 transition-colors"
                />
              </div>

              {/* H5: Error prevention – disable minus at 0, visual min indicator */}
              <div className="mx-6 mb-6 flex gap-3">
                <button
                  onClick={() => adjustCount(-1)}
                  disabled={jumlahPelanggan <= 0}
                  aria-label="Kurangi satu"
                  className="flex-1 h-12 bg-[#262626] hover:bg-black disabled:opacity-30 text-white text-2xl font-black rounded-xl transition-all active:scale-95 flex items-center justify-center"
                >
                  −
                </button>
                <button
                  onClick={() => adjustCount(1)}
                  aria-label="Tambah satu"
                  className="flex-1 h-12 bg-[#262626] hover:bg-black text-white text-2xl font-black rounded-xl transition-all active:scale-95 flex items-center justify-center"
                >
                  +
                </button>
                {/* H5: Disable LANJUT when jumlah < 1 */}
                <button
                  disabled={jumlahPelanggan < 1}
                  onClick={() => setAlokasiStep(2)}
                  aria-label="Lanjut ke pilih meja"
                  className="flex-[2] h-12 bg-[#FA6338] hover:bg-orange-600 disabled:opacity-40 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider transition-all active:scale-95"
                >
                  Lanjut →
                </button>
              </div>

              {/* H5: Hint – helps prevent user confusion */}
              {jumlahPelanggan < 1 && (
                <p className="text-center text-[10px] text-slate-400 pb-4">Masukkan minimal 1 tamu untuk melanjutkan</p>
              )}

              <div className="bg-[#2B4263] px-6 py-3 flex items-center justify-between">
                <span className="text-xs font-black text-white tracking-widest uppercase">Resto Pak Resto</span>
                {/* H1: show live table counts */}
                <span className="text-[10px] text-white/50">
                  {isFetching ? 'Memperbarui…' : `${tersediaCount} meja tersedia`}
                </span>
              </div>
            </div>
          )}

          {/* ── STEP 2: Pilih Meja ────────────────────────────────────────────── */}
          {alokasiStep === 2 && (
            <div
              className="w-full max-w-xl bg-white rounded-2xl overflow-hidden shadow-2xl"
              style={{ border: '4px solid #2B4263' }}
            >
              <div className="p-5">
                {/* H6: Recognition – legend at top */}
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[10px] font-extrabold text-slate-400 tracking-widest uppercase">
                    Pilih Meja — {jumlahPelanggan} Tamu
                  </p>
                  <div className="flex items-center gap-2 text-[9px] font-semibold text-slate-400">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#262626] inline-block" /> Tersedia</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#FA6338] inline-block" /> Dipilih</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#C0C0C0] inline-block" /> Tidak bisa</span>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-3">
                  {mejaList.map(m => {
                    const { isDisabled } = getMejaState(m);
                    return (
                      <button
                        key={m.id_meja}
                        disabled={isDisabled}
                        onClick={() => !isDisabled && setSelectedMejaId(prev => prev === m.id_meja ? null : m.id_meja)}
                        title={isDisabled ? (m.status_ketersediaan === 'terisi' ? 'Meja sedang terisi' : `Kapasitas meja hanya ${m.kapasitas} orang`) : `Pilih Meja ${m.nomor_meja}`}
                        className={`rounded-xl flex flex-col items-center justify-center py-3 gap-0.5 font-black text-xl transition-all ${getMejaClass(m)}`}
                      >
                        <span>{m.nomor_meja}</span>
                        <span className="text-[8px] font-semibold opacity-80 uppercase tracking-wide">
                          {getMejaLabel(m)}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* H1: Selected meja feedback */}
                {selectedMejaId && (
                  <div className="mt-4 py-2 px-3 bg-orange-50 border border-orange-200 rounded-lg text-xs text-[#FA6338] font-semibold text-center">
                    Meja {mejaList.find(m => m.id_meja === selectedMejaId)?.nomor_meja} dipilih — tekan Lanjut untuk konfirmasi
                  </div>
                )}
              </div>

              <div className="bg-[#2B4263] px-6 py-3 flex items-center justify-between">
                <span className="text-xs font-black text-white tracking-widest uppercase">Resto Pak Resto</span>
                <div className="flex gap-2">
                  {/* H3: Easy undo – kembali */}
                  <button
                    onClick={() => { setAlokasiStep(1); setSelectedMejaId(null); }}
                    className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white font-bold rounded-lg text-xs uppercase tracking-wider transition-all"
                  >
                    ← Kembali
                  </button>
                  <button
                    disabled={!selectedMejaId}
                    onClick={() => setShowConfirmModal(true)}
                    className="px-5 py-2 bg-[#FA6338] hover:bg-orange-600 disabled:opacity-40 text-white font-extrabold rounded-lg text-xs uppercase tracking-wider transition-all"
                  >
                    Lanjut →
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB: STATUS MEJA
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'STATUS' && (
        <div
          className="w-full max-w-xl bg-white rounded-2xl overflow-hidden shadow-2xl"
          style={{ border: '4px solid #2B4263' }}
        >
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-extrabold text-slate-400 tracking-widest uppercase">Status Semua Meja</p>
              {/* H1: Live summary */}
              <span className="text-[10px] font-bold text-slate-400">
                {terisiCount} terisi · {tersediaCount} tersedia
              </span>
            </div>

            {/* H6: Recognition – legend */}
            <div className="flex items-center gap-3 mb-4 text-[9px] font-semibold text-slate-400">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#FA6338] inline-block" /> Terisi (klik untuk lihat QR / bersihkan)</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#262626] inline-block" /> Kosong</span>
            </div>

            <div className="grid grid-cols-5 gap-3">
              {mejaList.map(m => (
                <button
                  key={m.id_meja}
                  onClick={() => setQrModalMeja(m)}
                  title={`Meja ${m.nomor_meja} — ${m.status_ketersediaan === 'terisi' ? 'Terisi, klik untuk kelola' : 'Kosong'}`}
                  className={`rounded-xl flex flex-col items-center justify-center py-3 gap-0.5 font-black text-xl transition-all ${getStatusMejaClass(m)}`}
                >
                  <span>{m.nomor_meja}</span>
                  <span className="text-[8px] font-semibold opacity-80 uppercase tracking-wide">
                    {m.status_ketersediaan === 'terisi' ? 'Terisi' : 'Kosong'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-[#2B4263] px-6 py-3 flex items-center justify-between">
            <span className="text-xs font-black text-white tracking-widest uppercase">Resto Pak Resto</span>
            <span className="text-[10px] text-white/50">
              {isFetching ? 'Memperbarui…' : 'Realtime aktif'}
            </span>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL: KONFIRMASI ALOKASI
          H4: Consistent pattern, H3: Easy cancel
      ═══════════════════════════════════════════════════════════════════════ */}
      {showConfirmModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-end justify-center p-6 z-50"
          onClick={() => setShowConfirmModal(false)} // H3: click backdrop to cancel
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-2xl text-center space-y-4"
            onClick={e => e.stopPropagation()}
          >
            {/* H2: Plain language */}
            <p className="text-sm font-bold text-[#2B4263] leading-snug">
              Aktifkan Meja {mejaList.find(m => m.id_meja === selectedMejaId)?.nomor_meja}?
            </p>
            <p className="text-[11px] text-slate-400">
              Meja akan ditandai terisi dan QR akan dibuat untuk {jumlahPelanggan} tamu.
            </p>
            <div className="flex gap-3">
              {/* H3: BATAL always on left */}
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-xl text-xs uppercase tracking-wider transition-all"
              >
                Batal
              </button>
              <button
                onClick={handleAlokasikanMeja}
                disabled={isAllocating}
                className="flex-1 py-3 bg-[#FA6338] hover:bg-orange-600 disabled:opacity-50 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1"
              >
                {isAllocating ? (
                  <><span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" /> Memproses…</>
                ) : 'Ya, Aktifkan →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL: QR CODE / KELOLA MEJA
          H1: Visibility, H3: User control, H9: Recovery
      ═══════════════════════════════════════════════════════════════════════ */}
      {qrModalMeja && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-50"
          onClick={() => setQrModalMeja(null)}
        >
          <div
            className="bg-white rounded-2xl overflow-hidden w-full max-w-sm shadow-2xl"
            style={{ border: '4px solid #2B4263' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 flex flex-col items-center gap-4">
              {/* H1: Clear meja identity */}
              <div className="text-center">
                <p className="text-[10px] font-extrabold text-slate-400 tracking-widest uppercase">Meja {qrModalMeja.nomor_meja}</p>
                <span className={`mt-1 inline-block text-[9px] font-bold px-3 py-0.5 rounded-full uppercase tracking-widest ${
                  qrModalMeja.status_ketersediaan === 'terisi' ? 'bg-orange-100 text-[#FA6338]' : 'bg-slate-100 text-slate-500'
                }`}>
                  {qrModalMeja.status_ketersediaan}
                </span>
              </div>

              {allocatedTokens[qrModalMeja.id_meja] ? (
                <>
                  <QRCodeSVG
                    value={`${origin}/meja/${allocatedTokens[qrModalMeja.id_meja]}/menu`}
                    size={200}
                    level="H"
                    includeMargin
                  />
                  {/* H2: Real-world instruction */}
                  <p className="text-[11px] text-slate-400 text-center">
                    Tunjukkan QR ini ke pelanggan untuk akses menu
                  </p>
                  {/* H9: Confirm before irreversible action */}
                  <button
                    onClick={() => {
                      if (confirm(`Bersihkan Meja ${qrModalMeja.nomor_meja}? Status akan kembali tersedia.`)) {
                        handleBersihkanMeja(qrModalMeja.id_meja, qrModalMeja.nomor_meja);
                      }
                    }}
                    disabled={isCleaning}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1"
                  >
                    {isCleaning ? 'Membersihkan…' : '🧹 Bersihkan Meja'}
                  </button>
                </>
              ) : (
                // H8: Minimal, clear state for no-QR case
                <div className="py-6 flex flex-col items-center gap-2">
                  <span className="text-3xl">📋</span>
                  <p className="text-sm text-slate-500 text-center">QR belum tersedia.<br />Alokasikan meja ini terlebih dahulu.</p>
                  {qrModalMeja.status_ketersediaan === 'terisi' && (
                    <button
                      onClick={() => handleBersihkanMeja(qrModalMeja.id_meja, qrModalMeja.nomor_meja)}
                      disabled={isCleaning}
                      className="mt-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
                    >
                      {isCleaning ? 'Membersihkan…' : 'Bersihkan Meja'}
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="bg-[#2B4263] px-6 py-3 flex items-center justify-between">
              <span className="text-xs font-black text-white tracking-widest uppercase">Resto Pak Resto</span>
              <button
                onClick={() => setQrModalMeja(null)}
                className="px-5 py-2 bg-[#FA6338] hover:bg-orange-600 text-white font-extrabold rounded-lg text-xs uppercase tracking-wider transition-all"
              >
                Tutup ×
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
