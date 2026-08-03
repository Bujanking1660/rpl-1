'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingBag, Receipt, Clock, UtensilsCrossed } from 'lucide-react';

export default function CustomerHeader({ nomorMeja, token }: { nomorMeja: string; token: string }) {
  const pathname = usePathname();

  const navItems = [
    { href: `/meja/${token}/menu`, label: 'Menu', icon: <ShoppingBag className="w-5 h-5" />, active: pathname.endsWith('/menu') },
    { href: `/meja/${token}/pembayaran`, label: 'Bill', icon: <Receipt className="w-5 h-5" />, active: pathname.endsWith('/pembayaran') },
    { href: `/meja/${token}/status`, label: 'Status', icon: <Clock className="w-5 h-5" />, active: pathname.endsWith('/status') },
  ];

  return (
    <>
      {/* Header Banner */}
      <header className="relative overflow-hidden rounded-b-3xl shadow-lg px-6 pt-6 pb-8 bg-gradient-to-br from-[#2B4263] via-[#355070] to-[#1F2937] text-white">
        <div
          className="absolute inset-0 opacity-20 bg-cover bg-center pointer-events-none"
          style={{ backgroundImage: `url('/bg.png')` }}
        />
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-[#FA6338]/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-1.5 text-sm font-bold text-orange-300 tracking-wide mb-1.5 uppercase">
              <UtensilsCrossed className="w-4 h-4" /> Resto Pak Resto
            </h1>
            <h2 className="text-2xl font-extrabold text-white">Hi, selamat datang!</h2>
            <p className="text-slate-200/80 text-xs mt-0.5">Order makanan & minuman favoritmu</p>
          </div>
          <div className="glass-dark rounded-2xl px-4 py-2.5 flex flex-col items-center justify-center shadow-md">
            <span className="text-[10px] font-semibold tracking-wider uppercase opacity-90">Meja</span>
            <span className="text-xl font-black text-orange-300">{nomorMeja}</span>
          </div>
        </div>
      </header>

      {/* Bottom Navigation (glass) */}
      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md glass rounded-2xl py-2 px-4 flex items-center justify-around z-50 shadow-xl">
        {navItems.map(({ href, label, icon, active }) => (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-1 py-1 px-4 rounded-2xl transition-all ${
              active ? 'text-[#2B4263] font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <div className={`p-2 rounded-xl transition-all ${active ? 'bg-[#EEF2F8]' : ''}`}>
              {icon}
            </div>
            <span className="text-[11px]">{label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
