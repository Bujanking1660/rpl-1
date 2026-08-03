'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { loginStaffAction } from '@/lib/actions/auth';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Eye, EyeOff, User, Lock, ArrowRight, UtensilsCrossed } from 'lucide-react';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect');

  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Username</label>
        <div className="relative">
          <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Masukkan username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="input-field pl-10"
            autoComplete="username"
            required
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Password</label>
        <div className="relative">
          <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Masukkan password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field pl-10 pr-11"
            autoComplete="current-password"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            tabIndex={-1}
            aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full btn-primary !py-3.5 text-sm mt-2"
      >
        {loading ? (
          <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            Masuk <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>

      <p className="text-center text-[11px] text-slate-400 mt-2">
        Akun pegawai dikelola oleh Manajer Resto
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen app-bg flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-4xl grid lg:grid-cols-2 rounded-3xl overflow-hidden shadow-2xl border border-white/60">
        {/* Left — Brand panel (navy gradient + soft glow) */}
        <div className="hidden lg:flex relative flex-col items-center justify-center text-center p-10 bg-gradient-to-br from-[#2B4263] via-[#355070] to-[#1F2937] overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-25 pointer-events-none"
            style={{ backgroundImage: `url('/bg.png')` }}
          />
          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[#FA6338]/25 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-28 -left-20 w-80 h-80 rounded-full bg-[#4A6C9C]/30 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="w-24 h-24 mb-6 rounded-3xl bg-white/10 glass-dark flex items-center justify-center p-4 shadow-xl"
            >
              <img src="/logo.png" alt="Pak Resto Logo" className="w-full h-full object-contain" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
            >
              <h1 className="text-3xl font-black tracking-wide text-white uppercase drop-shadow-sm">
                Pak Resto
              </h1>
              <p className="text-slate-200/90 text-xs mt-2 tracking-widest uppercase font-semibold">
                Sistem Manajemen Restoran
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-8 flex items-center gap-2 text-[11px] text-slate-200/70"
            >
              <UtensilsCrossed className="w-4 h-4 text-[#FA6338]" />
              <span>Pelayan · Kasir · Koki · Manajer</span>
            </motion.div>
          </div>
        </div>

        {/* Right — Form panel */}
        <div className="bg-white p-8 md:p-12 flex items-center">
          <div className="w-full max-w-sm mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="text-center mb-8 lg:text-left"
            >
              <div className="lg:hidden flex justify-center mb-5">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#2B4263] to-[#355070] flex items-center justify-center p-3 shadow-lg">
                  <img src="/logo.png" alt="Pak Resto Logo" className="w-full h-full object-contain" />
                </div>
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-800 uppercase">Login</h2>
              <p className="text-slate-400 text-xs mt-1.5 font-medium">
                Masuk menggunakan akun pegawai
              </p>
            </motion.div>

            <Suspense fallback={<div className="text-center py-8 text-slate-400 text-xs">Memuat form login...</div>}>
              <LoginFormContent />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
