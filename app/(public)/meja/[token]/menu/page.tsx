'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getMenuPelangganAction, submitPesananPelangganAction } from '@/lib/actions/pelanggan';
import { Menu } from '@/lib/types/database';
import { toast } from 'sonner';
import { Plus, Minus, ShoppingCart, Utensils, Coffee, X, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function MenuPelangganPage() {
  const pathname = usePathname();
  const token = (pathname.split('/')[2] || '').split('?')[0];
  const router = useRouter();

  const [menuList, setMenuList] = useState<Menu[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [cart, setCart] = useState<{ [id_menu: string]: { menu: Menu; jumlah: number } }>({});
  const [showCartModal, setShowCartModal] = useState(false);
  const [loading, setLoading] = useState(false);

  async function fetchMenu() {
    const res = await getMenuPelangganAction();
    if (res.success && res.data) {
      setMenuList(res.data as Menu[]);
    }
  }

  useEffect(() => {
    const t = window.setTimeout(() => {
      fetchMenu();
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  const categories = ['Semua', 'Makanan', 'Minuman'];

  const filteredMenu =
    selectedCategory === 'Semua'
      ? menuList
      : menuList.filter((m) => m.kategori === selectedCategory);

  function addToCart(menu: Menu) {
    setCart((prev) => {
      const existing = prev[menu.id_menu];
      const jumlah = existing ? existing.jumlah + 1 : 1;
      return { ...prev, [menu.id_menu]: { menu, jumlah } };
    });
    toast.success(`${menu.nama_menu} ditambahkan ke pesanan`);
  }

  function updateQuantity(id_menu: string, delta: number) {
    setCart((prev) => {
      const existing = prev[id_menu];
      if (!existing) return prev;
      const newQty = existing.jumlah + delta;
      if (newQty <= 0) {
        const copy = { ...prev };
        delete copy[id_menu];
        return copy;
      }
      return { ...prev, [id_menu]: { ...existing, jumlah: newQty } };
    });
  }

  const cartItems = Object.values(cart);
  const totalItemCount = cartItems.reduce((sum, item) => sum + item.jumlah, 0);
  const totalPrice = cartItems.reduce((sum, item) => sum + item.jumlah * Number(item.menu.harga), 0);

  async function handleCheckout() {
    if (cartItems.length === 0 || !token) return;

    setLoading(true);
    const items = cartItems.map((item) => ({
      id_menu: item.menu.id_menu,
      jumlah: item.jumlah,
      harga: Number(item.menu.harga),
    }));

    const res = await submitPesananPelangganAction(token, items);
    setLoading(false);

    if (res.success) {
      toast.success('Pesanan terkirim! Silakan bayar ke kasir.');
      setCart({});
      setShowCartModal(false);
      router.push(`/meja/${token}/pembayaran`);
    } else {
      toast.error(res.error || 'Gagal mengirim pesanan');
    }
  }

  return (
    <div className="px-4 pt-4 pb-6 space-y-5">
      {/* Category Filter */}
      <div>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">Kategori</p>
        <div className="flex gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap border ${
                selectedCategory === cat
                  ? 'bg-[#2B4263] text-white border-[#2B4263] shadow-md'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-[#2B4263]/40'
              }`}
            >
              {cat === 'Makanan' && <Utensils className="w-3 h-3" />}
              {cat === 'Minuman' && <Coffee className="w-3 h-3" />}
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Grid */}
      <div>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">
          {selectedCategory === 'Semua' ? 'Semua Menu' : selectedCategory}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {filteredMenu.map((item) => {
            const inCart = cart[item.id_menu];
            return (
              <div
                key={item.id_menu}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Thumbnail */}
                <div className="h-20 bg-gradient-to-br from-[#EEF2F8] to-slate-50 flex items-center justify-center relative">
                  {item.kategori === 'Minuman' ? (
                    <Coffee className="w-9 h-9 text-[#2B4263]/60" />
                  ) : (
                    <Utensils className="w-9 h-9 text-[#2B4263]/60" />
                  )}
                  {inCart && (
                    <span className="absolute top-1.5 right-1.5 bg-[#FA6338] text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow">
                      {inCart.jumlah}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="p-2.5">
                  <h3 className="font-bold text-slate-800 text-xs leading-tight line-clamp-2 mb-1">
                    {item.nama_menu}
                  </h3>
                  <p className="text-[#2B4263] font-black text-xs">
                    Rp {Number(item.harga).toLocaleString('id-ID')}
                  </p>

                  <div className="mt-2">
                    {inCart ? (
                      <div className="flex items-center justify-between bg-slate-50 rounded-xl px-1 py-0.5 border border-slate-100">
                        <button
                          onClick={() => updateQuantity(item.id_menu, -1)}
                          className="w-6 h-6 bg-white rounded-lg flex items-center justify-center text-slate-600 shadow-sm border border-slate-100 cursor-pointer"
                          aria-label="Kurangi jumlah"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold text-slate-800">{inCart.jumlah}</span>
                        <button
                          onClick={() => updateQuantity(item.id_menu, 1)}
                          className="w-6 h-6 bg-[#2B4263] rounded-lg flex items-center justify-center text-white shadow-sm cursor-pointer"
                          aria-label="Tambah jumlah"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart(item)}
                        className="w-full py-1.5 bg-[#2B4263] hover:bg-[#1f3049] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> Pesan
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Cart Button (glass) */}
      <AnimatePresence>
        {totalItemCount > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-20 left-4 right-4 max-w-md mx-auto z-40"
          >
            <button
              onClick={() => setShowCartModal(true)}
              className="w-full glass !bg-white/90 text-slate-800 px-4 py-3.5 rounded-2xl shadow-xl flex items-center justify-between hover:bg-white transition-colors border border-white/60"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#FA6338] rounded-xl flex items-center justify-center font-black text-xs shadow-md text-white">
                  {totalItemCount}
                </div>
                <div className="text-left">
                  <p className="text-[10px] text-slate-400">Pesanan saya</p>
                  <p className="text-sm font-bold text-slate-800">Rp {totalPrice.toLocaleString('id-ID')}</p>
                </div>
              </div>
              <span className="text-xs font-bold bg-[#2B4263] text-white px-3 py-1.5 rounded-xl">
                Lihat <ArrowRight className="w-3 h-3 inline" />
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cart Bottom Sheet */}
      <AnimatePresence>
        {showCartModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex flex-col justify-end"
            onClick={() => setShowCartModal(false)}
          >
            <motion.div
              initial={{ y: 60 }}
              animate={{ y: 0 }}
              exit={{ y: 60 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-t-3xl p-5 max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-[#2B4263]" /> Ringkasan Pesanan
                </h2>
                <button
                  onClick={() => setShowCartModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition-colors cursor-pointer"
                  aria-label="Tutup"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1 my-1">
                {cartItems.map(({ menu, jumlah }) => (
                  <div
                    key={menu.id_menu}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100"
                  >
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-800 text-sm">{menu.nama_menu}</h3>
                      <p className="text-xs text-[#2B4263] font-semibold mt-0.5">
                        Rp {Number(menu.harga).toLocaleString('id-ID')} × {jumlah}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <button
                        onClick={() => updateQuantity(menu.id_menu, -1)}
                        className="w-7 h-7 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-600 font-bold text-sm cursor-pointer"
                        aria-label="Kurangi"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-bold w-4 text-center">{jumlah}</span>
                      <button
                        onClick={() => updateQuantity(menu.id_menu, 1)}
                        className="w-7 h-7 bg-[#2B4263] text-white rounded-lg flex items-center justify-center font-bold text-sm cursor-pointer"
                        aria-label="Tambah"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 font-medium">Total Pesanan</span>
                  <span className="text-lg font-black text-slate-900">
                    Rp {totalPrice.toLocaleString('id-ID')}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 text-center">
                  Setelah memesan, silakan sebutkan Nomor Meja ke kasir untuk pembayaran
                </p>
                <button
                  onClick={handleCheckout}
                  disabled={loading}
                  className="w-full py-3.5 bg-[#2B4263] hover:bg-[#1f3049] disabled:opacity-50 text-white font-bold rounded-2xl shadow-md transition-colors text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Kirim Pesanan Sekarang'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
