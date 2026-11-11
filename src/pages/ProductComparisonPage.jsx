import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  GitCompareArrows,
  BadgeCheck,
  ShieldAlert,
  ShoppingCart,
  Trash2,
  Award,
  ShieldCheck,
  Star,
  Plus,
} from 'lucide-react';
import { useTrustCart } from '../context/TrustCartContext';
import { compareProductsWithAI } from '../services/aiService';
import TrustBadge from '../components/common/TrustBadge';
import { formatCurrency } from '../utils/formatters';

export default function ProductComparisonPage() {
  const {
    allProducts,
    compareProducts,
    setCompareSlot,
    toggleCompare,
    clearCompare,
    addToCart,
  } = useTrustCart();

  const [aiComparison, setAiComparison] = useState(null);

  useEffect(() => {
    let active = true;
    if (compareProducts.length === 0) {
      setAiComparison(null);
      return;
    }
    compareProductsWithAI(compareProducts).then((res) => {
      if (active) setAiComparison(res);
    });
    return () => {
      active = false;
    };
  }, [compareProducts]);

  // Gather union of all spec keys across selected products
  const specKeys = useMemo(() => {
    const keys = new Set();
    compareProducts.forEach((p) => {
      Object.keys(p.specs || {}).forEach((k) => keys.add(k));
    });
    return Array.from(keys);
  }, [compareProducts]);

  const slots = [0, 1, 2];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#635BFF]">
            <GitCompareArrows className="w-4 h-4" />
            Side-by-Side Intelligence
          </span>
          <h1 className="mt-1 font-display text-3xl font-extrabold text-[#1E293B]">
            Product Comparison (Up to 3)
          </h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Compare Trust Scores, verified seller credentials, pricing fairness, and technical
            specifications before checking out.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {compareProducts.length > 0 && (
            <button
              type="button"
              onClick={clearCompare}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-[#64748B] hover:text-[#DC2626] hover:border-[#DC2626]/30 transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Slots
            </button>
          )}
          <Link
            to="/products"
            className="inline-flex items-center gap-1.5 rounded-xl gradient-primary px-4 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-95 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Browse Catalog
          </Link>
        </div>
      </div>

      {/* AI Smart Verdict Banner */}
      {aiComparison && compareProducts.length >= 2 && (
        <div
          className={`rounded-3xl border p-6 shadow-sm animate-fade-up ${
            aiComparison.hasHighRisk
              ? 'border-[#F59E0B]/40 bg-[#FFFBEB]'
              : 'border-[#635BFF]/20 gradient-soft-surface'
          }`}
        >
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary text-white shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-base font-bold text-[#1E293B]">
                  TrustCart AI Comparison Verdict
                </h2>
                <span className="rounded-full bg-[#635BFF]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#635BFF]">
                  Gemini Reasoning
                </span>
              </div>
              <p className="text-sm text-[#1E293B] leading-relaxed">{aiComparison.summary}</p>
            </div>
          </div>
        </div>
      )}

      {/* Slot Selector Row */}
      <div className="grid gap-5 md:grid-cols-3">
        {slots.map((slotIndex) => {
          const item = compareProducts[slotIndex];
          const isBestOverall = item && aiComparison?.bestOverallId === item.id;
          const isSafest = item && aiComparison?.safestId === item.id;

          return (
            <div
              key={slotIndex}
              className="card-surface rounded-2xl p-5 flex flex-col justify-between gap-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                    Slot {slotIndex + 1}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {isBestOverall && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#635BFF]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#635BFF]">
                        <Award className="w-3 h-3" />
                        Best Overall
                      </span>
                    )}
                    {isSafest && !isBestOverall && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#16A34A]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#16A34A]">
                        <ShieldCheck className="w-3 h-3" />
                        Safest Pick
                      </span>
                    )}
                  </div>
                </div>

                {/* Product Dropdown Switcher */}
                <select
                  value={item?.id || ''}
                  onChange={(e) => setCompareSlot(slotIndex, e.target.value)}
                  aria-label={`Select product for comparison slot ${slotIndex + 1}`}
                  className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] px-3 py-2 text-xs font-semibold text-[#1E293B] focus:border-[#635BFF] focus:outline-none cursor-pointer"
                >
                  <option value="">-- Choose a product --</option>
                  {allProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({formatCurrency(p.price)} · {p.trustScore}/100)
                    </option>
                  ))}
                </select>
              </div>

              {item ? (
                <div className="space-y-3">
                  <Link
                    to={`/products/${item.id}`}
                    className="block aspect-[4/3] overflow-hidden rounded-xl bg-[#F8FAFC]"
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </Link>
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <TrustBadge score={item.trustScore} size="sm" />
                      <span className="font-display text-lg font-extrabold text-[#1E293B]">
                        {formatCurrency(item.price)}
                      </span>
                    </div>
                    <Link
                      to={`/products/${item.id}`}
                      className="font-display text-sm font-bold text-[#1E293B] hover:text-[#635BFF] line-clamp-2"
                    >
                      {item.name}
                    </Link>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => addToCart(item.id)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl gradient-primary px-3 py-2 text-xs font-semibold text-white hover:opacity-95 cursor-pointer"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      Add to Cart
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleCompare(item.id)}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-[#64748B] hover:text-[#DC2626] cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-[#F8FAFC] py-12 px-4 text-center">
                  <GitCompareArrows className="w-7 h-7 text-slate-300 mb-2" />
                  <p className="text-xs font-medium text-[#64748B]">
                    Select a product above to populate slot {slotIndex + 1}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Detailed Comparison Matrix */}
      {compareProducts.length > 0 && (
        <div className="card-surface rounded-3xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[680px]">
              <thead>
                <tr className="border-b border-slate-200 bg-[#F8FAFC]">
                  <th className="py-4 px-5 text-xs font-bold uppercase tracking-wider text-[#64748B] w-52">
                    Comparison Metric
                  </th>
                  {compareProducts.map((p) => (
                    <th key={p.id} className="py-4 px-5 text-sm font-bold text-[#1E293B]">
                      {p.brand} · {p.category}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                <tr>
                  <td className="py-3.5 px-5 font-semibold text-[#64748B]">Listed Price</td>
                  {compareProducts.map((p) => (
                    <td key={p.id} className="py-3.5 px-5 font-display font-bold text-[#1E293B]">
                      {formatCurrency(p.price)}{' '}
                      <span className="text-xs font-normal text-[#64748B]">
                        (Median {formatCurrency(p.marketMedianPrice)})
                      </span>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3.5 px-5 font-semibold text-[#64748B]">TrustCart Score</td>
                  {compareProducts.map((p) => (
                    <td key={p.id} className="py-3.5 px-5">
                      <TrustBadge score={p.trustScore} size="sm" />
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3.5 px-5 font-semibold text-[#64748B]">Seller & Verification</td>
                  {compareProducts.map((p) => (
                    <td key={p.id} className="py-3.5 px-5">
                      <div className="inline-flex items-center gap-1.5 font-medium text-[#1E293B]">
                        <span>{p.seller.name}</span>
                        {p.seller.verified ? (
                          <BadgeCheck className="w-4 h-4 text-[#3B82F6]" />
                        ) : (
                          <ShieldAlert className="w-4 h-4 text-[#DC2626]" />
                        )}
                      </div>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3.5 px-5 font-semibold text-[#64748B]">
                    Rating & Verified Reviews
                  </td>
                  {compareProducts.map((p) => (
                    <td key={p.id} className="py-3.5 px-5">
                      <span className="inline-flex items-center gap-1 font-semibold text-[#1E293B]">
                        <Star className="w-3.5 h-3.5 fill-[#F59E0B] text-[#F59E0B]" />
                        {p.rating.toFixed(1)}
                      </span>{' '}
                      <span className="text-xs text-[#64748B]">
                        · {p.verifiedPurchasePct}% verified ({p.reviewCount.toLocaleString()})
                      </span>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3.5 px-5 font-semibold text-[#64748B]">Return Policy</td>
                  {compareProducts.map((p) => (
                    <td key={p.id} className="py-3.5 px-5 font-medium text-[#1E293B]">
                      {p.seller.returnWindowDays > 0 ? (
                        <span className="text-[#16A34A]">
                          {p.seller.returnWindowDays}-Day Return Eligible
                        </span>
                      ) : (
                        <span className="text-[#DC2626]">Final Sale (No Returns)</span>
                      )}
                    </td>
                  ))}
                </tr>
                {specKeys.map((specKey) => (
                  <tr key={specKey}>
                    <td className="py-3.5 px-5 font-semibold text-[#64748B]">{specKey}</td>
                    {compareProducts.map((p) => (
                      <td key={p.id} className="py-3.5 px-5 text-[#1E293B]">
                        {p.specs?.[specKey] || <span className="text-slate-400">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
