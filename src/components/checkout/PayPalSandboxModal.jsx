import React, { useState } from 'react';
import { Lock, ShieldCheck, CheckCircle2, X, Loader2, CreditCard } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

const FUNDING_OPTIONS = [
  { id: 'visa', label: 'Visa •••• 4242', sub: 'Preferred Sandbox Card' },
  { id: 'balance', label: 'PayPal Balance', sub: '$4,850.00 Available (Sandbox)' },
  { id: 'mastercard', label: 'Mastercard •••• 8810', sub: 'Backup Sandbox Card' },
];

export default function PayPalSandboxModal({
  isOpen,
  paypalOrder,
  totalAmount,
  buyerEmail,
  onConfirm,
  onClose,
  isCapturing,
}) {
  const [selectedFunding, setSelectedFunding] = useState(FUNDING_OPTIONS[0].label);

  if (!isOpen || !paypalOrder) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200 animate-fade-up">
        {/* PayPal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-[#F8FAFC] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#003087] text-white font-display font-extrabold text-sm">
              P
            </div>
            <div>
              <p className="font-display text-sm font-bold text-[#003087]">
                PayPal <span className="font-normal text-[#64748B]">Sandbox</span>
              </p>
              <p className="text-[11px] text-[#64748B]">{paypalOrder.paypalOrderId}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isCapturing}
            className="rounded-lg p-1.5 text-[#64748B] hover:bg-slate-200/60 transition disabled:opacity-50"
            aria-label="Close PayPal modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Buyer & Amount */}
          <div className="flex items-center justify-between rounded-2xl bg-[#F8FAFC] border border-slate-200/80 p-4">
            <div>
              <p className="text-xs text-[#64748B]">Sandbox Buyer Account</p>
              <p className="text-sm font-semibold text-[#1E293B]">
                {buyerEmail || 'sb-buyer@trustcart.ai'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[#64748B]">Order Total</p>
              <p className="font-display text-xl font-extrabold text-[#1E293B]">
                {formatCurrency(totalAmount)}
              </p>
            </div>
          </div>

          {/* Funding Method */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#64748B] mb-2.5">
              Pay With
            </p>
            <div className="space-y-2">
              {FUNDING_OPTIONS.map((opt) => {
                const active = selectedFunding === opt.label;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedFunding(opt.label)}
                    className={`w-full flex items-center justify-between rounded-xl border px-3.5 py-3 text-left transition cursor-pointer ${
                      active
                        ? 'border-[#0070BA] bg-[#0070BA]/5'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <CreditCard
                        className={`w-4 h-4 ${active ? 'text-[#0070BA]' : 'text-[#64748B]'}`}
                      />
                      <div>
                        <p className="text-sm font-semibold text-[#1E293B]">{opt.label}</p>
                        <p className="text-xs text-[#64748B]">{opt.sub}</p>
                      </div>
                    </div>
                    {active && <CheckCircle2 className="w-4 h-4 text-[#0070BA]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Protection Notice */}
          <div className="flex items-start gap-2.5 rounded-xl bg-[#16A34A]/8 border border-[#16A34A]/20 p-3 text-xs text-[#1E293B]">
            <ShieldCheck className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
            <span>
              <strong>PayPal Buyer Protection:</strong> Eligible items are covered if they
              don&apos;t arrive or don&apos;t match seller descriptions.
            </span>
          </div>

          {/* Confirm Button */}
          <button
            type="button"
            disabled={isCapturing}
            onClick={() => onConfirm(selectedFunding)}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#FFC439] hover:bg-[#F5BA2C] px-5 py-3.5 text-sm font-bold text-[#003087] shadow-sm transition cursor-pointer disabled:opacity-60"
          >
            {isCapturing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Capturing PayPal Sandbox Order...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Complete Sandbox Purchase ({formatCurrency(totalAmount)})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
