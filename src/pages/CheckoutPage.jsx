import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  AlertTriangle,
  Trash2,
  Lock,
  ShoppingBag,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Truck,
} from 'lucide-react';
import { useTrustCart } from '../context/TrustCartContext';
import { useAuth } from '../context/AuthContext';
import TrustBadge from '../components/common/TrustBadge';
import PayPalSandboxModal from '../components/checkout/PayPalSandboxModal';
import { createPayPalOrder, capturePayPalOrder, paypalConfig } from '../services/paypalService';
import { getSaferAlternativeSync } from '../services/productService';
import { formatCurrency } from '../utils/formatters';

export default function CheckoutPage() {
  const { user } = useAuth();
  const {
    cartItems,
    cartSubtotal,
    updateCartQuantity,
    removeFromCart,
    addToCart,
    recordCompletedOrder,
    showToast,
  } = useTrustCart();

  const [shippingMethod, setShippingMethod] = useState('standard'); // 'standard' | 'express'
  const [form, setForm] = useState({
    fullName: user?.fullName || '',
    email: user?.email || '',
    address: '',
    city: '',
    zip: '',
  });

  useEffect(() => {
    if (user) {
      setForm((prev) => ({
        ...prev,
        fullName: prev.fullName || user.fullName || '',
        email: prev.email || user.email || '',
      }));
    }
  }, [user]);

  const [creatingOrder, setCreatingOrder] = useState(false);
  const [capturingOrder, setCapturingOrder] = useState(false);
  const [paypalModalOpen, setPaypalModalOpen] = useState(false);
  const [pendingPayPalOrder, setPendingPayPalOrder] = useState(null);
  const [confirmedOrder, setConfirmedOrder] = useState(null);

  const shippingCost = cartItems.length === 0 ? 0 : shippingMethod === 'express' ? 14.99 : 0;
  const estimatedTax = cartSubtotal * 0.08;
  const grandTotal = cartSubtotal + shippingCost + estimatedTax;

  const avgTrustScore = useMemo(() => {
    if (cartItems.length === 0) return 100;
    const totalQty = cartItems.reduce((s, i) => s + i.quantity, 0);
    const weighted = cartItems.reduce((s, i) => s + i.product.trustScore * i.quantity, 0);
    return Math.round(weighted / Math.max(1, totalQty));
  }, [cartItems]);

  const riskyCartItems = useMemo(
    () => cartItems.filter((item) => item.product.trustScore < 60),
    [cartItems]
  );

  const handleStartPayPal = async (e) => {
    e.preventDefault();
    if (cartItems.length === 0) return;

    if (!form.fullName.trim() || !form.email.trim() || !form.address.trim()) {
      showToast('Please fill in your name, email, and shipping address.', 'warning');
      return;
    }

    setCreatingOrder(true);
    try {
      const ppOrder = await createPayPalOrder({
        amount: grandTotal,
        items: cartItems.map((i) => ({
          id: i.product.id,
          name: i.product.name,
          quantity: i.quantity,
          price: i.product.price,
        })),
      });
      setPendingPayPalOrder(ppOrder);
      setPaypalModalOpen(true);
    } finally {
      setCreatingOrder(false);
    }
  };

  const handleConfirmPayPalCapture = async (fundingSource) => {
    if (!pendingPayPalOrder) return;
    setCapturingOrder(true);
    try {
      const captureResult = await capturePayPalOrder({
        paypalOrderId: pendingPayPalOrder.paypalOrderId,
        fundingSource,
      });

      const savedOrder = await recordCompletedOrder({
        paymentMethod: captureResult.fundingSource,
        paypalTransactionId: captureResult.paypalOrderId,
        buyerProtectionStatus: captureResult.buyerProtectionStatus,
        trustScoreAtPurchase: avgTrustScore,
        subtotal: Number(cartSubtotal.toFixed(2)),
        shipping: Number(shippingCost.toFixed(2)),
        tax: Number(estimatedTax.toFixed(2)),
        total: Number(grandTotal.toFixed(2)),
        shippingAddress: `${form.address}, ${form.city} ${form.zip}`,
        items: cartItems.map((entry) => ({
          productId: entry.product.id,
          name: entry.product.name,
          price: entry.product.price,
          quantity: entry.quantity,
          image: entry.product.image,
          sellerName: entry.product.seller.name,
          trustScore: entry.product.trustScore,
        })),
      });

      setPaypalModalOpen(false);
      setPendingPayPalOrder(null);
      setConfirmedOrder(savedOrder);
    } finally {
      setCapturingOrder(false);
    }
  };

  const handleSwapWithSafe = (riskyItem) => {
    const safer = getSaferAlternativeSync(riskyItem.product);
    if (!safer) return;
    removeFromCart(riskyItem.product.id);
    addToCart(safer.id, riskyItem.quantity);
  };

  // Order Confirmation State
  if (confirmedOrder) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8 animate-fade-up">
        <div className="card-surface rounded-3xl p-8 sm:p-10 text-center space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#16A34A]/10 text-[#16A34A]">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#16A34A]/10 px-3 py-1 text-xs font-bold text-[#16A34A]">
              PayPal Sandbox Payment Captured
            </span>
            <h1 className="mt-3 font-display text-3xl font-extrabold text-[#1E293B]">
              Order Confirmed!
            </h1>
            <p className="mt-2 text-sm text-[#64748B]">
              Your purchase is protected under TrustCart AI Verification & PayPal Buyer Protection.
            </p>
          </div>

          <div className="rounded-2xl bg-[#F8FAFC] border border-slate-200 p-5 text-left grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <p className="text-xs text-[#64748B]">TrustCart Order ID</p>
              <p className="font-display font-bold text-[#1E293B]">{confirmedOrder.id}</p>
            </div>
            <div>
              <p className="text-xs text-[#64748B]">PayPal Transaction ID</p>
              <p className="font-mono text-xs font-bold text-[#003087] mt-0.5">
                {confirmedOrder.paypalTransactionId}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#64748B]">Payment Method</p>
              <p className="font-semibold text-[#1E293B]">{confirmedOrder.paymentMethod}</p>
            </div>
            <div>
              <p className="text-xs text-[#64748B]">Total Paid</p>
              <p className="font-display font-extrabold text-[#1E293B]">
                {formatCurrency(confirmedOrder.total)}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
            <Link
              to="/orders"
              className="inline-flex items-center justify-center gap-2 rounded-xl gradient-primary px-6 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-95"
            >
              View in Order History
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/products"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-[#1E293B] hover:bg-slate-50"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
      <div>
        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#635BFF]">
          <Lock className="w-4 h-4" />
          Protected PayPal Sandbox Checkout
        </span>
        <h1 className="mt-1 font-display text-3xl font-extrabold text-[#1E293B]">
          Checkout & Payment
        </h1>
        <p className="mt-1 text-sm text-[#64748B]">
          Review Trust Scores on your cart items and complete checkout securely with PayPal Buyer
          Protection.
        </p>
      </div>

      {cartItems.length === 0 ? (
        <div className="card-surface rounded-3xl p-14 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#635BFF]/10 text-[#635BFF]">
            <ShoppingBag className="w-7 h-7" />
          </div>
          <h2 className="font-display text-xl font-bold text-[#1E293B]">Your cart is empty</h2>
          <p className="text-sm text-[#64748B] max-w-md mx-auto">
            Browse TrustCart AI&apos;s verified catalog or ask our AI Assistant to find safe
            products within your budget.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Link
              to="/products"
              className="inline-flex items-center gap-2 rounded-xl gradient-primary px-5 py-2.5 text-sm font-semibold text-white"
            >
              Browse Verified Products
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-12 items-start">
          {/* Left: Cart Items + Shipping Form */}
          <div className="lg:col-span-7 space-y-6">
            {/* Risk Guard Alert if any risky item in cart */}
            {riskyCartItems.length > 0 && (
              <div className="rounded-2xl border border-[#DC2626]/30 bg-[#DC2626]/5 p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-[#DC2626] shrink-0 mt-0.5" />
                  <div>
                    <h2 className="font-display text-sm font-bold text-[#DC2626]">
                      TrustCart AI Safety Guard Alert
                    </h2>
                    <p className="text-xs text-[#1E293B] mt-0.5 leading-relaxed">
                      Your cart contains {riskyCartItems.length} high-risk listing(s) flagged for
                      price anomalies or unverified sellers. We recommend swapping to a verified
                      alternative before paying.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pl-8">
                  {riskyCartItems.map((r) => (
                    <button
                      key={r.product.id}
                      type="button"
                      onClick={() => handleSwapWithSafe(r)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-[#16A34A]/35 px-3 py-1.5 text-xs font-bold text-[#16A34A] hover:bg-[#16A34A]/5 cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Replace &ldquo;{r.product.brand}&rdquo; with Verified Pick
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Cart Items Card */}
            <div className="card-surface rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="font-display text-base font-bold text-[#1E293B]">
                  Cart Items ({cartItems.reduce((s, i) => s + i.quantity, 0)})
                </h2>
                <Link
                  to="/products"
                  className="text-xs font-semibold text-[#635BFF] hover:underline"
                >
                  + Add more items
                </Link>
              </div>

              <div className="divide-y divide-slate-100">
                {cartItems.map(({ product, quantity, lineTotal }) => (
                  <div
                    key={product.id}
                    className="py-4 first:pt-1 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <Link
                        to={`/products/${product.id}`}
                        className="h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-[#F8FAFC] border border-slate-100"
                      >
                        <img
                          src={product.image}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                      </Link>
                      <div className="space-y-1">
                        <Link
                          to={`/products/${product.id}`}
                          className="font-display text-sm font-bold text-[#1E293B] hover:text-[#635BFF] line-clamp-1"
                        >
                          {product.name}
                        </Link>
                        <p className="text-xs text-[#64748B]">Seller: {product.seller.name}</p>
                        <TrustBadge score={product.trustScore} size="sm" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white">
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(product.id, quantity - 1)}
                          className="px-2.5 py-1 text-sm font-bold text-[#1E293B] hover:bg-slate-50 cursor-pointer"
                        >
                          -
                        </button>
                        <span className="px-2.5 text-xs font-bold text-[#1E293B]">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(product.id, quantity + 1)}
                          className="px-2.5 py-1 text-sm font-bold text-[#1E293B] hover:bg-slate-50 cursor-pointer"
                        >
                          +
                        </button>
                      </div>

                      <div className="text-right min-w-[78px]">
                        <p className="font-display text-sm font-bold text-[#1E293B]">
                          {formatCurrency(lineTotal)}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromCart(product.id)}
                        className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#DC2626]/10 hover:text-[#DC2626] transition cursor-pointer"
                        aria-label={`Remove ${product.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Shipping Address Form */}
            <form id="checkout-form" onSubmit={handleStartPayPal} className="card-surface rounded-3xl p-6 space-y-5">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Truck className="w-4 h-4 text-[#635BFF]" />
                <h2 className="font-display text-base font-bold text-[#1E293B]">
                  Shipping & Delivery Details
                </h2>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-[#64748B] mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 py-2.5 text-sm text-[#1E293B] focus:border-[#635BFF] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#64748B] mb-1">
                    Email for Receipt
                  </label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 py-2.5 text-sm text-[#1E293B] focus:border-[#635BFF] focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#64748B] mb-1">
                    Street Address
                  </label>
                  <input
                    type="text"
                    required
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="123 Market Street, Apt 4B"
                    className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 py-2.5 text-sm text-[#1E293B] placeholder:text-[#64748B]/60 focus:border-[#635BFF] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#64748B] mb-1">
                    City & State
                  </label>
                  <input
                    type="text"
                    required
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="San Francisco, CA"
                    className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 py-2.5 text-sm text-[#1E293B] placeholder:text-[#64748B]/60 focus:border-[#635BFF] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#64748B] mb-1">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    required
                    value={form.zip}
                    onChange={(e) => setForm({ ...form, zip: e.target.value })}
                    placeholder="94107"
                    className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 py-2.5 text-sm text-[#1E293B] placeholder:text-[#64748B]/60 focus:border-[#635BFF] focus:outline-none"
                  />
                </div>
              </div>

              {/* Delivery Tier */}
              <div className="grid gap-3 sm:grid-cols-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShippingMethod('standard')}
                  className={`rounded-2xl border p-3.5 text-left transition cursor-pointer ${
                    shippingMethod === 'standard'
                      ? 'border-[#635BFF] bg-[#635BFF]/6'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between text-sm font-bold text-[#1E293B]">
                    <span>Standard Insured</span>
                    <span className="text-[#16A34A]">Free</span>
                  </div>
                  <p className="text-xs text-[#64748B] mt-0.5">3–5 business days</p>
                </button>

                <button
                  type="button"
                  onClick={() => setShippingMethod('express')}
                  className={`rounded-2xl border p-3.5 text-left transition cursor-pointer ${
                    shippingMethod === 'express'
                      ? 'border-[#635BFF] bg-[#635BFF]/6'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between text-sm font-bold text-[#1E293B]">
                    <span>Express Signature</span>
                    <span>$14.99</span>
                  </div>
                  <p className="text-xs text-[#64748B] mt-0.5">1–2 business days</p>
                </button>
              </div>
            </form>
          </div>

          {/* Right: Order Summary & PayPal Payment Module */}
          <aside className="lg:col-span-5 card-surface rounded-3xl p-6 sm:p-7 space-y-6 lg:sticky lg:top-24">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="font-display text-lg font-bold text-[#1E293B]">Order Summary</h2>
              <TrustBadge score={avgTrustScore} size="sm" />
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-[#64748B]">
                <span>Subtotal</span>
                <span className="font-semibold text-[#1E293B]">
                  {formatCurrency(cartSubtotal)}
                </span>
              </div>
              <div className="flex justify-between text-[#64748B]">
                <span>Shipping</span>
                <span className="font-semibold text-[#1E293B]">
                  {shippingCost === 0 ? 'Free' : formatCurrency(shippingCost)}
                </span>
              </div>
              <div className="flex justify-between text-[#64748B]">
                <span>TrustCart Escrow Shield</span>
                <span className="font-semibold text-[#16A34A]">Included ($0.00)</span>
              </div>
              <div className="flex justify-between text-[#64748B]">
                <span>Estimated Tax (8%)</span>
                <span className="font-semibold text-[#1E293B]">
                  {formatCurrency(estimatedTax)}
                </span>
              </div>
              <div className="border-t border-slate-200 pt-3 flex justify-between items-baseline">
                <span className="font-display text-base font-bold text-[#1E293B]">Total</span>
                <span className="font-display text-2xl font-extrabold text-[#1E293B]">
                  {formatCurrency(grandTotal)}
                </span>
              </div>
            </div>

            {/* PayPal Sandbox Integration Box */}
            <div className="rounded-2xl border border-[#003087]/15 bg-[#F8FAFC] p-4 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[#003087] text-xs font-extrabold text-white">
                    P
                  </span>
                  <span className="font-display text-sm font-bold text-[#003087]">
                    PayPal Checkout
                  </span>
                </div>
                <span className="rounded-full bg-[#3B82F6]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#3B82F6]">
                  {paypalConfig.environment} Mode
                </span>
              </div>

              <button
                type="submit"
                form="checkout-form"
                disabled={creatingOrder}
                className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#FFC439] hover:bg-[#F5BA2C] px-5 py-3.5 text-sm font-extrabold text-[#003087] shadow-sm transition cursor-pointer disabled:opacity-60"
              >
                {creatingOrder ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Connecting to PayPal Sandbox...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Pay with PayPal · {formatCurrency(grandTotal)}</span>
                  </>
                )}
              </button>

              <button
                type="submit"
                form="checkout-form"
                disabled={creatingOrder}
                className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#1E293B] hover:bg-[#0F172A] px-5 py-3 text-xs font-bold text-white transition cursor-pointer disabled:opacity-60"
              >
                <span>Pay Later / Debit or Credit Card via PayPal</span>
              </button>

              <div className="flex items-start gap-2 text-[11px] text-[#64748B] leading-snug pt-1">
                <ShieldCheck className="w-4 h-4 text-[#16A34A] shrink-0" />
                <span>
                  100% protected by PayPal Buyer Protection. Orders are stored locally and ready for
                  FastAPI + Supabase sync.
                </span>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* PayPal Sandbox Interactive Modal */}
      <PayPalSandboxModal
        isOpen={paypalModalOpen}
        paypalOrder={pendingPayPalOrder}
        totalAmount={grandTotal}
        buyerEmail={form.email}
        onConfirm={handleConfirmPayPalCapture}
        onClose={() => !capturingOrder && setPaypalModalOpen(false)}
        isCapturing={capturingOrder}
      />
    </div>
  );
}
