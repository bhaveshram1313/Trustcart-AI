import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { validatePasswordStrength } from '../../services/authService';

export default function PasswordStrengthChecklist({ password, confirmPassword }) {
  const { checks } = validatePasswordStrength(password);

  const items = [
    { label: 'At least 8 characters', passed: checks.minLength },
    { label: 'One uppercase letter (A–Z)', passed: checks.hasUpper },
    { label: 'One lowercase letter (a–z)', passed: checks.hasLower },
    { label: 'One number (0–9)', passed: checks.hasNumber },
  ];

  if (typeof confirmPassword === 'string') {
    items.push({
      label: 'Passwords match',
      passed: password.length > 0 && password === confirmPassword,
    });
  }

  return (
    <div className="rounded-2xl bg-[#F8FAFC] border border-slate-200/80 p-3.5 space-y-1.5">
      <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] mb-1">
        Password Requirements
      </p>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {items.map((item) => (
          <div
            key={item.label}
            className={`flex items-center gap-1.5 text-xs ${
              item.passed ? 'text-[#16A34A] font-medium' : 'text-[#64748B]'
            }`}
          >
            {item.passed ? (
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <Circle className="w-3.5 h-3.5 shrink-0 text-slate-300" />
            )}
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
