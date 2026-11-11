import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Boxes,
  AlertTriangle,
  PlusCircle,
  Store,
  Edit3,
  ArrowRight,
  DollarSign,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getMySellerProducts } from '../../services/sellerProductService';
import { formatCurrency } from '../../utils/formatters';

export default function SellerDashboardPage() {
  const { user, sellerProfile } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getMySellerProducts()
      .then((list) => {
        if (active) setProducts(list);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user?.id]);

  const metrics = useMemo(() => {
    const totalProducts = products.length;
    const totalStock = products.reduce((sum, p) => sum + (Number(p.stock) || 0), 0);
    const inventoryValue = products.reduce(
      (sum, p) => sum + (Number(p.price) || 0) * (Number(p.stock) || 0),
      0
    );
    const lowOrOutCount = products.filter((p) => (Number(p.stock) || 0) <= 5).length;
    return { totalProducts, totalStock, inventoryValue, lowOrOutCount };
  }, [products]);

  const stockBadge = (qty) => {
    if (qty <= 0) return 'bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/25';
    if (qty <= 5) return 'bg-[#F59E0B]/12 text-[#B45309] border-[#F59E0B]/30';
    return 'bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/25';
  };

  const stockLabel = (qty) => {
    if (qty <= 0) return 'Out of Stock';
    if (qty <= 5) return `Low Stock (${qty})`;
    return `In Stock (${qty})`;
  };

  const profileIncomplete =
    !sellerProfile?.shopName || !sellerProfile?.phone || !sellerProfile?.businessAddress;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#635BFF]">
            <LayoutDashboard className="w-4 h-4" />
            Seller Central
          </span>
          <h1 className="mt-1 font-display text-3xl font-extrabold text-[#1E293B]">
            Welcome, {sellerProfile?.shopName || user?.fullName}
          </h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Manage your product catalog, track stock inventory, and keep your seller storefront
            profile up to date.
          </p>
        </div>

        <Link
          to="/seller/add-product"
          className="inline-flex items-center gap-2 rounded-xl gradient-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#635BFF]/20 hover:opacity-95 transition self-start"
        >
          <PlusCircle className="w-4 h-4" />
          Add New Product
        </Link>
      </div>

      {/* Prompt to complete seller profile if fields are blank */}
      {profileIncomplete && (
        <div className="rounded-2xl border border-[#F59E0B]/35 bg-[#FFFBEB] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <Store className="w-5 h-5 text-[#B45309] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-[#1E293B]">Complete your Seller Profile</p>
              <p className="text-xs text-[#64748B]">
                Add your Business / Shop name, phone number, and business address so buyers see
                verified merchant details.
              </p>
            </div>
          </div>
          <Link
            to="/seller/profile"
            className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-slate-200 px-3.5 py-2 text-xs font-semibold text-[#1E293B] hover:border-[#635BFF]/40 hover:text-[#635BFF] shrink-0"
          >
            Update Seller Profile
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* KPI Metrics */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card-surface rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
              Total Products Added
            </p>
            <Package className="w-4 h-4 text-[#635BFF]" />
          </div>
          <p className="mt-2 font-display text-3xl font-extrabold text-[#1E293B]">
            {metrics.totalProducts}
          </p>
          <p className="mt-1 text-xs text-[#64748B]">Owned by your seller account</p>
        </div>

        <div className="card-surface rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
              Inventory Units
            </p>
            <Boxes className="w-4 h-4 text-[#3B82F6]" />
          </div>
          <p className="mt-2 font-display text-3xl font-extrabold text-[#1E293B]">
            {metrics.totalStock}
          </p>
          <p className="mt-1 text-xs text-[#64748B]">Total stock across listings</p>
        </div>

        <div className="card-surface rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
              Inventory Value
            </p>
            <DollarSign className="w-4 h-4 text-[#16A34A]" />
          </div>
          <p className="mt-2 font-display text-3xl font-extrabold text-[#1E293B]">
            {formatCurrency(metrics.inventoryValue)}
          </p>
          <p className="mt-1 text-xs text-[#64748B]">Retail catalog valuation</p>
        </div>

        <div className="card-surface rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
              Low / Out of Stock
            </p>
            <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
          </div>
          <p className="mt-2 font-display text-3xl font-extrabold text-[#1E293B]">
            {metrics.lowOrOutCount}
          </p>
          <p className="mt-1 text-xs text-[#64748B]">Items with 5 or fewer units</p>
        </div>
      </div>

      {/* Product Inventory Overview */}
      <section className="card-surface rounded-3xl overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4 bg-[#F8FAFC]">
          <div>
            <h2 className="font-display text-base font-bold text-[#1E293B]">
              Product Inventory Overview
            </h2>
            <p className="text-xs text-[#64748B]">
              Live summary of products created under your seller profile
            </p>
          </div>
          <Link
            to="/seller/products"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#635BFF] hover:underline"
          >
            Manage All Products
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-14 rounded-xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Package className="w-9 h-9 text-slate-300 mx-auto" />
            <h3 className="font-display text-lg font-bold text-[#1E293B]">
              No products added yet
            </h3>
            <p className="text-sm text-[#64748B] max-w-md mx-auto">
              Publish your first verified listing to start managing inventory and reaching TrustCart
              AI buyers.
            </p>
            <Link
              to="/seller/add-product"
              className="mt-2 inline-flex items-center gap-2 rounded-xl gradient-primary px-5 py-2.5 text-sm font-semibold text-white"
            >
              <PlusCircle className="w-4 h-4" />
              Add Your First Product
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[640px]">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-[#64748B]">
                  <th className="py-3.5 px-6">Product</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Price</th>
                  <th className="py-3.5 px-4">Stock Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {products.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-3">
                        <img
                          src={item.image}
                          alt={item.name}
                          onError={(e) => {
                            e.currentTarget.src = '/images/products/dock.svg';
                          }}
                          className="h-11 w-14 rounded-xl object-cover bg-[#F8FAFC] border border-slate-100 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-display font-bold text-[#1E293B] truncate max-w-[260px]">
                            {item.name}
                          </p>
                          <p className="text-xs text-[#64748B] truncate max-w-[260px]">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="rounded-full bg-[#F8FAFC] border border-slate-200 px-2.5 py-0.5 text-xs font-medium text-[#64748B]">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-display font-bold text-[#1E293B]">
                      {formatCurrency(item.price)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${stockBadge(
                          item.stock
                        )}`}
                      >
                        {stockLabel(item.stock)}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <Link
                        to={`/seller/edit-product/${item.id}`}
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#1E293B] hover:border-[#635BFF] hover:text-[#635BFF] transition"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
