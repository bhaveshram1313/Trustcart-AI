import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Store,
  User,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  LogOut,
  LayoutDashboard,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTrustCart } from '../../context/TrustCartContext';
import { formatDate } from '../../utils/formatters';

export default function SellerProfilePage() {
  const { user, sellerProfile, authMode, updateSellerProfile, logout } = useAuth();
  const { showToast, refreshCatalog } = useTrustCart();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [shopName, setShopName] = useState(
    sellerProfile?.shopName || user?.sellerProfile?.shopName || ''
  );
  const [phone, setPhone] = useState(
    sellerProfile?.phone || user?.sellerProfile?.phone || ''
  );
  const [businessAddress, setBusinessAddress] = useState(
    sellerProfile?.businessAddress || user?.sellerProfile?.businessAddress || ''
  );

  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setShopName(sellerProfile?.shopName || user.sellerProfile?.shopName || '');
      setPhone(sellerProfile?.phone || user.sellerProfile?.phone || '');
      setBusinessAddress(
        sellerProfile?.businessAddress || user.sellerProfile?.businessAddress || ''
      );
    }
  }, [user, sellerProfile]);

  if (!user) return null;

  const initials = user.fullName
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSavedNotice('');

    if (!fullName.trim()) {
      setError('Full name is required.');
      return;
    }

    setSaving(true);
    try {
      await updateSellerProfile({
        fullName,
        shopName,
        phone,
        businessAddress,
      });
      refreshCatalog();
      setSavedNotice('Seller profile updated successfully.');
      showToast('Seller profile saved', 'success');
    } catch (err) {
      setError(err.message || 'Unable to save seller profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    showToast('Signed out of TrustCart AI', 'info');
    navigate('/', { replace: true });
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
      <div>
        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#635BFF]">
          <Store className="w-4 h-4" />
          Merchant Identity & Storefront Details
        </span>
        <h1 className="mt-1 font-display text-3xl font-extrabold text-[#1E293B]">
          Seller Profile
        </h1>
        <p className="mt-1 text-sm text-[#64748B]">
          Manage your business details shown alongside products you publish on TrustCart AI.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        {/* Main Editable Form */}
        <form
          onSubmit={handleSubmit}
          className="md:col-span-8 card-surface rounded-3xl p-6 sm:p-7 space-y-6"
          noValidate
        >
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary text-lg font-extrabold text-white shadow-md shadow-[#635BFF]/20">
                {initials}
              </div>
              <div>
                <h2 className="font-display text-xl font-bold text-[#1E293B]">
                  {shopName.trim() || user.fullName}
                </h2>
                <p className="text-sm text-[#64748B] flex items-center gap-1.5 mt-0.5">
                  <Mail className="w-3.5 h-3.5" />
                  {user.email}
                </p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#635BFF]/10 border border-[#635BFF]/25 px-3 py-1 text-xs font-bold text-[#635BFF]">
              <Store className="w-3.5 h-3.5" />
              Seller Account
            </span>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-[#DC2626]/25 bg-[#DC2626]/8 px-3.5 py-3 text-sm text-[#DC2626]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {savedNotice && (
            <div className="flex items-start gap-2.5 rounded-xl border border-[#16A34A]/25 bg-[#16A34A]/8 px-3.5 py-3 text-sm text-[#15803D]">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{savedNotice}</span>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="seller-full-name"
                className="block text-xs font-bold uppercase tracking-wider text-[#1E293B] mb-1.5"
              >
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="seller-full-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="Alex Morgan"
                  className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] pl-10 pr-4 py-2.5 text-sm text-[#1E293B] focus:border-[#635BFF] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#635BFF]/15 transition"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="seller-email"
                className="block text-xs font-bold uppercase tracking-wider text-[#1E293B] mb-1.5"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="seller-email"
                  type="email"
                  value={user.email}
                  readOnly
                  disabled
                  className="w-full rounded-xl border border-slate-200 bg-slate-100/80 pl-10 pr-4 py-2.5 text-sm text-[#64748B] cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="seller-shop-name"
                className="block text-xs font-bold uppercase tracking-wider text-[#1E293B] mb-1.5"
              >
                Business / Shop Name
              </label>
              <div className="relative">
                <Store className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="seller-shop-name"
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="e.g. Morgan Precision Tech"
                  className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] pl-10 pr-4 py-2.5 text-sm text-[#1E293B] focus:border-[#635BFF] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#635BFF]/15 transition"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="seller-phone"
                className="block text-xs font-bold uppercase tracking-wider text-[#1E293B] mb-1.5"
              >
                Phone Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="seller-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 234-5678"
                  className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] pl-10 pr-4 py-2.5 text-sm text-[#1E293B] focus:border-[#635BFF] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#635BFF]/15 transition"
                />
              </div>
            </div>
          </div>

          <div>
            <label
              htmlFor="seller-address"
              className="block text-xs font-bold uppercase tracking-wider text-[#1E293B] mb-1.5"
            >
              Business Address
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-[#64748B] absolute left-3.5 top-3" />
              <textarea
                id="seller-address"
                rows={3}
                value={businessAddress}
                onChange={(e) => setBusinessAddress(e.target.value)}
                placeholder="Street address, suite, city, state/postal code, country"
                className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] pl-10 pr-4 py-2.5 text-sm text-[#1E293B] focus:border-[#635BFF] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#635BFF]/15 transition"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <p className="text-xs text-[#64748B]">
              Product listings created under your account automatically link to your verified seller ID.
            </p>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl gradient-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#635BFF]/20 hover:opacity-95 transition disabled:opacity-60 cursor-pointer"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{saving ? 'Saving...' : 'Save Seller Profile'}</span>
            </button>
          </div>
        </form>

        {/* Right Identity & Security Summary Card */}
        <div className="md:col-span-4 space-y-5">
          <div className="card-surface rounded-3xl p-6 space-y-4">
            <h2 className="font-display text-base font-bold text-[#1E293B]">
              Account & Ownership
            </h2>

            <div
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border ${
                authMode.isSupabase
                  ? 'bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/25'
                  : 'bg-[#FFFBEB] text-[#B45309] border-[#F59E0B]/35'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              {authMode.label}
            </div>

            <dl className="space-y-3 text-sm">
              <div className="rounded-2xl bg-[#F8FAFC] border border-slate-100 p-3.5">
                <dt className="text-xs font-semibold text-[#64748B] flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-[#635BFF]" />
                  Seller User ID
                </dt>
                <dd className="mt-1 font-mono text-xs font-bold text-[#1E293B] break-all">
                  {user.id}
                </dd>
              </div>

              <div className="rounded-2xl bg-[#F8FAFC] border border-slate-100 p-3.5">
                <dt className="text-xs font-semibold text-[#64748B]">Member Since</dt>
                <dd className="mt-1 font-semibold text-[#1E293B]">
                  {user.createdAt ? formatDate(user.createdAt) : 'Active Session'}
                </dd>
              </div>
            </dl>

            <div className="pt-2 space-y-2.5">
              <Link
                to="/seller/dashboard"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#1E293B] hover:border-[#635BFF]/40 hover:text-[#635BFF] transition"
              >
                <LayoutDashboard className="w-4 h-4" />
                Seller Dashboard
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-[#DC2626]/25 bg-white px-4 py-2.5 text-sm font-semibold text-[#DC2626] hover:bg-[#DC2626]/5 transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Log Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
