import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Menu, X, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import ProfileMenu from '../auth/ProfileMenu';

export default function Navbar({ mobileSidebarOpen = false, onToggleSidebar }) {
  const { isAuthenticated } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto max-w-full px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Left: Mobile Sidebar Trigger (authenticated) + Brand Logo */}
          <div className="flex items-center gap-3">
            {isAuthenticated && onToggleSidebar && (
              <button
                type="button"
                onClick={onToggleSidebar}
                className="md:hidden inline-flex items-center justify-center rounded-xl border border-slate-200 p-2 text-[#1E293B] hover:bg-slate-100 transition cursor-pointer"
                aria-label="Toggle navigation sidebar"
              >
                {mobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            )}

            <Link
              to="/"
              className="flex items-center gap-2.5 group shrink-0"
              onClick={() => {
                if (mobileSidebarOpen && onToggleSidebar) onToggleSidebar();
              }}
            >
              <div className="relative flex h-9 w-9 items-center justify-center rounded-xl gradient-primary text-white shadow-md shadow-[#635BFF]/25 transition-transform group-hover:scale-105">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-display text-lg font-extrabold tracking-tight text-[#1E293B]">
                    TrustCart
                  </span>
                  <span className="rounded-md bg-[#635BFF]/10 px-1.5 py-0.5 text-[11px] font-bold text-[#635BFF]">
                    AI
                  </span>
                </div>
                <p className="hidden xl:block text-[10px] font-medium text-[#64748B] -mt-0.5">
                  Think Smart. Shop Safe. Pay Confidently.
                </p>
              </div>
            </Link>
          </div>

          {/* Right: User Account Dropdown (authenticated) or Auth Entry Links */}
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <ProfileMenu />
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#1E293B] hover:border-[#635BFF]/40 hover:text-[#635BFF] transition"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Login</span>
                </Link>
                <Link
                  to="/signup"
                  className="inline-flex items-center gap-1.5 rounded-xl gradient-primary px-3.5 py-2 text-xs font-semibold text-white shadow-sm shadow-[#635BFF]/20 hover:opacity-95 transition"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Sign Up</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
