import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, UserPlus, LogIn, ArrowRight } from 'lucide-react';

export default function WelcomePage() {
  return (
    <section className="hero-mesh min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md card-surface rounded-3xl p-8 sm:p-10 text-center space-y-7 animate-fade-up">
        {/* Brand Identity */}
        <div className="space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary text-white shadow-lg shadow-[#635BFF]/25">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <span className="font-display text-2xl font-extrabold tracking-tight text-[#1E293B]">
              TrustCart
            </span>
            <span className="rounded-md bg-[#635BFF]/10 px-2 py-0.5 text-xs font-bold text-[#635BFF]">
              AI
            </span>
          </div>
          <p className="text-sm font-semibold text-[#635BFF]">
            Think Smart. Shop Safe. Pay Confidently.
          </p>
          <p className="text-sm text-[#64748B] leading-relaxed">
            Your AI-powered shopping assistant for verified sellers, real-time risk protection, and
            secure checkout.
          </p>
        </div>

        {/* Two Entry Options */}
        <div className="space-y-3 pt-1">
          <Link
            to="/signup"
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl gradient-primary px-5 py-3.5 text-sm font-semibold text-white shadow-md shadow-[#635BFF]/25 hover:opacity-95 transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>Sign Up</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            to="/login"
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-semibold text-[#1E293B] hover:border-[#635BFF]/40 hover:text-[#635BFF] hover:bg-slate-50 transition"
          >
            <LogIn className="w-4 h-4" />
            <span>Already have an account? Login</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
