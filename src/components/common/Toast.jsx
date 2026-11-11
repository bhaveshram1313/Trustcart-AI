import React from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { useTrustCart } from '../../context/TrustCartContext';

export default function Toast() {
  const { toast, dismissToast } = useTrustCart();

  if (!toast) return null;

  const styles =
    toast.type === 'success'
      ? 'border-[#16A34A]/30 bg-white text-[#1E293B]'
      : toast.type === 'warning'
      ? 'border-[#F59E0B]/40 bg-white text-[#1E293B]'
      : 'border-[#635BFF]/30 bg-white text-[#1E293B]';

  const Icon =
    toast.type === 'success'
      ? CheckCircle2
      : toast.type === 'warning'
      ? AlertTriangle
      : Info;

  const iconColor =
    toast.type === 'success'
      ? 'text-[#16A34A]'
      : toast.type === 'warning'
      ? 'text-[#F59E0B]'
      : 'text-[#635BFF]';

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm animate-fade-up">
      <div
        className={`flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-xl shadow-slate-900/10 ${styles}`}
        role="status"
      >
        <Icon className={`w-5 h-5 shrink-0 ${iconColor}`} />
        <p className="text-sm font-medium text-[#1E293B] leading-snug">{toast.message}</p>
        <button
          type="button"
          onClick={dismissToast}
          className="ml-1 rounded-lg p-1 text-[#64748B] hover:bg-slate-100 hover:text-[#1E293B] transition"
          aria-label="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
