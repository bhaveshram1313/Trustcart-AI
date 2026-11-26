import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles = null }) {
  const { isAuthenticated, user, loading, canBuy, canSell } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-[#64748B]">
        <Loader2 className="w-7 h-7 animate-spin text-[#635BFF]" />
        <p className="text-sm font-medium">Verifying your session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (Array.isArray(allowedRoles)) {
    const userRole = user?.accountType;
    const canAccess = allowedRoles.some((role) => {
      if (role === 'buyer') return canBuy;
      if (role === 'seller') return canSell;
      return role === userRole;
    });

    if (!canAccess) {
      const fallbackPath = userRole === 'seller' ? '/seller/dashboard' : '/';
      return <Navigate to={fallbackPath} replace />;
    }
  }

  return children;
}
