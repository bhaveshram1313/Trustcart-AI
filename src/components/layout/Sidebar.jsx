import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  LayoutGrid,
  GitCompareArrows,
  ShieldAlert,
  Clock,
  ShoppingBag,
  LayoutDashboard,
  PlusCircle,
  Package,
  Store,
  LogOut,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTrustCart } from '../../context/TrustCartContext';

const buyerSidebarItems = [
  { to: '/', label: 'AI Assistant', icon: Sparkles, end: true },
  { to: '/products', label: 'Products', icon: LayoutGrid },
  { to: '/compare', label: 'Compare', icon: GitCompareArrows, badgeKey: 'compare' },
  { to: '/risk-analysis', label: 'AI Risk Analysis', icon: ShieldAlert },
  { to: '/orders', label: 'My Orders', icon: Clock },
  { to: '/checkout', label: 'Checkout', icon: ShoppingBag, badgeKey: 'cart' },
];

const sellerSidebarItems = [
  { to: '/seller/dashboard', label: 'Seller Dashboard', icon: LayoutDashboard, end: true },
  { to: '/seller/add-product', label: 'Add Product', icon: PlusCircle },
  { to: '/seller/products', label: 'My Products', icon: Package },
  { to: '/seller/profile', label: 'Seller Profile', icon: Store },
];

export default function Sidebar({ mobileOpen, onClose }) {
  const { isSeller, logout } = useAuth();
  const { compareIds, cartCount, showToast } = useTrustCart();
  const navigate = useNavigate();

  const items = isSeller ? sellerSidebarItems : buyerSidebarItems;

  const handleSellerLogout = async (isMobile) => {
    if (isMobile && onClose) onClose();
    await logout();
    showToast('Signed out of TrustCart AI', 'info');
    navigate('/', { replace: true });
  };

  const renderLinks = (isMobile = false) => (
    <nav className="space-y-1">
      {isSeller && (
        <div className="px-3 pb-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#635BFF]/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#635BFF]">
            <Store className="w-3 h-3" />
            Seller Workspace
          </span>
        </div>
      )}

      {items.map((item) => {
        const Icon = item.icon;
        const badgeCount =
          !isSeller && item.badgeKey === 'compare'
            ? compareIds.length
            : !isSeller && item.badgeKey === 'cart'
            ? cartCount
            : 0;

        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => {
              if (isMobile && onClose) onClose();
            }}
            className={({ isActive }) =>
              `flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? 'bg-[#635BFF]/10 text-[#635BFF]'
                  : 'text-[#64748B] hover:bg-slate-100/80 hover:text-[#1E293B]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className="flex items-center gap-2.5 truncate">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </span>
                {badgeCount > 0 && (
                  <span
                    className={`ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${
                      isActive
                        ? 'bg-[#635BFF] text-white'
                        : 'bg-slate-200/80 text-[#1E293B]'
                    }`}
                  >
                    {badgeCount}
                  </span>
                )}
              </>
            )}
          </NavLink>
        );
      })}

      {isSeller && (
        <>
          <div className="my-2 border-t border-slate-100" />
          <button
            type="button"
            onClick={() => handleSellerLogout(isMobile)}
            className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#DC2626] hover:bg-[#DC2626]/8 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Logout</span>
          </button>
        </>
      )}
    </nav>
  );

  return (
    <>
      {/* Compact Desktop Sidebar */}
      <aside className="hidden md:flex md:w-56 md:shrink-0 md:flex-col border-r border-slate-200/80 bg-white">
        <div className="sticky top-16 p-3 pt-5">{renderLinks(false)}</div>
      </aside>

      {/* Mobile Sidebar Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={onClose}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-64 max-w-[80vw] bg-white border-r border-slate-200 p-4 flex flex-col gap-4 shadow-2xl animate-fade-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="font-display text-sm font-bold text-[#1E293B]">
                Navigation
              </span>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-[#64748B] hover:bg-slate-100 hover:text-[#1E293B]"
                aria-label="Close navigation sidebar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {renderLinks(true)}
          </aside>
        </div>
      )}
    </>
  );
}
