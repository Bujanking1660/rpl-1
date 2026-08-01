'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingBag, Receipt, Clock } from 'lucide-react';

export default function CustomerHeader({ nomorMeja, token }: { nomorMeja: string; token: string }) {
  const pathname = usePathname();

  return (
    <>
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-[#1e2d42] to-[#2b3a55] text-white px-5 pt-6 pb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-orange-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <img src="/logo.png" alt="Pak Resto" className="w-6 h-6 object-contain" />
              <span className="text-orange-400 font-black text-sm tracking-wide">Pak Resto UNIKOM</span>
            </div>
            <h1 className="text-2xl font-black text-white leading-tight">
              Meja <span className="text-orange-400">#{nomorMeja}</span>
            </h1>
            <p className="text-blue-200 text-xs mt-0.5">Silakan pilih menu dan nikmati hidangan Anda</p>
          </div>
          <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-900/30 shrink-0">
            <span className="text-xl font-black text-white">{nomorMeja}</span>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-slate-100 py-1.5 px-4 flex items-center justify-around z-50 shadow-2xl shadow-slate-900/20">
        <Link
          href={`/meja/${token}/menu`}
          className={`flex flex-col items-center gap-0.5 py-1.5 px-4 rounded-2xl transition-all ${
            pathname.endsWith('/menu')
              ? 'text-orange-500 bg-orange-50'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <ShoppingBag className="w-5 h-5" />
          <span className="text-[10px] font-semibold">Menu</span>
        </Link>

        <Link
          href={`/meja/${token}/pembayaran`}
          className={`flex flex-col items-center gap-0.5 py-1.5 px-4 rounded-2xl transition-all ${
            pathname.endsWith('/pembayaran')
              ? 'text-orange-500 bg-orange-50'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Receipt className="w-5 h-5" />
          <span className="text-[10px] font-semibold">Tagihan</span>
        </Link>

        <Link
          href={`/meja/${token}/status`}
          className={`flex flex-col items-center gap-0.5 py-1.5 px-4 rounded-2xl transition-all ${
            pathname.endsWith('/status')
              ? 'text-orange-500 bg-orange-50'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Clock className="w-5 h-5" />
          <span className="text-[10px] font-semibold">Status</span>
        </Link>
      </div>
    </>
  );
}
