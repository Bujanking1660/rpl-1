'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingBag, Receipt, Clock } from 'lucide-react';

export default function CustomerHeader({ nomorMeja, token }: { nomorMeja: string; token: string }) {
  const pathname = usePathname();

  return (
    <>
      {/* Header Banner matching Pelanggan.png */}
      <div className="bg-[#2B4263] text-white px-6 pt-6 pb-8 relative overflow-hidden rounded-b-3xl shadow-lg">
        {/* Coffee background texture */}
        <div
          className="absolute inset-0 opacity-30 bg-cover bg-center pointer-events-none"
          style={{ backgroundImage: `url('/bg.png')` }}
        />
        
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-orange-400 tracking-wide mb-1 uppercase">
              Resto Pak Resto
            </h1>
            <h2 className="text-2xl font-extrabold text-white">Hi,</h2>
            <p className="text-slate-200 text-xs mt-0.5">Order ur fav food & drink</p>
          </div>
          <div className="bg-orange-500/90 text-white px-4 py-2 rounded-2xl border border-orange-400/30 flex flex-col items-center justify-center shadow-md">
            <span className="text-[10px] font-semibold tracking-wider uppercase opacity-90">MEJA</span>
            <span className="text-xl font-black">{nomorMeja}</span>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 backdrop-blur-md border-t border-slate-100 py-2 px-6 flex items-center justify-around z-50 shadow-2xl">
        <Link
          href={`/meja/${token}/menu`}
          className={`flex flex-col items-center gap-1 py-1 px-4 rounded-2xl transition-all ${
            pathname.endsWith('/menu')
              ? 'text-[#FA6338] font-bold'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <div className={`p-2 rounded-xl ${pathname.endsWith('/menu') ? 'bg-orange-50' : ''}`}>
            <ShoppingBag className="w-5 h-5" />
          </div>
          <span className="text-[11px]">Home</span>
        </Link>

        <Link
          href={`/meja/${token}/pembayaran`}
          className={`flex flex-col items-center gap-1 py-1 px-4 rounded-2xl transition-all ${
            pathname.endsWith('/pembayaran')
              ? 'text-[#FA6338] font-bold'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <div className={`p-2 rounded-xl ${pathname.endsWith('/pembayaran') ? 'bg-orange-50' : ''}`}>
            <Receipt className="w-5 h-5" />
          </div>
          <span className="text-[11px]">Bill</span>
        </Link>

        <Link
          href={`/meja/${token}/status`}
          className={`flex flex-col items-center gap-1 py-1 px-4 rounded-2xl transition-all ${
            pathname.endsWith('/status')
              ? 'text-[#FA6338] font-bold'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <div className={`p-2 rounded-xl ${pathname.endsWith('/status') ? 'bg-orange-50' : ''}`}>
            <Clock className="w-5 h-5" />
          </div>
          <span className="text-[11px]">Status</span>
        </Link>
      </div>
    </>
  );
}

