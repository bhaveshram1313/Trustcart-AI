import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Info, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AuthLayout({ title, subtitle, children, footer }) {
  const { authMode } = useAuth();

  return (
    <section className="hero-mesh min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6 animate-fade-up">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2.5 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary text-white shadow-md shadow-[#635BFF]/25 transition-transform group-hover:scale-105">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <span className="font-display text-xl font-extrabold tracking-tight text-[#1E293B]">
                  TrustCart
                </span>
                <span className="rounded-md bg-[#635BFF]/10 px-1.5 py-0.5 text-[11px] font-bold text-[#635BFF]">
                  AI
                </span>
              </div>
              <p className="text-[11px] font-medium text-[#64748B] -mt-0.5">
                Think Smart. Shop Safe. Pay Confidently.
              </p>
            </div>
          </Link>

          <h1 className="pt-3 font-display text-2xl sm:text-3xl font-extrabold text-[#1E293B]">
            {title}
          </h1>
          <p className="text-sm text-[#64748B]">{subtitle}</p>
        </div>

        {/* Auth Mode Indicator (Clearly labelled when in Development Mode) */}
        <div
          className={`rounded-2xl border px-4 py-3 text-xs flex items-start gap-2.5 ${
            authMode.isSupabase
              ? 'border-[#16A34A]/25 bg-[#16A34A]/6 text-[#1E293B]'
              : 'border-[#F59E0B]/35 bg-[#FFFBEB] text-[#1E293B]'
          }`}
        >
          {authMode.isSupabase ? (
            <Lock className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
          ) : (
            <Info className="w-4 h-4 text-[#B45309] shrink-0 mt-0.5" />
          )}
          <div>
            <p className="font-bold">
              {authMode.label}
            </p>
            <p className="text-[#64748B] leading-relaxed mt-0.5">
              {authMode.description}
            </p>
          </div>
        </div>

        {/* Main Card */}
        <div className="card-surface rounded-3xl p-6 sm:p-8">{children}</div>

        {/* Bottom Switch Link */}
        {footer && <div className="text-center text-sm text-[#64748B]">{footer}</div>}
      </div>
    </section>
  );
}
