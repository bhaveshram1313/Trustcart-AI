import React from 'react';
import { Link } from 'react-router-dom';
import {
  BadgeCheck,
  GitCompareArrows,
  ShieldAlert,
  ShoppingCart,
  Star,
  ArrowUpRight,
} from 'lucide-react';
import TrustBadge from './TrustBadge';
import { formatCurrency } from '../../utils/formatters';
import { useTrustCart } from '../../context/TrustCartContext';

export default function ProductCard({ product }) {
  const { addToCart, compareIds, toggleCompare } = useTrustCart();
  const isCompared = compareIds.includes(product.id);
  const discountPct =
    product.originalPrice > product.price
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : 0;

  return (
    <article className="card-surface card-surface-hover rounded-2xl overflow-hidden flex flex-col justify-between group">
      <div>
        {/* Image Header */}
        <Link
          to={`/products/${product.id}`}
          className="block relative bg-[#F8FAFC] p-4 pb-2 overflow-hidden"
        >
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <span className="inline-flex items-center rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-medium text-[#64748B] border border-slate-200/80">
              {product.category}
            </span>
            <TrustBadge score={product.trustScore} size="sm" />
          </div>

          <div className="aspect-[4/3] w-full overflow-hidden rounded-xl bg-white flex items-center justify-center">
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              loading="lazy"
            />
          </div>
        </Link>

        {/* Body */}
        <div className="p-5 pt-3.5">
          <div className="flex items-center gap-1.5 text-xs text-[#64748B] mb-1.5">
            <span className="font-medium text-[#1E293B] truncate max-w-[160px]">
              {product.seller.name}
            </span>
            {product.seller.verified ? (
              <BadgeCheck className="w-3.5 h-3.5 text-[#3B82F6] shrink-0" title="Verified Seller" />
            ) : (
              <ShieldAlert className="w-3.5 h-3.5 text-[#DC2626] shrink-0" title="Unverified Seller" />
            )}
            <span className="text-slate-300">•</span>
            <span className="truncate">{product.brand}</span>
          </div>

          <Link
            to={`/products/${product.id}`}
            className="block font-display text-[15px] font-bold text-[#1E293B] leading-snug hover:text-[#635BFF] transition-colors line-clamp-2 min-h-[42px]"
          >
            {product.name}
          </Link>

          <p className="mt-1.5 text-xs text-[#64748B] line-clamp-2 leading-relaxed min-h-[36px]">
            {product.shortSummary}
          </p>

          {/* Rating & Authenticity */}
          <div className="mt-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-[#F59E0B] text-[#F59E0B]" />
              <span className="font-semibold text-[#1E293B]">{product.rating.toFixed(1)}</span>
              <span className="text-[#64748B]">({product.reviewCount.toLocaleString()})</span>
            </div>
            <span
              className={`font-medium ${
                product.verifiedPurchasePct >= 85
                  ? 'text-[#16A34A]'
                  : product.verifiedPurchasePct >= 70
                  ? 'text-[#B45309]'
                  : 'text-[#DC2626]'
              }`}
            >
              {product.verifiedPurchasePct}% verified reviews
            </span>
          </div>
        </div>
      </div>

      {/* Pricing & Actions Footer */}
      <div className="px-5 pb-5 pt-3 border-t border-slate-100">
        <div className="flex items-baseline justify-between gap-2 mb-3.5">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-xl font-bold text-[#1E293B]">
              {formatCurrency(product.price)}
            </span>
            {discountPct > 0 && (
              <span className="text-xs text-[#64748B] line-through">
                {formatCurrency(product.originalPrice)}
              </span>
            )}
          </div>
          {discountPct > 0 && (
            <span
              className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
                product.trustScore < 60
                  ? 'bg-[#DC2626]/10 text-[#DC2626]'
                  : 'bg-[#635BFF]/10 text-[#635BFF]'
              }`}
            >
              -{discountPct}%
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => addToCart(product.id)}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-semibold transition cursor-pointer ${
              product.trustScore < 60
                ? 'bg-slate-100 text-[#1E293B] hover:bg-slate-200'
                : 'gradient-primary text-white shadow-sm shadow-[#635BFF]/20 hover:opacity-95'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Add to Cart</span>
          </button>

          <button
            type="button"
            onClick={() => toggleCompare(product.id)}
            title={isCompared ? 'Remove from comparison' : 'Compare product (up to 3)'}
            className={`inline-flex items-center justify-center rounded-xl border px-2.5 py-2.5 text-xs font-semibold transition cursor-pointer ${
              isCompared
                ? 'border-[#635BFF] bg-[#635BFF]/10 text-[#635BFF]'
                : 'border-slate-200 bg-white text-[#64748B] hover:border-slate-300 hover:text-[#1E293B]'
            }`}
          >
            <GitCompareArrows className="w-4 h-4" />
          </button>

          <Link
            to={`/risk-analysis?productId=${product.id}`}
            title="Inspect AI Risk Indicators"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-2.5 py-2.5 text-xs font-semibold text-[#64748B] hover:border-[#3B82F6]/40 hover:text-[#3B82F6] transition"
          >
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}
