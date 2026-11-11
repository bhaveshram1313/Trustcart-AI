import React from 'react';
import { AlertTriangle, Loader2, Trash2, X } from 'lucide-react';

export default function DeleteConfirmModal({
  isOpen,
  productName,
  onConfirm,
  onCancel,
  deleting = false,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-3xl bg-white border border-slate-200 p-6 shadow-2xl space-y-5 animate-fade-up"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#DC2626]/10 text-[#DC2626]">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-[#1E293B]">Delete Product?</h2>
              <p className="text-xs text-[#64748B]">This action cannot be undone.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="rounded-lg p-1.5 text-[#64748B] hover:bg-slate-100 transition disabled:opacity-50"
            aria-label="Close confirmation dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-[#1E293B] leading-relaxed">
          Are you sure you want to permanently remove{' '}
          <strong className="font-semibold">&ldquo;{productName}&rdquo;</strong> from your seller
          inventory?
        </p>

        <div className="flex items-center justify-end gap-2.5 pt-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-[#1E293B] hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] px-4 py-2.5 text-xs font-semibold text-white transition cursor-pointer disabled:opacity-60"
          >
            {deleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Product</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
