import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  GitCompareArrows,
  Lock,
  ShieldAlert,
  ShieldCheck,
  ShoppingCart,
  Star,
  Store,
  Truck,
  Undo2,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { getProductById, getSaferAlternativeSync } from '../services/productService';
import { useTrustCart } from '../context/TrustCartContext';
import TrustBadge from '../components/common/TrustBadge';
import ProductCard from '../components/common/ProductCard';
import { formatCurrency } from '../utils/formatters';

export default function ProductDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, compareIds, toggleCompare, allProducts } = useTrustCart();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setQuantity(1);
    getProductById(id)
      .then((res) => {
        if (active) setProduct(res);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="h-96 rounded-3xl bg-white border border-slate-200 animate-pulse" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold text-[#1E293B]">Product not found</h1>
        <p className="mt-2 text-sm text-[#64748B]">
          The requested item could not be located in our verified catalog.
        </p>
        <Link
          to="/products"
          className="mt-6 inline-flex items-center gap-2 rounded-xl gradient-primary px-5 py-2.5 text-sm font-semibold text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Catalog
        </Link>
      </div>
    );
  }

  const isCompared = compareIds.includes(product.id);
  const saferAlt = product.trustScore < 80 ? getSaferAlternativeSync(product) : null;
  const related = allProducts
    .filter((p) => p.id !== product.id && p.trustScore >= 85)
    .slice(0, 3);

  const handleBuyNow = () => {
    if (addToCart(product.id, quantity)) {
      navigate('/checkout');
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-12">
      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/products"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#64748B] hover:text-[#635BFF] transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Products</span>
        </Link>
        <span className="text-xs text-[#64748B]">
          {product.category} / <strong className="text-[#1E293B]">{product.brand}</strong>
        </span>
      </div>

      {/* High Risk Warning Banner */}
      {product.trustScore < 60 && (
        <div className="rounded-2xl border border-[#DC2626]/30 bg-[#DC2626]/5 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-[#DC2626] shrink-0 mt-0.5" />
            <div>
              <h2 className="font-display text-base font-bold text-[#DC2626]">
                TrustCart AI Risk Warning ({product.trustScore}/100)
              </h2>
              <p className="text-sm text-[#1E293B] mt-0.5">{product.aiVerdict}</p>
            </div>
          </div>
          {saferAlt && (
            <Link
              to={`/products/${saferAlt.id}`}
              className="inline-flex items-center gap-2 rounded-xl bg-white border border-[#16A34A]/30 px-4 py-2 text-xs font-bold text-[#16A34A] hover:bg-[#16A34A]/5 shrink-0"
            >
              <ShieldCheck className="w-4 h-4" />
              View Safer Alternative
            </Link>
          )}
        </div>
      )}

      {/* Hero Product Panel */}
      <div className="grid gap-8 lg:grid-cols-12 items-start">
        {/* Left Image + AI Verdict */}
        <div className="lg:col-span-6 space-y-5">
          <div className="card-surface rounded-3xl p-6 sm:p-8">
            <div className="flex items-center justify-between mb-4">
              <span className="rounded-full bg-[#F8FAFC] border border-slate-200 px-3 py-1 text-xs font-semibold text-[#64748B]">
                {product.category}
              </span>
              <TrustBadge score={product.trustScore} size="md" />
            </div>
            <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl bg-[#F8FAFC] flex items-center justify-center">
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div className="card-surface rounded-2xl p-5 gradient-soft-surface">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#635BFF] mb-2">
              <Sparkles className="w-4 h-4" />
              <span>AI Safety Summary</span>
            </div>
            <p className="text-sm text-[#1E293B] leading-relaxed">{product.aiVerdict}</p>
          </div>
        </div>

        {/* Right Details & Buy Actions */}
        <div className="lg:col-span-6 card-surface rounded-3xl p-6 sm:p-8 space-y-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#64748B] mb-2">
              <span>{product.brand}</span>
              <span>•</span>
              <span className="inline-flex items-center gap-1 text-[#1E293B]">
                Sold by {product.seller.name}
                {product.seller.verified ? (
                  <BadgeCheck className="w-4 h-4 text-[#3B82F6]" />
                ) : (
                  <ShieldAlert className="w-4 h-4 text-[#DC2626]" />
                )}
              </span>
            </div>

            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#1E293B] leading-tight">
              {product.name}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <Star className="w-4 h-4 fill-[#F59E0B] text-[#F59E0B]" />
                <span className="font-bold text-[#1E293B]">{product.rating.toFixed(1)}</span>
                <span className="text-[#64748B]">
                  ({product.reviewCount.toLocaleString()} reviews)
                </span>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  product.verifiedPurchasePct >= 85
                    ? 'bg-[#16A34A]/10 text-[#16A34A]'
                    : 'bg-[#DC2626]/10 text-[#DC2626]'
                }`}
              >
                {product.verifiedPurchasePct}% Verified Buyer Reviews
              </span>
            </div>
          </div>

          {/* Pricing Block */}
          <div className="rounded-2xl bg-[#F8FAFC] border border-slate-200/80 p-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-baseline gap-2.5">
                <span className="font-display text-3xl font-extrabold text-[#1E293B]">
                  {formatCurrency(product.price)}
                </span>
                {product.originalPrice > product.price && (
                  <span className="text-sm text-[#64748B] line-through">
                    {formatCurrency(product.originalPrice)}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-[#64748B]">
                90-day market median:{' '}
                <strong className="text-[#1E293B]">
                  {formatCurrency(product.marketMedianPrice)}
                </strong>
              </p>
            </div>
            <Link
              to={`/risk-analysis?productId=${product.id}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#635BFF]/30 bg-white px-3.5 py-2 text-xs font-semibold text-[#635BFF] hover:bg-[#635BFF]/5 transition"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              Inspect Risk Indicators
            </Link>
          </div>

          {/* Highlights */}
          <ul className="space-y-2">
            {product.highlights.map((bullet) => (
              <li key={bullet} className="flex items-start gap-2.5 text-sm text-[#1E293B]">
                <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>

          {/* Quantity & Actions */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                Qty
              </label>
              <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="px-3 py-1.5 text-sm font-bold text-[#1E293B] hover:bg-slate-50 cursor-pointer"
                >
                  -
                </button>
                <span className="px-3 text-sm font-semibold text-[#1E293B]">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                  className="px-3 py-1.5 text-sm font-bold text-[#1E293B] hover:bg-slate-50 cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => addToCart(product.id, quantity)}
                className="inline-flex items-center justify-center gap-2 rounded-xl gradient-primary px-5 py-3 text-sm font-semibold text-white shadow-md shadow-[#635BFF]/20 hover:opacity-95 transition cursor-pointer"
              >
                <ShoppingCart className="w-4 h-4" />
                Add to Cart
              </button>
              <button
                type="button"
                onClick={handleBuyNow}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FFC439] hover:bg-[#F5BA2C] px-5 py-3 text-sm font-bold text-[#003087] transition cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                Buy Now with PayPal
              </button>
            </div>

            <button
              type="button"
              onClick={() => toggleCompare(product.id)}
              className={`w-full inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold transition cursor-pointer ${
                isCompared
                  ? 'border-[#635BFF] bg-[#635BFF]/10 text-[#635BFF]'
                  : 'border-slate-200 bg-white text-[#1E293B] hover:bg-slate-50'
              }`}
            >
              <GitCompareArrows className="w-4 h-4" />
              <span>
                {isCompared ? 'Added to Comparison (Click to Remove)' : 'Add to 3-Product Compare'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Specifications & Seller Intelligence */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Technical Specifications */}
        <section className="card-surface rounded-3xl p-6 sm:p-7">
          <h2 className="font-display text-lg font-bold text-[#1E293B] mb-4">
            Technical Specifications
          </h2>
          <dl className="divide-y divide-slate-100">
            {Object.entries(product.specs).map(([key, val]) => (
              <div key={key} className="py-3 flex items-center justify-between gap-4 text-sm">
                <dt className="font-medium text-[#64748B]">{key}</dt>
                <dd className="font-semibold text-[#1E293B] text-right">{val}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Seller Information */}
        <section className="card-surface rounded-3xl p-6 sm:p-7 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-[#1E293B]">
              Seller Verification Profile
            </h2>
            {product.seller.verified ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#16A34A]/10 px-3 py-1 text-xs font-bold text-[#16A34A]">
                <BadgeCheck className="w-3.5 h-3.5" />
                Verified Identity
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#DC2626]/10 px-3 py-1 text-xs font-bold text-[#DC2626]">
                <ShieldAlert className="w-3.5 h-3.5" />
                Unverified Seller
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div className="rounded-2xl bg-[#F8FAFC] p-3.5 border border-slate-100">
              <div className="flex items-center gap-1.5 text-xs text-[#64748B] mb-1">
                <Store className="w-3.5 h-3.5 text-[#635BFF]" />
                Storefront
              </div>
              <p className="text-sm font-bold text-[#1E293B]">{product.seller.name}</p>
              <p className="text-xs text-[#64748B] mt-0.5">{product.seller.location}</p>
            </div>

            <div className="rounded-2xl bg-[#F8FAFC] p-3.5 border border-slate-100">
              <div className="flex items-center gap-1.5 text-xs text-[#64748B] mb-1">
                <Star className="w-3.5 h-3.5 text-[#F59E0B]" />
                Seller Rating & Age
              </div>
              <p className="text-sm font-bold text-[#1E293B]">{product.seller.rating} / 5.0</p>
              <p className="text-xs text-[#64748B] mt-0.5">
                {product.seller.accountAgeMonths >= 12
                  ? `${(product.seller.accountAgeMonths / 12).toFixed(1)} years active`
                  : `${Math.round(product.seller.accountAgeMonths * 30)} days old`}
              </p>
            </div>

            <div className="rounded-2xl bg-[#F8FAFC] p-3.5 border border-slate-100">
              <div className="flex items-center gap-1.5 text-xs text-[#64748B] mb-1">
                <Truck className="w-3.5 h-3.5 text-[#3B82F6]" />
                Fulfillment
              </div>
              <p className="text-sm font-bold text-[#1E293B]">{product.seller.fulfillment}</p>
            </div>

            <div className="rounded-2xl bg-[#F8FAFC] p-3.5 border border-slate-100">
              <div className="flex items-center gap-1.5 text-xs text-[#64748B] mb-1">
                <Undo2 className="w-3.5 h-3.5 text-[#16A34A]" />
                Return Window
              </div>
              <p className="text-sm font-bold text-[#1E293B]">
                {product.seller.returnWindowDays > 0
                  ? `${product.seller.returnWindowDays}-Day Return Policy`
                  : 'No Returns Accepted'}
              </p>
            </div>
          </div>

          <Link
            to={`/risk-analysis?productId=${product.id}`}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#1E293B] hover:border-[#635BFF]/40 hover:text-[#635BFF] transition"
          >
            <ShieldCheck className="w-4 h-4 text-[#635BFF]" />
            View Full 5-Factor AI Risk Breakdown
          </Link>
        </section>
      </div>

      {/* Recommended Verified Products */}
      <section className="space-y-5">
        <h2 className="font-display text-xl font-bold text-[#1E293B]">
          Other Verified Safe Options
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {related.map((item) => (
            <ProductCard key={item.id} product={item} />
          ))}
        </div>
      </section>
    </div>
  );
}
