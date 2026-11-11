import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Mail,
  LogIn,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  KeyRound,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTrustCart } from '../context/TrustCartContext';
import AuthLayout from '../components/auth/AuthLayout';
import PasswordInput from '../components/auth/PasswordInput';
import PasswordStrengthChecklist from '../components/auth/PasswordStrengthChecklist';

export default function LoginPage() {
  const { login, resetPassword, authMode } = useAuth();
  const { showToast } = useTrustCart();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Forgot password state
  const [forgotMode, setForgotMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const signedInUser = await login({ email, password });
      showToast(`Welcome back, ${signedInUser.fullName}!`, 'success');
      navigate(signedInUser.accountType === 'seller' ? '/seller/dashboard' : '/', {
        replace: true,
      });
    } catch (err) {
      setError(err.message || 'Unable to log in. Please verify your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResetSuccess('');
    setSubmitting(true);
    try {
      const res = await resetPassword({ email: resetEmail, newPassword });
      setResetSuccess(res.message);
      setEmail(resetEmail);
      setNewPassword('');
    } catch (err) {
      setError(err.message || 'Could not reset password.');
    } finally {
      setSubmitting(false);
    }
  };

  if (forgotMode) {
    return (
      <AuthLayout
        title="Reset your password"
        subtitle="Recover access to your TrustCart AI account"
        footer={
          <button
            type="button"
            onClick={() => {
              setForgotMode(false);
              setError('');
              setResetSuccess('');
            }}
            className="inline-flex items-center gap-1.5 font-semibold text-[#635BFF] hover:underline cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </button>
        }
      >
        <form onSubmit={handleResetSubmit} className="space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-[#DC2626]/30 bg-[#DC2626]/6 p-3 text-xs font-medium text-[#DC2626]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {resetSuccess && (
            <div className="flex items-start gap-2.5 rounded-xl border border-[#16A34A]/30 bg-[#16A34A]/8 p-3 text-xs font-medium text-[#16A34A]">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{resetSuccess}</span>
            </div>
          )}

          <div>
            <label htmlFor="reset-email" className="block text-xs font-semibold text-[#1E293B] mb-1.5">
              Account Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="reset-email"
                type="email"
                required
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] pl-10 pr-4 py-2.5 text-sm text-[#1E293B] focus:bg-white focus:border-[#635BFF] focus:outline-none focus:ring-2 focus:ring-[#635BFF]/15"
              />
            </div>
          </div>

          {!authMode.isSupabase && (
            <>
              <PasswordInput
                id="reset-new-password"
                label="New Password (Development Mode)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="Enter a strong new password"
              />
              <PasswordStrengthChecklist password={newPassword} />
            </>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl gradient-primary px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-[#635BFF]/25 hover:opacity-95 transition cursor-pointer disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing Reset...</span>
              </>
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                <span>
                  {authMode.isSupabase ? 'Send Reset Link' : 'Update Password'}
                </span>
              </>
            )}
          </button>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to access your personal cart, orders, and protected checkout."
      footer={
        <>
          Don&apos;t have a TrustCart AI account?{' '}
          <Link to="/signup" className="font-semibold text-[#635BFF] hover:underline">
            Sign up
          </Link>
        </>
      }
    >
      <form onSubmit={handleLogin} className="space-y-4">
        {location.state?.from && (
          <div className="rounded-xl border border-[#3B82F6]/25 bg-[#3B82F6]/6 px-3.5 py-2.5 text-xs text-[#1E293B]">
            Please sign in to continue to{' '}
            <strong className="text-[#3B82F6]">{location.state.from.pathname}</strong>.
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-[#DC2626]/30 bg-[#DC2626]/6 p-3 text-xs font-medium text-[#DC2626]">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label htmlFor="login-email" className="block text-xs font-semibold text-[#1E293B] mb-1.5">
            Email Address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] pl-10 pr-4 py-2.5 text-sm text-[#1E293B] placeholder:text-[#64748B]/70 focus:bg-white focus:border-[#635BFF] focus:outline-none focus:ring-2 focus:ring-[#635BFF]/15 transition"
            />
          </div>
        </div>

        <PasswordInput
          id="login-password"
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />

        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={() => {
              setForgotMode(true);
              setResetEmail(email);
              setError('');
            }}
            className="text-xs font-semibold text-[#635BFF] hover:underline cursor-pointer"
          >
            Forgot password?
          </button>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl gradient-primary px-5 py-3 text-sm font-semibold text-white shadow-md shadow-[#635BFF]/20 hover:opacity-95 transition cursor-pointer disabled:opacity-60"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Signing In...</span>
            </>
          ) : (
            <>
              <LogIn className="w-4 h-4" />
              <span>Log In</span>
            </>
          )}
        </button>
      </form>
    </AuthLayout>
  );
}
