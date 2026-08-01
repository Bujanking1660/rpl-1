import Link from 'next/link';
import { getStaffSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { Utensils, Users, Receipt, ChefHat, ShieldCheck, ArrowRight } from 'lucide-react';

export default async function Home() {
  const session = await getStaffSession();

  if (session) {
    redirect(`/${session.peran}`);
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-3xl w-full text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-2">
          <Utensils className="w-4 h-4 text-orange-400" /> Pak Resto UNIKOM Operational System
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
          Sistem Informasi Manajemen Restoran
        </h1>
        
        <p className="text-slate-400 text-lg max-w-xl mx-auto">
          Portal terintegrasi untuk Pelayan, Kasir, Koki, Manajer, dan Pemesanan Mandiri Pelanggan.
        </p>

        <div className="flex flex-wrap justify-center gap-4 pt-4">
          <Link
            href="/login"
            className="px-8 py-4 bg-[#ff6b4a] hover:bg-orange-600 text-white font-bold rounded-full shadow-lg shadow-orange-500/25 transition duration-200 flex items-center gap-2 text-lg"
          >
            Masuk Akun Pegawai <ArrowRight className="w-5 h-5" />
          </Link>
        </div>

        {/* Quick Role Portal Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-12">
          <Link href="/login" className="bg-slate-800/80 border border-slate-700 hover:border-orange-500/50 p-5 rounded-2xl transition group text-left">
            <Users className="w-8 h-8 text-orange-400 mb-3 group-hover:scale-110 transition" />
            <h3 className="font-bold text-slate-200">Pelayan</h3>
            <p className="text-xs text-slate-400 mt-1">Kedatangan, Meja & Penyajian</p>
          </Link>

          <Link href="/login" className="bg-slate-800/80 border border-slate-700 hover:border-orange-500/50 p-5 rounded-2xl transition group text-left">
            <Receipt className="w-8 h-8 text-blue-400 mb-3 group-hover:scale-110 transition" />
            <h3 className="font-bold text-slate-200">Kasir</h3>
            <p className="text-xs text-slate-400 mt-1">Validasi & Pembayaran</p>
          </Link>

          <Link href="/login" className="bg-slate-800/80 border border-slate-700 hover:border-orange-500/50 p-5 rounded-2xl transition group text-left">
            <ChefHat className="w-8 h-8 text-emerald-400 mb-3 group-hover:scale-110 transition" />
            <h3 className="font-bold text-slate-200">Koki</h3>
            <p className="text-xs text-slate-400 mt-1">Antrian Pesanan Dapur</p>
          </Link>

          <Link href="/login" className="bg-slate-800/80 border border-slate-700 hover:border-orange-500/50 p-5 rounded-2xl transition group text-left">
            <ShieldCheck className="w-8 h-8 text-purple-400 mb-3 group-hover:scale-110 transition" />
            <h3 className="font-bold text-slate-200">Manager</h3>
            <p className="text-xs text-slate-400 mt-1">Dashboard & Data Master</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
