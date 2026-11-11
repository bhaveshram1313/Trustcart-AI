import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  PlusCircle,
  Search,
  Edit3,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTrustCart } from '../../context/TrustCartContext';
import {
  deleteSellerProduct,
  getMySellerProducts,
} from '../../services/sellerProductService';
import DeleteConfirmModal from '../../components/seller/DeleteConfirmModal';
import { formatCurrency } from '../../utils/formatters';

export default function SellerMyProductsPage() {
  const { user } = useAuth();
  const { showToast, refreshCatalog } = useTrustCart();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadProducts = () => {
    setLoading(true);
    getMySellerProducts()
      .then((list) => setProducts(list))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProducts();
  }, [user?.id]);

  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }, [products, search]);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteSellerProduct(deleteTarget.id);
      setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      refreshCatalog();
      showToast(`Deleted "${deleteTarget.name}" from your inventory`, 'info');
      setDeleteTarget(null);
    } catch (err) {
      showToast(err.message || 'Unable to delete product.', 'warning');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#635BFF]">
            <Package className="w-4 h-4" />
            Seller Inventory
          </span>
          <h1 className="mt-1 font-display text-3xl font-extrabold text-[#1E293B]">
            My Products
          </h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Showing only products created under your seller account ({products.length}).
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative sm:w-64">
            <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search your products..."
              className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-[#1E293B] focus:border-[#635BFF] focus:outline-none"
            />
          </div>

          <Link
            to="/seller/add-product"
            className="inline-flex items-center justify-center gap-2 rounded-xl gradient-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95 transition"
          >
            <PlusCircle className="w-4 h-4" />
            Add Product
          </Link>
        </div>
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-80 rounded-2xl bg-white border border-slate-200 animate-pulse"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card-surface rounded-3xl p-12 text-center space-y-4">
          <Package className="w-9 h-9 text-slate-300 mx-auto" />
          <h2 className="font-display text-lg font-bold text-[#1E293B]">
            {products.length === 0 ? 'You have no products yet' : 'No matching products'}
          </h2>
          <p className="text-sm text-[#64748B] max-w-md mx-auto">
            {products.length === 0
              ? 'Add your first product listing to showcase it to buyers on TrustCart AI.'
              : 'Try adjusting your search query to view your listed items.'}
          </p>
          {products.length === 0 && (
            <Link
              to="/seller/add-product"
              className="inline-flex items-center gap-2 rounded-xl gradient-primary px-5 py-2.5 text-sm font-semibold text-white"
            >
              <PlusCircle className="w-4 h-4" />
              Add Product
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <article
              key={item.id}
              className="card-surface card-surface-hover rounded-2xl overflow-hidden flex flex-col justify-between"
            >
              <div>
                <div className="bg-[#F8FAFC] p-4 pb-2">
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="inline-flex items-center rounded-full bg-white px-2.5 py-0.5 text-[11px] font-medium text-[#64748B] border border-slate-200">
                      {item.category}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                        item.stock <= 0
                          ? 'bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/25'
                          : item.stock <= 5
                          ? 'bg-[#F59E0B]/12 text-[#B45309] border-[#F59E0B]/30'
                          : 'bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/25'
                      }`}
                    >
                      Stock: {item.stock}
                    </span>
                  </div>
                  <div className="aspect-[4/3] w-full overflow-hidden rounded-xl bg-white flex items-center justify-center">
                    <img
                      src={item.image}
                      alt={item.name}
                      onError={(e) => {
                        e.currentTarget.src = '/images/products/dock.svg';
                      }}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                <div className="p-5 pt-3.5">
                  <h2 className="font-display text-base font-bold text-[#1E293B] line-clamp-2">
                    {item.name}
                  </h2>
                  <p className="mt-1.5 text-xs text-[#64748B] line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>

              <div className="px-5 pb-5 pt-3 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-display text-xl font-bold text-[#1E293B]">
                    {formatCurrency(item.price)}
                  </span>
                  <span className="text-xs text-[#64748B]">
                    {Object.keys(item.specs || {}).length} specs
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <Link
                    to={`/seller/edit-product/${item.id}`}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#1E293B] hover:border-[#635BFF] hover:text-[#635BFF] transition"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(item)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#DC2626]/25 bg-white px-3 py-2 text-xs font-semibold text-[#DC2626] hover:bg-[#DC2626]/8 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <DeleteConfirmModal
        isOpen={Boolean(deleteTarget)}
        productName={deleteTarget?.name || ''}
        onConfirm={handleConfirmDelete}
        onCancel={() => !deleting && setDeleteTarget(null)}
        deleting={deleting}
      />
    </div>
  );
}
