import React, { useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes, useLocation, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TrustCartProvider } from './context/TrustCartContext';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import Footer from './components/layout/Footer';
import Toast from './components/common/Toast';
import ProtectedRoute from './components/auth/ProtectedRoute';
import GuestRoute from './components/auth/GuestRoute';

import WelcomePage from './pages/WelcomePage';
import HomePage from './pages/HomePage';
import ProductListingPage from './pages/ProductListingPage';
import ProductDetailsPage from './pages/ProductDetailsPage';
import ProductComparisonPage from './pages/ProductComparisonPage';
import AIRiskAnalysisPage from './pages/AIRiskAnalysisPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderHistoryPage from './pages/OrderHistoryPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import AccountPage from './pages/AccountPage';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function RootEntry() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-[#64748B]">
        <Loader2 className="w-7 h-7 animate-spin text-[#635BFF]" />
        <p className="text-sm font-medium">Loading TrustCart AI...</p>
      </div>
    );
  }

  return isAuthenticated ? <HomePage /> : <WelcomePage />;
}

function AppShell() {
  const { isAuthenticated } = useAuth();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#1E293B]">
      <Navbar
        mobileSidebarOpen={mobileSidebarOpen}
        onToggleSidebar={() => setMobileSidebarOpen((open) => !open)}
      />

      <div className="flex flex-1">
        {isAuthenticated && (
          <Sidebar
            mobileOpen={mobileSidebarOpen}
            onClose={() => setMobileSidebarOpen(false)}
          />
        )}

        <div className="flex-1 min-w-0 flex flex-col">
          <main className="flex-1">
            <Routes>
              {/* First Visit Welcome Screen (unauthenticated) / Home Page (authenticated) */}
              <Route path="/" element={<RootEntry />} />

              {/* Guest-Only Auth Routes (redirect logged-in users to Home) */}
              <Route
                path="/login"
                element={
                  <GuestRoute>
                    <LoginPage />
                  </GuestRoute>
                }
              />
              <Route
                path="/signup"
                element={
                  <GuestRoute>
                    <SignupPage />
                  </GuestRoute>
                }
              />

              {/* Authenticated Application Routes */}
              <Route
                path="/products"
                element={
                  <ProtectedRoute>
                    <ProductListingPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/products/:id"
                element={
                  <ProtectedRoute>
                    <ProductDetailsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/compare"
                element={
                  <ProtectedRoute>
                    <ProductComparisonPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/risk-analysis"
                element={
                  <ProtectedRoute>
                    <AIRiskAnalysisPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/checkout"
                element={
                  <ProtectedRoute>
                    <CheckoutPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/orders"
                element={
                  <ProtectedRoute>
                    <OrderHistoryPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/account"
                element={
                  <ProtectedRoute>
                    <AccountPage />
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </div>

      <Toast />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TrustCartProvider>
          <ScrollToTop />
          <AppShell />
        </TrustCartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
