'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { loginStaffAction } from '@/lib/actions/auth';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

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
    <form onSubmit={handleSubmit} className="space-y-6 max-w-sm w-full mx-auto">
      <div>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full px-6 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#FA6338] text-slate-700 bg-slate-50 focus:bg-white placeholder-slate-400 text-sm transition-all"
          required
        />
      </div>

      <div>
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-6 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#FA6338] text-slate-700 bg-slate-50 focus:bg-white placeholder-slate-400 text-sm transition-all"
          required
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full mt-6 py-3.5 px-6 bg-[#FA6338] hover:bg-orange-600 active:scale-[0.99] text-white font-extrabold rounded-2xl shadow-md transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 text-sm uppercase tracking-wider cursor-pointer"
      >
        {loading ? (
          <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          'Submit'
        )}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#35485E] p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-5xl bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row min-h-[580px] border border-slate-200"
      >
        {/* Left Section with Coffee Pattern Texture */}
        <div className="md:w-1/2 bg-[#2B4263] relative flex flex-col items-center justify-center p-8 md:p-12 overflow-hidden">
          {/* Coffee background texture overlay */}
          <div
            className="absolute inset-0 opacity-30 bg-cover bg-center pointer-events-none"
            style={{ backgroundImage: `url('/bg.png')` }}
          />

          <div className="relative z-10 flex flex-col items-center text-center">
            {/* Basket Illustration / Logo */}
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5 }}
              className="w-44 h-44 mb-6 relative flex items-center justify-center"
            >
              <img
                src="/logo.png"
                alt="Pak Resto Logo"
                className="w-full h-full object-contain filter drop-shadow-xl"
              />
            </motion.div>
            <h1 className="text-3xl font-black tracking-wider text-white mb-2 uppercase">RESTO PAK RESTO</h1>
            <p className="text-slate-200 text-xs tracking-widest font-semibold uppercase bg-white/10 px-4 py-1.5 rounded-full border border-white/20">
              UNIKOM System Access
            </p>
          </div>
        </div>

        {/* Right Section with Form */}
        <div className="md:w-1/2 p-8 md:p-14 flex flex-col items-center justify-center bg-white">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-800 uppercase">LOGIN</h2>
            <p className="text-slate-400 text-xs mt-2 font-medium">Masuk ke sistem operasional restoran</p>
          </div>

          <Suspense fallback={<div className="text-center py-8 text-slate-400 text-xs">Memuat form login...</div>}>
            <LoginFormContent />
          </Suspense>

          <div className="mt-10 pt-4 border-t border-slate-100 text-center text-xs text-slate-400 font-medium">
            Akun Default — <span className="font-bold text-slate-700">pelayan / kasir / koki / manajer</span>
          </div>
        </div>

      </motion.div>
    </div>
  );
}


