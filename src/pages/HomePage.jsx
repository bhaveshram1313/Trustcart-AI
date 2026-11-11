import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Search,
  ShieldCheck,
  GitCompareArrows,
  ShieldAlert,
  CreditCard,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { askShoppingAssistant } from '../services/aiService';
import { useTrustCart } from '../context/TrustCartContext';
import ProductCard from '../components/common/ProductCard';
import TrustBadge from '../components/common/TrustBadge';
import { formatCurrency } from '../utils/formatters';

const SUGGESTED_PROMPTS = [
  'Best noise-canceling headphones under $350',
  'Safe 4K monitors for coding',
  'Verified MacBook laptops under $1300',
  'Flag suspicious high-risk deals',
];

const TRUST_PILLARS = [
  {
    icon: Sparkles,
    title: 'Gemini AI Search',
    desc: 'Ask in plain English for budgets, use cases, and verified sellers — no keyword guesswork.',
    accent: 'text-[#635BFF] bg-[#635BFF]/10',
  },
  {
    icon: ShieldAlert,
    title: 'Real-Time Risk Shield',
    desc: 'Spots extreme price anomalies, synthetic 5-star review spikes, and pop-up dropshippers.',
    accent: 'text-[#DC2626] bg-[#DC2626]/10',
  },
  {
    icon: GitCompareArrows,
    title: '3-Way Smart Compare',
    desc: 'Weigh specs, Trust Scores, and warranty terms side-by-side with an AI winner summary.',
    accent: 'text-[#3B82F6] bg-[#3B82F6]/10',
  },
  {
    icon: CreditCard,
    title: 'PayPal Protected Pay',
    desc: 'Seamless PayPal Sandbox checkout flow backed by escrow protection and tracked receipts.',
    accent: 'text-[#16A34A] bg-[#16A34A]/10',
  },
];

