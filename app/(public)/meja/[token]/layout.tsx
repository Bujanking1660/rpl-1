import { validateTokenSesiAction } from '@/lib/actions/pelanggan';
import CustomerHeader from './CustomerHeader';

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
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mb-4">
          !
        </div>
        <h1 className="text-2xl font-bold mb-2">Sesi Tidak Valid / Berakhir</h1>
        <p className="text-slate-400 text-sm max-w-sm mb-6">
          {validation.error || 'Silakan hubungi pelayan untuk membuka sesi meja baru.'}
        </p>
      </div>
    );
  }

  const nomorMeja = validation.pesanan.meja?.nomor_meja || '01';

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col max-w-md mx-auto shadow-2xl relative">
      <CustomerHeader nomorMeja={nomorMeja} token={token} />
      <main className="flex-1 pb-24">{children}</main>
    </div>
  );
}
