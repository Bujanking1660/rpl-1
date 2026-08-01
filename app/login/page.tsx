'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { loginStaffAction } from '@/lib/actions/auth';
import { toast } from 'sonner';
import Image from 'next/image';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect');

  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !password) {
      toast.error('Silakan isi username dan password');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);

    const res = await loginStaffAction(formData);
    setLoading(false);

    if (res.success && res.session) {
      toast.success(`Selamat datang, ${res.session.nama_pegawai}!`);
      const targetPath = redirectPath || (res.session.peran === 'manajer' ? '/manager' : `/${res.session.peran}`);
      router.push(targetPath);
    } else {
      toast.error(res.error || 'Login gagal. Cek kembali username & password');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Username</label>
        <input
          type="text"
          placeholder="Masukkan username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#ff6b4a] focus:border-transparent text-slate-800 transition text-sm font-medium"
          required
        />
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Password</label>
        <input
          type="password"
          placeholder="Masukkan password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#ff6b4a] focus:border-transparent text-slate-800 transition text-sm font-medium"
          required
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full mt-4 py-3.5 px-6 bg-[#ff6b4a] hover:bg-orange-600 text-white font-bold rounded-2xl shadow-lg transition duration-200 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
      >
        {loading ? (
          <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          'MASUK SEKARANG'
        )}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4 bg-cover bg-center bg-no-relative"
      style={{ backgroundImage: `url('/bg.png')` }}
    >
      {/* Dark overlay for contrast */}
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" />

      <div className="relative z-10 w-full max-w-4xl bg-white/95 backdrop-blur-md rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row min-h-[520px] border border-white/20">
        {/* Left Section with Logo & Brand */}
        <div className="md:w-1/2 bg-gradient-to-br from-slate-900 via-slate-800 to-[#2b3a55] p-8 md:p-12 flex flex-col justify-center items-center text-white relative overflow-hidden">
          <div className="absolute -left-10 -bottom-10 w-64 h-64 bg-orange-500/20 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 text-center flex flex-col items-center">
            <div className="w-32 h-32 mb-4 relative flex items-center justify-center bg-white/10 rounded-3xl p-3 border border-white/10 shadow-inner">
              <img
                src="/logo.png"
                alt="Pak Resto UNIKOM Logo"
                className="w-full h-full object-contain filter drop-shadow-md"
              />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white mb-1">PAK RESTO.</h1>
            <p className="text-orange-400 text-xs font-semibold uppercase tracking-widest mb-3">UNIKOM RESTAURANT SYSTEM</p>
            <p className="text-slate-300 text-xs max-w-xs leading-relaxed">
              Sistem Informasi Operasional Restoran — Pelayan, Kasir, Koki, & Manager
            </p>
          </div>
        </div>

        {/* Right Section with Form */}
        <div className="md:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-white">
          <div className="mb-6">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">LOGIN PEGAWAI</h2>
            <p className="text-slate-500 text-xs mt-1">Masuk dengan kredensial peran staff Anda</p>
          </div>

          <Suspense fallback={<div className="text-center py-8 text-slate-400 text-xs">Memuat form login...</div>}>
            <LoginFormContent />
          </Suspense>

          <div className="mt-8 pt-4 border-t border-slate-100 text-center text-[11px] text-slate-400">
            Kredensial Default — <span className="font-mono text-slate-700 font-bold">pelayan / kasir / koki / manajer</span> (PW: +123)
          </div>
        </div>
      </div>
    </div>
  );
}
