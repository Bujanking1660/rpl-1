import { validateTokenSesiAction } from '@/lib/actions/pelanggan';
import CustomerHeader from './CustomerHeader';
import { ScanSearch } from 'lucide-react';

export default async function CustomerLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const validation = await validateTokenSesiAction(token);

  if (!validation.valid || !validation.pesanan) {
    return (
      <div className="min-h-screen app-bg text-slate-800 flex flex-col items-center justify-center p-6 text-center">
        <div className="card w-full max-w-sm p-8 flex flex-col items-center gap-4">
          <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center">
            <ScanSearch className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">Sesi Tidak Valid / Berakhir</h1>
          <p className="text-slate-400 text-sm max-w-xs">
            {validation.error || 'Silakan hubungi pelayan untuk membuka sesi meja baru.'}
          </p>
        </div>
      </div>
    );
  }

  const nomorMeja = validation.pesanan.meja?.nomor_meja || '01';

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col max-w-md mx-auto relative">
      <CustomerHeader nomorMeja={nomorMeja} token={token} />
      <main className="flex-1 pb-28">{children}</main>
    </div>
  );
}
