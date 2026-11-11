import React, { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';

export default function PasswordInput({
  id,
  label,
  value,
  onChange,
  placeholder = '••••••••',
  autoComplete = 'current-password',
  required = true,
  error = '',
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-[#1E293B] mb-1.5">
        {label}
      </label>
      <div className="relative">
        <Lock className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          className={`w-full rounded-xl border bg-[#F8FAFC] pl-10 pr-11 py-2.5 text-sm text-[#1E293B] placeholder:text-[#64748B]/70 focus:bg-white focus:outline-none focus:ring-2 transition ${
            error
              ? 'border-[#DC2626] focus:border-[#DC2626] focus:ring-[#DC2626]/15'
              : 'border-slate-200 focus:border-[#635BFF] focus:ring-[#635BFF]/15'
          }`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[#64748B] hover:bg-slate-200/60 hover:text-[#1E293B] transition cursor-pointer"
          aria-label={visible ? 'Hide password' : 'Show password'}
          title={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {error && <p className="mt-1 text-xs font-medium text-[#DC2626]">{error}</p>}
    </div>
  );
}
