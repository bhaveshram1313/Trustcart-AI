import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  UserPlus,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTrustCart } from '../context/TrustCartContext';
import { validatePasswordStrength } from '../services/authService';
import AuthLayout from '../components/auth/AuthLayout';
import PasswordInput from '../components/auth/PasswordInput';
import PasswordStrengthChecklist from '../components/auth/PasswordStrengthChecklist';

export default function SignupPage() {
  const { signup } = useAuth();
  const { showToast } = useTrustCart();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmationSent, setConfirmationSent] = useState(false);

  const passwordsMatch = password === confirmPassword;
  const { valid: passwordValid } = validatePasswordStrength(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (fullName.trim().length < 2) {
      setError('Please enter your full name (at least 2 characters).');
      return;
    }

    if (!passwordValid) {
      setError(
        'Please meet all password requirements (8+ chars, uppercase, lowercase, and number).'
      );
      return;
    }

    if (!passwordsMatch) {
      setError('Passwords do not match. Please verify both password fields.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await signup({ fullName, email, password });

      if (result.requiresEmailConfirmation) {
        setConfirmationSent(true);
        return;
      }

      showToast(`Account created! Welcome to TrustCart AI, ${result.user.fullName}.`, 'success');
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Unable to create account.');
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmationSent) {
    return (
      <AuthLayout
        title="Verify your email"
        subtitle="Check your inbox to activate your TrustCart AI account."
      >
        <div className="text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#16A34A]/10 text-[#16A34A]">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <p className="text-sm text-[#1E293B] leading-relaxed">
            We sent a confirmation link to <strong>{email}</strong>. Once verified, you can sign in
            and access your personal orders and protected checkout.
          </p>
          <Link
            to="/login"
            className="inline-flex w-full items-center justify-center rounded-xl gradient-primary px-5 py-3 text-sm font-semibold text-white"
          >
            Go to Login
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Get a personal shopping cart, protected checkout, and private order ledger."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-[#635BFF] hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-[#DC2626]/30 bg-[#DC2626]/6 p-3 text-xs font-medium text-[#DC2626]">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label htmlFor="signup-name" className="block text-xs font-semibold text-[#1E293B] mb-1.5">
            Full Name
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="signup-name"
              type="text"
              autoComplete="name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Alex Morgan"
              className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] pl-10 pr-4 py-2.5 text-sm text-[#1E293B] placeholder:text-[#64748B]/70 focus:bg-white focus:border-[#635BFF] focus:outline-none focus:ring-2 focus:ring-[#635BFF]/15 transition"
            />
          </div>
        </div>

        <div>
          <label htmlFor="signup-email" className="block text-xs font-semibold text-[#1E293B] mb-1.5">
            Email Address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="signup-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@example.com"
              className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] pl-10 pr-4 py-2.5 text-sm text-[#1E293B] placeholder:text-[#64748B]/70 focus:bg-white focus:border-[#635BFF] focus:outline-none focus:ring-2 focus:ring-[#635BFF]/15 transition"
            />
          </div>
        </div>

        <PasswordInput
          id="signup-password"
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />

        <PasswordInput
          id="signup-confirm-password"
          label="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          error={
            confirmPassword.length > 0 && !passwordsMatch
              ? 'Confirmation password does not match.'
              : ''
          }
        />

        <PasswordStrengthChecklist password={password} confirmPassword={confirmPassword} />

        <button
          type="submit"
          disabled={submitting}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl gradient-primary px-5 py-3 text-sm font-semibold text-white shadow-md shadow-[#635BFF]/20 hover:opacity-95 transition cursor-pointer disabled:opacity-60"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Creating Account...</span>
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4" />
              <span>Create Account</span>
            </>
          )}
        </button>
      </form>
    </AuthLayout>
  );
}
