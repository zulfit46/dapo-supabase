import React, { useState } from 'react';
import { 
  ShoppingCart, 
  Package, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  Receipt, 
  CreditCard, 
  Check, 
  Printer, 
  X,
  Store
} from 'lucide-react';
import { PosProduct, PosCartItem } from '../types';

interface PosViewProps {
  products: PosProduct[];
  onAddProduct: (product: PosProduct) => void;
  onDeleteProduct: (id: string) => void;
}

export const PosView: React.FC<PosViewProps> = ({
  products,
  onAddProduct,
  onDeleteProduct,
}) => {
  const [cart, setCart] = useState<PosCartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [recentTransaction, setRecentTransaction] = useState<{
    id: string;
    items: PosCartItem[];
    total: number;
    cash: number;
    change: number;
    date: string;
  } | null>(null);

  // New product form
  const [newKode, setNewKode] = useState('');
  const [newNama, setNewNama] = useState('');
  const [newKategori, setNewKategori] = useState('ATK');
  const [newHarga, setNewHarga] = useState<number>(10000);
  const [newStok, setNewStok] = useState<number>(50);
  const [newSatuan, setNewSatuan] = useState('Pcs');

  const categories = ['Semua', 'ATK', 'Pakaian', 'Praktik TKJ', 'Hardware'];

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.nama.toLowerCase().includes(searchQuery.toLowerCase()) || p.kode.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'Semua' || p.kategori === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (product: PosProduct) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.harga } : item
        );
      }
      return [...prev, { ...product, quantity: 1, subtotal: product.harga }];
    });
  };

  const updateCartQty = (id: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as PosCartItem[];
    });
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCart = () => setCart([]);

  const subtotal = cart.reduce((sum, item) => sum + item.harga * item.quantity, 0);

  const handleCheckout = () => {
    if (cart.length === 0) return;
    const finalCash = cashAmount >= subtotal ? cashAmount : subtotal;
    const change = finalCash - subtotal;

    setRecentTransaction({
      id: `TRX-${Date.now().toString().slice(-6)}`,
      items: [...cart],
      total: subtotal,
      cash: finalCash,
      change,
      date: new Date().toLocaleString('id-ID')
    });
    setShowReceiptModal(true);
    setCart([]);
    setCashAmount(0);
  };

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNama || !newKode) return;
    onAddProduct({
      id: `prod-${Date.now()}`,
      kode: newKode,
      nama: newNama,
      kategori: newKategori,
      harga: Number(newHarga),
      stok: Number(newStok),
      satuan: newSatuan
    });
    setNewKode('');
    setNewNama('');
    setShowAddProductModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Store className="w-6 h-6 text-amber-600" />
            <span>Modul POS / Kasir Unit Produksi SMK (dapos1)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Sistem kasir dan inventaris barang untuk koperasi siswa dan unit bisnis SMK.
          </p>
        </div>

        <button
          onClick={() => setShowAddProductModal(true)}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>+ Tambah Produk Baru</span>
        </button>
      </div>

      {/* Grid Content: Products Catalog & Cart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Products Grid (8 Cols) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari kode atau nama barang..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? 'bg-amber-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredProducts.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 hover:border-amber-400 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span className="font-mono">{p.kode}</span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-semibold">
                      {p.kategori}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm mb-1 leading-snug">{p.nama}</h4>
                  <div className="text-xs text-slate-500 mb-3">
                    Stok: <span className="font-semibold text-slate-700">{p.stok} {p.satuan}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-2">
                  <div className="text-sm font-extrabold text-amber-600">
                    Rp {p.harga.toLocaleString('id-ID')}
                  </div>
                  <button
                    onClick={() => addToCart(p)}
                    className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-600 text-amber-700 hover:text-white text-xs font-bold transition-all flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Pilih</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cart Drawer (5 Cols) */}
        <div className="lg:col-span-5 xl:col-span-4 bg-white rounded-2xl border border-slate-200 p-5 sticky top-20 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-amber-600" />
              <h3 className="font-bold text-slate-900 text-sm">Keranjang Transaksi</h3>
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-rose-500 hover:text-rose-700 font-medium"
              >
                Kosongkan
              </button>
            )}
          </div>

          {cart.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Package className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-semibold">Keranjang masih kosong</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Pilih barang dari katalog untuk transaksi</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100">
                {cart.map((item) => (
                  <div key={item.id} className="pt-2 first:pt-0 flex items-center justify-between text-xs">
                    <div className="min-w-0 pr-2">
                      <p className="font-semibold text-slate-800 truncate">{item.nama}</p>
                      <p className="text-[11px] text-slate-400">
                        Rp {item.harga.toLocaleString('id-ID')} / {item.satuan}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
                        <button
                          onClick={() => updateCartQty(item.id, -1)}
                          className="p-1 hover:bg-slate-100 text-slate-600"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 font-bold text-slate-800 text-xs">{item.quantity}</span>
                        <button
                          onClick={() => updateCartQty(item.id, 1)}
                          className="p-1 hover:bg-slate-100 text-slate-600"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="w-16 text-right font-bold text-slate-800 text-xs">
                        Rp {(item.harga * item.quantity).toLocaleString('id-ID')}
                      </div>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-slate-300 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total & Checkout Section */}
              <div className="pt-4 border-t border-slate-200 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 font-medium">Total Pembayaran:</span>
                  <span className="font-black text-xl text-slate-900">
                    Rp {subtotal.toLocaleString('id-ID')}
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Uang Diterima (Rp)
                  </label>
                  <input
                    type="number"
                    placeholder={`Minimal ${subtotal}`}
                    value={cashAmount || ''}
                    onChange={(e) => setCashAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500/20"
                  />
                  {cashAmount > 0 && cashAmount >= subtotal && (
                    <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                      Kembalian: Rp {(cashAmount - subtotal).toLocaleString('id-ID')}
                    </p>
                  )}
                </div>

                <button
                  onClick={handleCheckout}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold text-sm shadow-md shadow-amber-600/20 transition-all flex items-center justify-center gap-2"
                >
                  <Receipt className="w-4 h-4" />
                  <span>Proses Transaksi & Cetak Struk</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Product Modal */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">Tambah Produk POS Baru</h3>
            <p className="text-xs text-slate-500 mb-4">
              Masukkan informasi barang atau jasa untuk unit produksi SMK.
            </p>
            <form onSubmit={handleCreateProduct} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kode Barang</label>
                  <input
                    type="text"
                    required
                    placeholder="BRG-006"
                    value={newKode}
                    onChange={(e) => setNewKode(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kategori</label>
                  <select
                    value={newKategori}
                    onChange={(e) => setNewKategori(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                  >
                    <option value="ATK">ATK</option>
                    <option value="Pakaian">Pakaian</option>
                    <option value="Praktik TKJ">Praktik TKJ</option>
                    <option value="Hardware">Hardware</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Barang</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kabel UTP Belden Cat5e 1 Meter"
                  value={newNama}
                  onChange={(e) => setNewNama(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Harga (Rp)</label>
                  <input
                    type="number"
                    required
                    value={newHarga}
                    onChange={(e) => setNewHarga(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Stok</label>
                  <input
                    type="number"
                    required
                    value={newStok}
                    onChange={(e) => setNewStok(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Satuan</label>
                  <input
                    type="text"
                    required
                    value={newSatuan}
                    onChange={(e) => setNewSatuan(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm"
                >
                  Simpan Produk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceiptModal && recentTransaction && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-dashed border-slate-200">
              <div className="text-center w-full">
                <h3 className="font-bold text-slate-900 text-base">STRUK TRANSAKSI dapos1</h3>
                <p className="text-[11px] text-slate-400">Unit Usaha & Kasir Sekolah</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{recentTransaction.date}</p>
              </div>
            </div>

            <div className="py-4 space-y-2 text-xs">
              <div className="flex justify-between text-slate-500 font-mono text-[11px]">
                <span>No: {recentTransaction.id}</span>
                <span>Kasir: Admin</span>
              </div>
              <div className="divide-y divide-dashed divide-slate-200 my-2">
                {recentTransaction.items.map((item) => (
                  <div key={item.id} className="py-1.5 flex justify-between">
                    <div>
                      <div className="font-medium text-slate-800">{item.nama}</div>
                      <div className="text-[11px] text-slate-400">{item.quantity} x Rp {item.harga.toLocaleString('id-ID')}</div>
                    </div>
                    <div className="font-semibold text-slate-800">
                      Rp {(item.quantity * item.harga).toLocaleString('id-ID')}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-dashed border-slate-200 space-y-1">
                <div className="flex justify-between font-bold text-slate-900">
                  <span>TOTAL:</span>
                  <span>Rp {recentTransaction.total.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Tunai / Bayar:</span>
                  <span>Rp {recentTransaction.cash.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Kembali:</span>
                  <span>Rp {recentTransaction.change.toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex gap-2">
              <button
                onClick={() => setShowReceiptModal(false)}
                className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs"
              >
                Tutup
              </button>
              <button
                onClick={() => {
                  window.print();
                }}
                className="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