export default function HomePage() {
  const { allProducts } = useTrustCart();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState(null);

  const safeFeatured = allProducts
    .filter((p) => p.trustScore >= 90)
    .slice(0, 4);
  const flaggedListings = allProducts.filter((p) => p.trustScore < 60);

  const runAssistant = async (promptText) => {
    const targetQuery = (promptText ?? query).trim();
    if (!targetQuery) return;
    setQuery(targetQuery);
    setLoading(true);
    try {
      const res = await askShoppingAssistant(targetQuery);
      setAiResponse(res);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    runAssistant(query);
  };

  return (
    <div className="space-y-16 pb-8">
      {/* Hero + AI Shopping Assistant Search */}
      <section className="hero-mesh border-b border-slate-200/70">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#635BFF]/20 bg-white/90 px-3.5 py-1.5 text-xs font-semibold text-[#635BFF] shadow-xs mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI-Powered Shopping Intelligence & Risk Protection</span>
            </div>

            <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-[#1E293B] leading-[1.12]">
              Shop smarter with{' '}
              <span className="bg-gradient-to-r from-[#635BFF] to-[#3B82F6] bg-clip-text text-transparent">
                TrustCart AI
              </span>
            </h1>

            <p className="mt-3 text-base sm:text-lg font-semibold text-[#635BFF]">
              Think Smart. Shop Safe. Pay Confidently.
            </p>
            <p className="mt-3 text-sm sm:text-base text-[#64748B] max-w-2xl mx-auto leading-relaxed">
              Ask our AI assistant to find verified products within your budget, inspect any listing
              for counterfeit risk, compare up to 3 options, and pay securely through PayPal.
            </p>

            {/* AI Search Form */}
            <form onSubmit={handleSubmit} className="mt-8">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg shadow-slate-900/5 focus-within:border-[#635BFF] focus-within:ring-4 focus-within:ring-[#635BFF]/10 transition">
                <div className="flex flex-1 items-center gap-3 px-3">
                  <Search className="w-5 h-5 text-[#635BFF] shrink-0" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ask TrustCart AI (e.g., Best wireless headphones under $350 with safe sellers)..."
                    className="w-full bg-transparent py-2.5 text-sm text-[#1E293B] placeholder:text-[#64748B] focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !query.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl gradient-primary px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-[#635BFF]/25 hover:opacity-95 transition cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Ask AI</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Quick Prompt Chips */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <span className="text-xs font-medium text-[#64748B]">Try:</span>
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => runAssistant(prompt)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-[#1E293B] hover:border-[#635BFF]/40 hover:text-[#635BFF] transition cursor-pointer"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive AI Response Panel */}
          {aiResponse && (
            <div className="mx-auto mt-10 max-w-5xl rounded-3xl border border-[#635BFF]/20 bg-white p-6 sm:p-8 shadow-xl shadow-[#635BFF]/5 animate-fade-up">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary text-white shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-lg font-bold text-[#1E293B]">
                        {aiResponse.headline}
                      </h2>
                      <span className="rounded-full bg-[#635BFF]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#635BFF]">
                        {aiResponse.modelTag}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-[#64748B] leading-relaxed">
                      {aiResponse.summary}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/products?search=${encodeURIComponent(aiResponse.query)}`)
                  }
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#635BFF] hover:underline shrink-0 cursor-pointer"
                >
                  <span>Open in Catalog</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="mt-6 grid gap-5 md:grid-cols-3">
                {aiResponse.recommendations.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Core Platform Capabilities */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST_PILLARS.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div key={pillar.title} className="card-surface rounded-2xl p-6">
                <div
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${pillar.accent} mb-4`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-display text-base font-bold text-[#1E293B]">
                  {pillar.title}
                </h3>
                <p className="mt-1.5 text-sm text-[#64748B] leading-relaxed">{pillar.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Top Verified Picks */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-7">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#16A34A] mb-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Verified Safe Catalog</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#1E293B]">
              Highest Trust Score Picks
            </h2>
          </div>
          <Link
            to="/products"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#635BFF] hover:gap-2 transition-all"
          >
            <span>Browse all {allProducts.length} products</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {safeFeatured.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* Live Risk Alerts Caught Today */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-[#DC2626]/20 gradient-soft-surface p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#DC2626]/10 px-3 py-1 text-xs font-bold text-[#DC2626] mb-3">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>AI Risk Radar · Active Alerts</span>
              </div>
              <h2 className="font-display text-2xl font-bold text-[#1E293B]">
                Suspicious Listings Flagged Before You Pay
              </h2>
              <p className="mt-2 text-sm text-[#64748B] leading-relaxed">
                TrustCart AI continuously flags unverified sellers and abnormally steep discounts so
                you never fall for counterfeit tech or fake review bursts.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  to="/risk-analysis"
                  className="inline-flex items-center gap-2 rounded-xl gradient-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95 transition"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Open AI Risk Analyzer</span>
                </Link>
                <Link
                  to="/compare"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#1E293B] hover:border-slate-300 transition"
                >
                  <GitCompareArrows className="w-4 h-4 text-[#635BFF]" />
                  <span>Compare Safe vs Risky</span>
                </Link>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 flex-1 max-w-2xl">
              {flaggedListings.map((item) => (
                <Link
                  key={item.id}
                  to={`/risk-analysis?productId=${item.id}`}
                  className="rounded-2xl border border-[#DC2626]/20 bg-white p-4 hover:border-[#DC2626]/45 hover:shadow-md transition"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <TrustBadge score={item.trustScore} size="sm" />
                    <span className="text-xs font-bold text-[#DC2626]">
                      {formatCurrency(item.price)}
                    </span>
                  </div>
                  <p className="font-display text-sm font-bold text-[#1E293B] line-clamp-2">
                    {item.name}
                  </p>
                  <p className="mt-1.5 text-xs text-[#64748B] line-clamp-2">
                    Seller: {item.seller.name} · {item.verifiedPurchasePct}% verified reviews
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#635BFF]">
                    Inspect risk report <ArrowRight className="w-3 h-3" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
