import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  Clock,
  LogOut,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTrustCart } from '../../context/TrustCartContext';

function getInitials(fullName = '', email = '') {
  const clean = fullName.trim();
  if (clean) {
    const parts = clean.split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase();
  }
  return (email.slice(0, 2) || 'TC').toUpperCase();
}

export default function ProfileMenu({ onNavigate }) {
  const { user, authMode, logout } = useAuth();
  const { showToast } = useTrustCart();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  if (!user) return null;

  const initials = getInitials(user.fullName, user.email);

  const handleLogout = async () => {
    setOpen(false);
    if (onNavigate) onNavigate();
    await logout();
    showToast('Signed out of TrustCart AI', 'info');
    navigate('/', { replace: true });
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-[#1E293B] hover:border-[#635BFF]/40 hover:bg-slate-50 transition cursor-pointer"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-lg gradient-primary text-[11px] font-bold text-white">
          {initials}
        </span>
        <span className="hidden lg:block max-w-[115px] truncate text-xs font-semibold text-[#1E293B]">
          {user.fullName}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-[#64748B] transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/10 z-50 animate-fade-up"
        >
          {/* User Identity Header */}
          <div className="rounded-xl bg-[#F8FAFC] border border-slate-100 p-3.5 mb-1.5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl gradient-primary text-xs font-bold text-white">
                {initials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm font-bold text-[#1E293B] truncate">
                  {user.fullName}
                </p>
                <p className="text-xs text-[#64748B] truncate">{user.email}</p>
              </div>
            </div>
            <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-white border border-slate-200 px-2.5 py-0.5 text-[10px] font-semibold text-[#64748B]">
              <ShieldCheck
                className={`w-3 h-3 ${
                  authMode.isSupabase ? 'text-[#16A34A]' : 'text-[#F59E0B]'
                }`}
              />
              <span>{authMode.label}</span>
            </div>
          </div>

          <Link
            to="/account"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              if (onNavigate) onNavigate();
            }}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-[#1E293B] hover:bg-slate-100/80 transition"
          >
            <UserIcon className="w-4 h-4 text-[#635BFF]" />
            <span>My Account</span>
          </Link>

          <Link
            to="/orders"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              if (onNavigate) onNavigate();
            }}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-[#1E293B] hover:bg-slate-100/80 transition"
          >
            <Clock className="w-4 h-4 text-[#3B82F6]" />
            <span>My Orders</span>
          </Link>

          <div className="my-1 border-t border-slate-100" />

          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold text-[#DC2626] hover:bg-[#DC2626]/8 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out</span>
          </button>
        </div>
      )}
    </div>
  );
}
