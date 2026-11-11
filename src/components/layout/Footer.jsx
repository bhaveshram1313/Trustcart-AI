import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Lock, Cpu, Database } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Footer() {
  const { isSeller } = useAuth();

  return (
    <footer className="mt-20 border-t border-slate-200/80 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary text-white">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="font-display text-base font-bold text-[#1E293B]">
                TrustCart AI
              </span>
            </div>
            <p className="mt-3 text-sm font-medium text-[#635BFF]">
              "Think Smart. Shop Safe. Pay Confidently."
            </p>
            <p className="mt-2 text-xs text-[#64748B] leading-relaxed max-w-sm">
              AI-powered shopping intelligence combining seller credibility checks, fake-review
              detection, and protected PayPal checkout workflows.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1E293B] mb-3">
              Navigation
            </h3>
            {isSeller ? (
              <ul className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm text-[#64748B]">
                <li>
                  <Link to="/seller/dashboard" className="hover:text-[#635BFF] transition">
                    Seller Dashboard
                  </Link>
                </li>
                <li>
                  <Link to="/seller/add-product" className="hover:text-[#635BFF] transition">
                    Add Product
                  </Link>
                </li>
                <li>
                  <Link to="/seller/products" className="hover:text-[#635BFF] transition">
                    My Products
                  </Link>
                </li>
                <li>
                  <Link to="/seller/profile" className="hover:text-[#635BFF] transition">
                    Seller Profile
                  </Link>
                </li>
              </ul>
            ) : (
              <ul className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm text-[#64748B]">
                <li>
                  <Link to="/" className="hover:text-[#635BFF] transition">
                    AI Assistant
                  </Link>
                </li>
                <li>
                  <Link to="/products" className="hover:text-[#635BFF] transition">
                    Product Catalog
                  </Link>
                </li>
                <li>
                  <Link to="/compare" className="hover:text-[#635BFF] transition">
                    Product Comparison
                  </Link>
                </li>
                <li>
                  <Link to="/risk-analysis" className="hover:text-[#635BFF] transition">
                    AI Risk Analysis
                  </Link>
                </li>
                <li>
                  <Link to="/checkout" className="hover:text-[#635BFF] transition">
                    PayPal Checkout
                  </Link>
                </li>
                <li>
                  <Link to="/orders" className="hover:text-[#635BFF] transition">
                    My Orders
                  </Link>
                </li>
                <li>
                  <Link to="/account" className="hover:text-[#635BFF] transition">
                    My Account
                  </Link>
                </li>
                <li>
                  <Link to="/login" className="hover:text-[#635BFF] transition">
                    Login / Sign Up
                  </Link>
                </li>
              </ul>
            )}
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1E293B] mb-3">
              Integration-Ready Stack
            </h3>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-[#F8FAFC] px-2.5 py-1.5 text-xs font-medium text-[#1E293B]">
                <Cpu className="w-3.5 h-3.5 text-[#635BFF]" />
                Gemini AI Ready
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-[#F8FAFC] px-2.5 py-1.5 text-xs font-medium text-[#1E293B]">
                <Database className="w-3.5 h-3.5 text-[#3B82F6]" />
                FastAPI + Supabase
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-[#F8FAFC] px-2.5 py-1.5 text-xs font-medium text-[#1E293B]">
                <Lock className="w-3.5 h-3.5 text-[#16A34A]" />
                PayPal Sandbox
              </span>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100 pt-6 text-xs text-[#64748B]">
          <p>© {new Date().getFullYear()} TrustCart AI. Demo storefront running on modular service architecture.</p>
          <p>Zero real charges processed — PayPal Sandbox simulation active.</p>
        </div>
      </div>
    </footer>
  );
}
