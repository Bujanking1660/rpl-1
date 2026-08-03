import Link from 'next/link';
import { getStaffSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { UtensilsCrossed, Users, Receipt, ChefHat, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';

export default async function Home() {
  const session = await getStaffSession();

  if (session) {
    redirect(`/${session.peran}`);
  } else {
    redirect('/login');
  }

  const portals = [
    { name: 'Pelayan', desc: 'Kedatangan, Meja & Penyajian', icon: Users, tint: 'text-[#2B4263] bg-[#EEF2F8]' },
    { name: 'Kasir', desc: 'Validasi & Pembayaran', icon: Receipt, tint: 'text-[#FA6338] bg-[#FFF0EB]' },
    { name: 'Koki', desc: 'Antrian Pesanan Dapur', icon: ChefHat, tint: 'text-emerald-600 bg-emerald-50' },
    { name: 'Manager', desc: 'Dashboard & Data Master', icon: ShieldCheck, tint: 'text-violet-600 bg-violet-50' },
  ];

  return (
    <div className="min-h-screen app-bg text-slate-800 flex flex-col items-center justify-center p-6">
      <div className="max-w-3xl w-full text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/70 glass text-[#2B4263] text-sm font-semibold shadow-sm">
          <Sparkles className="w-4 h-4 text-[#FA6338]" /> Pak Resto UNIKOM Operational System
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-[#2B4263]">
          Sistem Informasi Manajemen Restoran
        </h1>

        <p className="text-slate-400 text-lg max-w-xl mx-auto">
          Portal terintegrasi untuk Pelayan, Kasir, Koki, Manajer, dan Pemesanan Mandiri Pelanggan.
        </p>

        <div className="flex flex-wrap justify-center gap-4 pt-4">
          <Link
            href="/login"
            className="btn-primary !px-8 !py-4 !text-base"
          >
            Masuk Akun Pegawai <ArrowRight className="w-5 h-5" />
          </Link>
        </div>

        {/* Quick Role Portal Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-12">
          {portals.map(({ name, desc, icon: Icon, tint }) => (
            <Link
              key={name}
              href="/login"
              className="card p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-xl group"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${tint} group-hover:scale-110 transition-transform`}>
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm">{name}</h3>
              <p className="text-[11px] text-slate-400 mt-1">{desc}</p>
            </Link>
          ))}
        </div>

        <p className="text-[11px] text-slate-300 uppercase tracking-widest pt-4 flex items-center justify-center gap-1.5">
          <UtensilsCrossed className="w-3.5 h-3.5 text-[#FA6338]" /> Pak Resto · UNIKOM · 2026
        </p>
      </div>
    </div>
  );
}
