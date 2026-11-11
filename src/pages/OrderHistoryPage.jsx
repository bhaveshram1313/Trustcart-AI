import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Clock,
  CheckCircle2,
  Truck,
  ShieldCheck,
  Search,
  RotateCcw,
  Download,
  Package,
  ArrowRight,
} from 'lucide-react';
import { useTrustCart } from '../context/TrustCartContext';
import { useAuth } from '../context/AuthContext';
import TrustBadge from '../components/common/TrustBadge';
import { formatCurrency, formatDate } from '../utils/formatters';

export default function OrderHistoryPage() {
  const { user } = useAuth();
  const { orders, ordersLoading, addToCart, showToast } = useTrustCart();
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (statusFilter !== 'All' && order.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hitId = order.id.toLowerCase().includes(q);
        const hitPay = order.paypalTransactionId.toLowerCase().includes(q);
        const hitItem = order.items.some((i) => i.name.toLowerCase().includes(q));
        return hitId || hitPay || hitItem;
      }
      return true;
    });
  }, [orders, statusFilter, search]);

  const totalProtectedSpend = useMemo(
    () => orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0),
    [orders]
  );

  const avgPurchaseTrust = useMemo(() => {
    if (!orders.length) return 0;
    return Math.round(
      orders.reduce((s, o) => s + (o.trustScoreAtPurchase || 90), 0) / orders.length
    );
  }, [orders]);

  const handleBuyAgain = (order) => {
    order.items.forEach((item) => addToCart(item.productId, item.quantity));
  };

  const handleDownloadReceipt = (order) => {
    const lines = [
      'TRUSTCART AI — VERIFIED ORDER RECEIPT',
      'Tagline: Think Smart. Shop Safe. Pay Confidently.',
      '==================================================',
      `Order ID:            ${order.id}`,
      `Date:                ${formatDate(order.date)}`,
      `Status:              ${order.status}`,
      `PayPal Transaction:  ${order.paypalTransactionId}`,
      `Payment Method:      ${order.paymentMethod}`,
      `Buyer Protection:    ${order.buyerProtectionStatus}`,
      `Trust Score:         ${order.trustScoreAtPurchase}/100`,
      `Shipping Address:    ${order.shippingAddress}`,
      '--------------------------------------------------',
      'ITEMS:',
      ...order.items.map(
        (i) =>
          `- ${i.name} (x${i.quantity}) — ${formatCurrency(i.price * i.quantity)} [Seller: ${
            i.sellerName
          }]`
      ),
      '--------------------------------------------------',
      `Subtotal:            ${formatCurrency(order.subtotal)}`,
      `Shipping:            ${formatCurrency(order.shipping)}`,
      `Tax:                 ${formatCurrency(order.tax)}`,
      `Total Paid:          ${formatCurrency(order.total)}`,
      '==================================================',
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `TrustCart-Receipt-${order.id}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
    showToast(`Downloaded receipt for ${order.id}`, 'success');
  };

  const statusBadge = (status) => {
    if (status === 'Delivered') {
      return 'bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/25';
    }
    if (status === 'In Transit') {
      return 'bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/25';
    }
    return 'bg-[#635BFF]/10 text-[#635BFF] border-[#635BFF]/25';
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#635BFF]">
            <Clock className="w-4 h-4" />
            Protected Purchase Ledger
          </span>
          <h1 className="mt-1 font-display text-3xl font-extrabold text-[#1E293B]">
            My Orders
          </h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Showing verified PayPal transactions and escrow history exclusively for{' '}
            <strong className="text-[#1E293B]">{user?.fullName}</strong> ({user?.email}).
          </p>
        </div>

        <Link
          to="/products"
          className="inline-flex items-center gap-2 rounded-xl gradient-primary px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:opacity-95 self-start"
        >
          Shop Verified Products
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Summary KPIs */}
      <div className="grid gap-5 sm:grid-cols-3">
        <div className="card-surface rounded-2xl p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
            Total Orders
          </p>
          <p className="mt-1 font-display text-2xl font-extrabold text-[#1E293B]">
            {orders.length}
          </p>
          <p className="mt-1 text-xs text-[#64748B]">Synced with local & PayPal ledger</p>
        </div>
        <div className="card-surface rounded-2xl p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
            Protected Spend
          </p>
          <p className="mt-1 font-display text-2xl font-extrabold text-[#1E293B]">
            {formatCurrency(totalProtectedSpend)}
          </p>
          <p className="mt-1 text-xs text-[#16A34A] font-medium">
            100% covered by PayPal Buyer Protection
          </p>
        </div>
        <div className="card-surface rounded-2xl p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
            Avg Order Trust Score
          </p>
          <div className="mt-1.5 flex items-center gap-2.5">
            <span className="font-display text-2xl font-extrabold text-[#1E293B]">
              {avgPurchaseTrust}/100
            </span>
            {avgPurchaseTrust > 0 && <TrustBadge score={avgPurchaseTrust} size="sm" />}
          </div>
          <p className="mt-1 text-xs text-[#64748B]">Calculated at checkout</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {['All', 'Processing', 'In Transit', 'Delivered'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition cursor-pointer ${
                statusFilter === st
                  ? 'gradient-primary text-white'
                  : 'border border-slate-200 bg-white text-[#64748B] hover:text-[#1E293B]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="relative sm:w-72">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order ID, PayPal ID, product..."
            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm text-[#1E293B] focus:border-[#635BFF] focus:outline-none"
          />
        </div>
      </div>

      {/* Orders List */}
      {ordersLoading ? (
        <div className="space-y-4">
          {[1, 2].map((n) => (
            <div key={n} className="h-52 rounded-3xl bg-white border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="card-surface rounded-3xl p-12 text-center space-y-4">
          <Package className="w-8 h-8 text-slate-300 mx-auto" />
          <h2 className="font-display text-lg font-bold text-[#1E293B]">
            {orders.length === 0 ? 'No orders yet' : 'No matching orders found'}
          </h2>
          <p className="text-sm text-[#64748B] max-w-md mx-auto">
            {orders.length === 0
              ? 'Purchases you complete through PayPal Sandbox checkout will appear here under your personal account.'
              : 'Try clearing your search or status filter to view all orders.'}
          </p>
          {orders.length === 0 && (
            <Link
              to="/products"
              className="inline-flex items-center gap-2 rounded-xl gradient-primary px-5 py-2.5 text-sm font-semibold text-white"
            >
              Browse Verified Products
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {filteredOrders.map((order) => (
            <article key={order.id} className="card-surface rounded-3xl overflow-hidden">
              {/* Order Header */}
              <div className="border-b border-slate-100 bg-[#F8FAFC] px-6 py-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
                  <div>
                    <span className="text-[#64748B] block">Order ID</span>
                    <span className="font-display font-bold text-sm text-[#1E293B]">
                      {order.id}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#64748B] block">Placed On</span>
                    <span className="font-semibold text-[#1E293B]">{formatDate(order.date)}</span>
                  </div>
                  <div>
                    <span className="text-[#64748B] block">PayPal Transaction</span>
                    <span className="font-mono font-semibold text-[#003087]">
                      {order.paypalTransactionId}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#64748B] block">Total</span>
                    <span className="font-display font-bold text-sm text-[#1E293B]">
                      {formatCurrency(order.total)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <TrustBadge score={order.trustScoreAtPurchase} size="sm" />
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold ${statusBadge(
                      order.status
                    )}`}
                  >
                    {order.status === 'Delivered' ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <Truck className="w-3.5 h-3.5" />
                    )}
                    {order.status}
                  </span>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 grid gap-6 lg:grid-cols-12">
                {/* Items */}
                <div className="lg:col-span-7 space-y-4">
                  {order.items.map((item, idx) => (
                    <div key={`${order.id}-${idx}`} className="flex items-center gap-4">
                      <Link
                        to={`/products/${item.productId}`}
                        className="h-16 w-20 shrink-0 overflow-hidden rounded-xl bg-[#F8FAFC] border border-slate-100"
                      >
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link
                          to={`/products/${item.productId}`}
                          className="font-display text-sm font-bold text-[#1E293B] hover:text-[#635BFF] line-clamp-1"
                        >
                          {item.name}
                        </Link>
                        <p className="text-xs text-[#64748B] mt-0.5">
                          Qty {item.quantity} · Seller: {item.sellerName}
                        </p>
                      </div>
                      <p className="font-display text-sm font-bold text-[#1E293B]">
                        {formatCurrency(item.price * item.quantity)}
                      </p>
                    </div>
                  ))}

                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                    <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#16A34A]">
                      <ShieldCheck className="w-4 h-4" />
                      <span>{order.buyerProtectionStatus}</span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleDownloadReceipt(order)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#1E293B] hover:bg-slate-50 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Receipt
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBuyAgain(order)}
                        className="inline-flex items-center gap-1.5 rounded-xl gradient-primary px-3.5 py-1.5 text-xs font-semibold text-white hover:opacity-95 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Buy Again
                      </button>
                    </div>
                  </div>
                </div>

                {/* Delivery & Protection Timeline */}
                <div className="lg:col-span-5 rounded-2xl bg-[#F8FAFC] border border-slate-200/70 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#64748B] mb-3">
                    Verification & Shipping Timeline
                  </p>
                  <ol className="space-y-2.5">
                    {order.timeline.map((step, i) => (
                      <li key={i} className="flex items-start justify-between gap-3 text-xs">
                        <div className="flex items-start gap-2">
                          <span
                            className={`mt-1 h-2 w-2 rounded-full shrink-0 ${
                              step.completed ? 'bg-[#16A34A]' : 'bg-slate-300'
                            }`}
                          />
                          <span
                            className={
                              step.completed ? 'font-semibold text-[#1E293B]' : 'text-[#64748B]'
                            }
                          >
                            {step.step}
                          </span>
                        </div>
                        <span className="text-[#64748B] shrink-0">{step.date}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
