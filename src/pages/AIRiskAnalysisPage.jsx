import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Search,
  Link2,
  Loader2,
  ArrowRight,
  Sparkles,
  BadgeCheck,
} from 'lucide-react';
import { analyzeListingRisk } from '../services/aiService';
import { useTrustCart } from '../context/TrustCartContext';
import RiskGauge from '../components/risk/RiskGauge';
import TrustBadge from '../components/common/TrustBadge';
import { formatCurrency } from '../utils/formatters';

const METRIC_LABELS = [
  { key: 'priceAnomaly', label: 'Price Integrity (vs Market Median)' },
  { key: 'sellerCredibility', label: 'Seller Identity & Longevity' },
  { key: 'reviewAuthenticity', label: 'Review Authenticity Pattern' },
  { key: 'counterfeitSignal', label: 'Counterfeit & Brand Alignment' },
  { key: 'returnProtection', label: 'Return & Escrow Protection' },
];

export default function AIRiskAnalysisPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { allProducts } = useTrustCart();

  const initialProductId = searchParams.get('productId') || 'dyson-v15-deal';

  const [mode, setMode] = useState('catalog'); // 'catalog' | 'custom'
  const [selectedProductId, setSelectedProductId] = useState(initialProductId);

  const [customForm, setCustomForm] = useState({
    url: 'https://marketplace-flash-deals.example/item/oem-pro-earbuds-clearance',
    title: 'Pro Max Studio ANC Wireless Earbuds - OEM Clearance Bulk',
    price: '45',
    expectedPrice: '249',
    sellerName: 'QuickElectroDeals99',
    sellerAgeDays: '12',
  });

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const paramId = searchParams.get('productId');
    if (paramId) {
      setMode('catalog');
      setSelectedProductId(paramId);
    }
  }, [searchParams]);

  useEffect(() => {
    if (mode !== 'catalog') return;
    let active = true;
    setLoading(true);
    analyzeListingRisk({ productId: selectedProductId })
      .then((res) => {
        if (active) setReport(res);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [mode, selectedProductId]);

  const handleCustomAnalyze = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await analyzeListingRisk(customForm);
      setReport(res);
    } finally {
      setLoading(false);
    }
  };

  const applyPreset = (type) => {
    if (type === 'risky') {
      setCustomForm({
        url: 'https://flash-liquidation.example/oem-clearance-vacuum',
        title: 'Flagship Cordless Vacuum 1:1 OEM Wholesale Clearance',
        price: '129',
        expectedPrice: '649',
        sellerName: 'GlobalFlashLiquidators',
        sellerAgeDays: '10',
      });
    } else {
      setCustomForm({
        url: 'https://authorized-tech.example/sony-xm5-official',
        title: 'Sony WH-1000XM5 Official Sealed Box Headphones',
        price: '329',
        expectedPrice: '349',
        sellerName: 'SoundCraft Authorized',
        sellerAgeDays: '1460',
      });
    }
  };

  const barColor = (val) => {
    if (val >= 80) return 'bg-[#16A34A]';
    if (val >= 60) return 'bg-[#F59E0B]';
    return 'bg-[#DC2626]';
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#635BFF]">
            <ShieldAlert className="w-4 h-4" />
            Gemini AI Risk Classifier
          </span>
          <h1 className="mt-1 font-display text-3xl font-extrabold text-[#1E293B]">
            AI Listing Risk Analysis
          </h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Inspect catalog listings or scan any external product URL for price anomalies,
            bot-review spikes, and unverified sellers.
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 self-start">
          <button
            type="button"
            onClick={() => setMode('catalog')}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition cursor-pointer ${
              mode === 'catalog'
                ? 'gradient-primary text-white shadow-xs'
                : 'text-[#64748B] hover:text-[#1E293B]'
            }`}
          >
            Inspect Catalog Listing
          </button>
          <button
            type="button"
            onClick={() => setMode('custom')}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition cursor-pointer ${
              mode === 'custom'
                ? 'gradient-primary text-white shadow-xs'
                : 'text-[#64748B] hover:text-[#1E293B]'
            }`}
          >
            Scan Custom URL / Deal
          </button>
        </div>
      </div>

      {/* Input / Selector Panel */}
      {mode === 'catalog' ? (
        <div className="card-surface rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <label className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
              Select Listing to Audit
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedProductId('dyson-v15-deal');
                  setSearchParams({ productId: 'dyson-v15-deal' });
                }}
                className="rounded-full border border-[#DC2626]/30 bg-[#DC2626]/8 px-3 py-1 text-xs font-semibold text-[#DC2626] hover:bg-[#DC2626]/15 transition cursor-pointer"
              >
                Sample: High-Risk Listing (34)
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedProductId('samsung-t9-2tb');
                  setSearchParams({ productId: 'samsung-t9-2tb' });
                }}
                className="rounded-full border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-3 py-1 text-xs font-semibold text-[#B45309] hover:bg-[#F59E0B]/20 transition cursor-pointer"
              >
                Sample: Caution Reseller (74)
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedProductId('sony-wh1000xm5');
                  setSearchParams({ productId: 'sony-wh1000xm5' });
                }}
                className="rounded-full border border-[#16A34A]/30 bg-[#16A34A]/10 px-3 py-1 text-xs font-semibold text-[#16A34A] hover:bg-[#16A34A]/20 transition cursor-pointer"
              >
                Sample: Verified Safe (95)
              </button>
            </div>
          </div>

          <select
            value={selectedProductId}
            onChange={(e) => {
              setSelectedProductId(e.target.value);
              setSearchParams({ productId: e.target.value });
            }}
            className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] px-4 py-3 text-sm font-semibold text-[#1E293B] focus:border-[#635BFF] focus:outline-none cursor-pointer"
          >
            {allProducts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {formatCurrency(p.price)} (Trust Score: {p.trustScore}/100)
              </option>
            ))}
          </select>
        </div>
      ) : (
        <form onSubmit={handleCustomAnalyze} className="card-surface rounded-2xl p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-bold text-[#1E293B]">
              <Link2 className="w-4 h-4 text-[#635BFF]" />
              <span>External Listing Inspector</span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => applyPreset('risky')}
                className="rounded-lg border border-[#DC2626]/25 bg-[#DC2626]/8 px-2.5 py-1 text-xs font-semibold text-[#DC2626] cursor-pointer"
              >
                Fill Risky Example
              </button>
              <button
                type="button"
                onClick={() => applyPreset('safe')}
                className="rounded-lg border border-[#16A34A]/25 bg-[#16A34A]/8 px-2.5 py-1 text-xs font-semibold text-[#16A34A] cursor-pointer"
              >
                Fill Safe Example
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-semibold text-[#64748B] mb-1">
                Listing URL
              </label>
              <input
                type="text"
                value={customForm.url}
                onChange={(e) => setCustomForm({ ...customForm, url: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 py-2.5 text-sm text-[#1E293B] focus:border-[#635BFF] focus:outline-none"
                placeholder="https://..."
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#64748B] mb-1">
                Product Listing Title
              </label>
              <input
                type="text"
                required
                value={customForm.title}
                onChange={(e) => setCustomForm({ ...customForm, title: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 py-2.5 text-sm text-[#1E293B] focus:border-[#635BFF] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#64748B] mb-1">
                Seller Name
              </label>
              <input
                type="text"
                value={customForm.sellerName}
                onChange={(e) => setCustomForm({ ...customForm, sellerName: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 py-2.5 text-sm text-[#1E293B] focus:border-[#635BFF] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#64748B] mb-1">
                Listed Price ($)
              </label>
              <input
                type="number"
                required
                min="1"
                value={customForm.price}
                onChange={(e) => setCustomForm({ ...customForm, price: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 py-2.5 text-sm text-[#1E293B] focus:border-[#635BFF] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#64748B] mb-1">
                Expected Retail Price ($)
              </label>
              <input
                type="number"
                required
                min="1"
                value={customForm.expectedPrice}
                onChange={(e) => setCustomForm({ ...customForm, expectedPrice: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 py-2.5 text-sm text-[#1E293B] focus:border-[#635BFF] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#64748B] mb-1">
                Seller Account Age (Days)
              </label>
              <input
                type="number"
                min="1"
                value={customForm.sellerAgeDays}
                onChange={(e) => setCustomForm({ ...customForm, sellerAgeDays: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 py-2.5 text-sm text-[#1E293B] focus:border-[#635BFF] focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl gradient-primary px-6 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-95 transition cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Run Gemini AI Risk Scan
          </button>
        </form>
      )}

      {/* Analysis Report Dashboard */}
      {loading ? (
        <div className="card-surface rounded-3xl p-12 flex flex-col items-center justify-center text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#635BFF] mb-3" />
          <p className="font-display text-base font-bold text-[#1E293B]">
            Running multi-factor AI risk audit...
          </p>
          <p className="text-xs text-[#64748B] mt-1">
            Evaluating price history, seller verification, and review distribution
          </p>
        </div>
      ) : (
        report && (
          <div className="grid gap-8 lg:grid-cols-12 items-start animate-fade-up">
            {/* Left Gauge & Summary */}
            <div className="lg:col-span-4 card-surface rounded-3xl p-6 sm:p-7 space-y-6 text-center">
              <div className="flex justify-center">
                <RiskGauge score={report.trustScore} />
              </div>

              <div>
                <div className="flex justify-center mb-2">
                  <TrustBadge score={report.trustScore} size="md" />
                </div>
                <h2 className="font-display text-lg font-bold text-[#1E293B] leading-snug">
                  {report.title}
                </h2>
                <p className="mt-1 text-xs text-[#64748B] flex items-center justify-center gap-1">
                  Seller: <strong className="text-[#1E293B]">{report.sellerName}</strong>
                  {report.sellerVerified && <BadgeCheck className="w-3.5 h-3.5 text-[#3B82F6]" />}
                </p>
              </div>

              <div className="rounded-2xl bg-[#F8FAFC] border border-slate-200/80 p-4 grid grid-cols-2 gap-3 text-left">
                <div>
                  <p className="text-[11px] text-[#64748B]">Listed Price</p>
                  <p className="font-display text-base font-bold text-[#1E293B]">
                    {formatCurrency(report.price)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-[#64748B]">Market Median</p>
                  <p className="font-display text-base font-bold text-[#1E293B]">
                    {formatCurrency(report.marketMedianPrice)}
                  </p>
                </div>
              </div>

              {report.productId && (
                <Link
                  to={`/products/${report.productId}`}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-[#1E293B] hover:border-[#635BFF] hover:text-[#635BFF] transition"
                >
                  View Product Details
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>

            {/* Right Metrics & Indicators */}
            <div className="lg:col-span-8 space-y-6">
              {/* Verdict Card */}
              <div className="card-surface rounded-3xl p-6 gradient-soft-surface">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#635BFF] mb-2">
                  <Sparkles className="w-4 h-4" />
                  <span>AI Risk Assessment Verdict</span>
                </div>
                <p className="text-sm sm:text-base font-medium text-[#1E293B] leading-relaxed">
                  {report.verdict}
                </p>
              </div>

              {/* 5-Factor Breakdown */}
              <div className="card-surface rounded-3xl p-6 space-y-4">
                <h3 className="font-display text-base font-bold text-[#1E293B]">
                  5-Factor Safety Breakdown
                </h3>
                <div className="space-y-3.5">
                  {METRIC_LABELS.map((m) => {
                    const value = report.metrics?.[m.key] ?? 0;
                    return (
                      <div key={m.key}>
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="font-medium text-[#1E293B]">{m.label}</span>
                          <span className="font-bold text-[#1E293B]">{value}/100</span>
                        </div>
                        <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${barColor(
                              value
                            )}`}
                            style={{ width: `${value}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Risk Indicator Findings */}
              <div className="card-surface rounded-3xl p-6 space-y-4">
                <h3 className="font-display text-base font-bold text-[#1E293B]">
                  Detected Listing Risk Indicators
                </h3>
                <div className="space-y-3">
                  {report.indicators.map((ind, idx) => {
                    const isDanger = ind.status === 'danger';
                    const isWarn = ind.status === 'warning' || ind.status === 'info';
                    const Icon = isDanger
                      ? ShieldAlert
                      : isWarn
                      ? AlertTriangle
                      : CheckCircle2;
                    const badgeStyle = isDanger
                      ? 'border-[#DC2626]/25 bg-[#DC2626]/5 text-[#DC2626]'
                      : isWarn
                      ? 'border-[#F59E0B]/30 bg-[#F59E0B]/8 text-[#B45309]'
                      : 'border-[#16A34A]/25 bg-[#16A34A]/6 text-[#16A34A]';

                    return (
                      <div
                        key={idx}
                        className={`rounded-2xl border p-4 flex items-start gap-3 ${badgeStyle}`}
                      >
                        <Icon className="w-5 h-5 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-bold text-[#1E293B]">{ind.title}</p>
                          <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed">
                            {ind.detail}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Safer Alternative Suggestion */}
              {report.saferAlternative && (
                <div className="rounded-3xl border border-[#16A34A]/30 bg-[#16A34A]/5 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="w-6 h-6 text-[#16A34A] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-[#16A34A]">
                        Recommended Verified Alternative
                      </p>
                      <p className="font-display text-sm font-bold text-[#1E293B] mt-0.5">
                        {report.saferAlternative.name} ·{' '}
                        {formatCurrency(report.saferAlternative.price)}
                      </p>
                      <p className="text-xs text-[#64748B]">
                        Trust Score {report.saferAlternative.trustScore}/100 · Sold by{' '}
                        {report.saferAlternative.seller.name}
                      </p>
                    </div>
                  </div>
                  <Link
                    to={`/products/${report.saferAlternative.id}`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#16A34A] px-4 py-2 text-xs font-bold text-white hover:opacity-95 shrink-0"
                  >
                    Switch to Safe Option
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        )
      )}
    </div>
  );
}
