import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search,
  SlidersHorizontal,
  ShieldCheck,
  GitCompareArrows,
  RotateCcw,
  ArrowRight,
  X,
} from 'lucide-react';
import { getCategoriesSync, getProducts } from '../services/productService';
import ProductCard from '../components/common/ProductCard';
import { useTrustCart } from '../context/TrustCartContext';

export default function ProductListingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { compareProducts, toggleCompare } = useTrustCart();

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(searchParams.get('category') || 'All');
  const [minTrustScore, setMinTrustScore] = useState(0);
  const [maxPrice, setMaxPrice] = useState(1500);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sortBy, setSortBy] = useState('trust-desc');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const categories = useMemo(() => getCategoriesSync(), []);

  useEffect(() => {
    const paramSearch = searchParams.get('search');
    if (paramSearch !== null && paramSearch !== search) {
      setSearch(paramSearch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getProducts({
      search,
      category,
      minTrustScore,
      maxPrice,
      verifiedOnly,
      sortBy,
    })
      .then((list) => {
        if (active) setProducts(list);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [search, category, minTrustScore, maxPrice, verifiedOnly, sortBy]);

  const resetFilters = () => {
    setSearch('');
    setCategory('All');
    setMinTrustScore(0);
    setMaxPrice(1500);
    setVerifiedOnly(false);
    setSortBy('trust-desc');
    setSearchParams({});
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#635BFF]">
            <ShieldCheck className="w-4 h-4" />
            Trust-Scored Marketplace Catalog
          </span>
          <h1 className="mt-1 font-display text-3xl font-extrabold text-[#1E293B]">
            Explore Verified Products
          </h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Filter by Trust Score, verified merchant status, category, or budget. Select up to 3
            items to compare side-by-side.
          </p>
        </div>

        {/* Search & Sort Bar */}
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products, brands, sellers..."
              className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-[#1E293B] placeholder:text-[#64748B] focus:border-[#635BFF] focus:outline-none focus:ring-2 focus:ring-[#635BFF]/15"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            aria-label="Sort products"
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-[#1E293B] focus:border-[#635BFF] focus:outline-none cursor-pointer"
          >
            <option value="trust-desc">Sort: Highest Trust Score</option>
            <option value="price-asc">Sort: Price Low to High</option>
            <option value="price-desc">Sort: Price High to Low</option>
            <option value="rating-desc">Sort: Top Customer Rating</option>
          </select>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {categories.map((cat) => {
          const active = category === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition cursor-pointer ${
                active
                  ? 'gradient-primary text-white shadow-sm shadow-[#635BFF]/20'
                  : 'border border-slate-200 bg-white text-[#64748B] hover:border-slate-300 hover:text-[#1E293B]'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Main Content Layout: Filter Sidebar + Grid */}
      <div className="grid gap-8 lg:grid-cols-4 items-start">
        {/* Filters Panel */}
        <aside className="card-surface rounded-2xl p-5 space-y-6 lg:sticky lg:top-24">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 font-display text-sm font-bold text-[#1E293B]">
              <SlidersHorizontal className="w-4 h-4 text-[#635BFF]" />
              <span>Smart Filters</span>
            </div>
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#64748B] hover:text-[#635BFF] transition cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          </div>

          {/* Minimum Trust Score */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#64748B] mb-2.5">
              Minimum Trust Score
            </p>
            <div className="space-y-2">
              {[
                { label: 'Show All Listings', val: 0 },
                { label: '65+ Caution & Safe', val: 65 },
                { label: '85+ Safe Verified Only', val: 85 },
              ].map((opt) => (
                <label
                  key={opt.val}
                  className={`flex items-center justify-between rounded-xl border px-3 py-2 text-xs font-medium cursor-pointer transition ${
                    minTrustScore === opt.val
                      ? 'border-[#635BFF] bg-[#635BFF]/8 text-[#635BFF]'
                      : 'border-slate-200 text-[#1E293B] hover:bg-slate-50'
                  }`}
                >
                  <span>{opt.label}</span>
                  <input
                    type="radio"
                    name="minTrust"
                    checked={minTrustScore === opt.val}
                    onChange={() => setMinTrustScore(opt.val)}
                    className="accent-[#635BFF]"
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Max Price */}
          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-bold uppercase tracking-wider text-[#64748B]">Max Price</span>
              <span className="font-bold text-[#1E293B]">${maxPrice}</span>
            </div>
            <input
              type="range"
              min="50"
              max="1500"
              step="50"
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full accent-[#635BFF] cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-[#64748B] mt-1">
              <span>$50</span>
              <span>$1,500+</span>
            </div>
          </div>

          {/* Verified Seller Switch */}
          <label className="flex items-center justify-between rounded-xl border border-slate-200 px-3.5 py-3 cursor-pointer hover:bg-slate-50 transition">
            <div>
              <p className="text-xs font-bold text-[#1E293B]">Verified Sellers Only</p>
              <p className="text-[11px] text-[#64748B]">Hide unverified pop-up shops</p>
            </div>
            <input
              type="checkbox"
              checked={verifiedOnly}
              onChange={(e) => setVerifiedOnly(e.target.checked)}
              className="h-4 w-4 accent-[#635BFF] rounded cursor-pointer"
            />
          </label>
        </aside>

        {/* Product Grid */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between text-xs text-[#64748B]">
            <span>
              Showing <strong className="text-[#1E293B]">{products.length}</strong> product
              {products.length === 1 ? '' : 's'}
            </span>
            {products.some((p) => p.trustScore < 60) && (
              <span className="text-[#DC2626] font-medium">
                Includes flagged listings for risk demonstration
              </span>
            )}
          </div>

          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div
                  key={n}
                  className="h-[410px] rounded-2xl bg-white border border-slate-200 animate-pulse p-5"
                >
                  <div className="h-44 rounded-xl bg-slate-100 mb-4" />
                  <div className="h-4 w-2/3 bg-slate-100 rounded mb-2" />
                  <div className="h-4 w-1/2 bg-slate-100 rounded mb-6" />
                  <div className="h-10 w-full bg-slate-100 rounded-xl mt-auto" />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="card-surface rounded-2xl p-12 text-center">
              <p className="font-display text-lg font-bold text-[#1E293B]">
                No matching products found
              </p>
              <p className="mt-1 text-sm text-[#64748B]">
                Try clearing filters or increasing your price cap to see more verified listings.
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="mt-5 inline-flex items-center gap-2 rounded-xl gradient-primary px-5 py-2.5 text-sm font-semibold text-white cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Floating Compare Tray */}
      {compareProducts.length > 0 && (
        <div className="sticky bottom-4 z-30 mx-auto max-w-4xl animate-fade-up">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-[#635BFF]/25 bg-white/95 backdrop-blur-md px-5 py-3.5 shadow-2xl shadow-slate-900/15">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#635BFF]">
                <GitCompareArrows className="w-4 h-4" />
                Compare ({compareProducts.length}/3):
              </span>
              {compareProducts.map((item) => (
                <span
                  key={item.id}
                  className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-[#1E293B]"
                >
                  <span className="max-w-[130px] truncate">{item.name}</span>
                  <button
                    type="button"
                    onClick={() => toggleCompare(item.id)}
                    className="text-[#64748B] hover:text-[#DC2626] cursor-pointer"
                    aria-label={`Remove ${item.name} from compare`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
            <Link
              to="/compare"
              className="inline-flex items-center gap-2 rounded-xl gradient-primary px-4 py-2 text-xs font-bold text-white shadow-sm hover:opacity-95 shrink-0"
            >
              <span>Compare Now</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
