import React from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function GuestRoute({ children }) {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-[#64748B]">
        <Loader2 className="w-7 h-7 animate-spin text-[#635BFF]" />
        <p className="text-sm font-medium">Checking authentication...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <Navigate
        to={user?.accountType === 'seller' ? '/seller/dashboard' : '/'}
        replace
      />
    );
  }

  return children;
}
