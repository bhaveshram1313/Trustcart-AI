import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  ShieldCheck,
  Clock,
  ShoppingBag,
  LogOut,
  ArrowRight,
  KeyRound,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTrustCart } from '../context/TrustCartContext';
import { formatDate } from '../utils/formatters';

export default function AccountPage() {
  const { user, authMode, logout } = useAuth();
  const { cartCount, orders, showToast } = useTrustCart();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    showToast('Signed out of TrustCart AI', 'info');
    navigate('/', { replace: true });
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
      <div>
        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#635BFF]">
          <User className="w-4 h-4" />
          Personal Shopping Profile
        </span>
        <h1 className="mt-1 font-display text-3xl font-extrabold text-[#1E293B]">
          My Account
        </h1>
        <p className="mt-1 text-sm text-[#64748B]">
          Your cart, saved comparisons, and order history are isolated exclusively to your account.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        {/* Account Details Card */}
        <div className="md:col-span-7 card-surface rounded-3xl p-6 sm:p-7 space-y-6">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary text-lg font-extrabold text-white shadow-md shadow-[#635BFF]/20">
                {user.fullName
                  .split(/\s+/)
                  .map((p) => p[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div>
                <h2 className="font-display text-xl font-bold text-[#1E293B]">{user.fullName}</h2>
                <p className="text-sm text-[#64748B] flex items-center gap-1.5 mt-0.5">
                  <Mail className="w-3.5 h-3.5" />
                  {user.email}
                </p>
              </div>
            </div>

            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border ${
                authMode.isSupabase
                  ? 'bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/25'
                  : 'bg-[#FFFBEB] text-[#B45309] border-[#F59E0B]/35'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              {authMode.label}
            </span>
          </div>

          <dl className="grid gap-4 sm:grid-cols-2 text-sm">
            <div className="rounded-2xl bg-[#F8FAFC] border border-slate-100 p-4">
              <dt className="text-xs font-semibold text-[#64748B] flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-[#635BFF]" />
                Account Identifier
              </dt>
              <dd className="mt-1 font-mono text-xs font-bold text-[#1E293B] break-all">
                {user.id}
              </dd>
            </div>
            <div className="rounded-2xl bg-[#F8FAFC] border border-slate-100 p-4">
              <dt className="text-xs font-semibold text-[#64748B]">Member Since</dt>
              <dd className="mt-1 font-semibold text-[#1E293B]">
                {user.createdAt ? formatDate(user.createdAt) : 'Active Session'}
              </dd>
            </div>
          </dl>

          <div className="pt-2 flex flex-wrap gap-3">
            <Link
              to="/orders"
              className="inline-flex items-center gap-2 rounded-xl gradient-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95 transition"
            >
              <Clock className="w-4 h-4" />
              View My Orders
              <ArrowRight className="w-4 h-4" />
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-xl border border-[#DC2626]/30 bg-white px-5 py-2.5 text-sm font-semibold text-[#DC2626] hover:bg-[#DC2626]/6 transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Log Out
            </button>
          </div>
        </div>

        {/* Personal Activity Snapshot */}
        <div className="md:col-span-5 space-y-5">
          <div className="card-surface rounded-3xl p-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                Personal Cart
              </p>
              <p className="mt-1 font-display text-3xl font-extrabold text-[#1E293B]">
                {cartCount}
              </p>
              <p className="mt-1 text-xs text-[#64748B]">Item(s) waiting in checkout</p>
            </div>
            <Link
              to="/checkout"
              className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#635BFF]/10 text-[#635BFF] hover:bg-[#635BFF]/15 transition"
              title="Go to Checkout"
            >
              <ShoppingBag className="w-6 h-6" />
            </Link>
          </div>

          <div className="card-surface rounded-3xl p-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                My Orders
              </p>
              <p className="mt-1 font-display text-3xl font-extrabold text-[#1E293B]">
                {orders.length}
              </p>
              <p className="mt-1 text-xs text-[#64748B]">Protected PayPal Sandbox receipts</p>
            </div>
            <Link
              to="/orders"
              className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#3B82F6]/10 text-[#3B82F6] hover:bg-[#3B82F6]/15 transition"
              title="Go to My Orders"
            >
              <Clock className="w-6 h-6" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
