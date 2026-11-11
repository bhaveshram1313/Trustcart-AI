import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  UserPlus,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ShoppingBag,
  Store,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTrustCart } from '../context/TrustCartContext';
import { validatePasswordStrength } from '../services/authService';
import AuthLayout from '../components/auth/AuthLayout';
import PasswordInput from '../components/auth/PasswordInput';
import PasswordStrengthChecklist from '../components/auth/PasswordStrengthChecklist';

const ACCOUNT_OPTIONS = [
  {
    value: 'buyer',
    title: 'Buyer / User',
    description: 'I want to browse and purchase products.',
    icon: ShoppingBag,
  },
  {
    value: 'seller',
    title: 'Seller',
    description: 'I want to sell and manage my products.',
    icon: Store,
  },
];

export default function SignupPage() {
  const { signup } = useAuth();
  const { showToast } = useTrustCart();
  const navigate = useNavigate();

  const [accountType, setAccountType] = useState('');
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

    if (accountType !== 'buyer' && accountType !== 'seller') {
      setError('Please select how you would like to use TrustCart AI (Buyer or Seller).');
      return;
    }

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
      const result = await signup({ fullName, email, password, accountType });

      if (result.requiresEmailConfirmation) {
        setConfirmationSent(true);
        return;
      }

      showToast(`Account created! Welcome to TrustCart AI, ${result.user.fullName}.`, 'success');
      navigate(result.user.accountType === 'seller' ? '/seller/dashboard' : '/', {
        replace: true,
      });
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
            to your {accountType === 'seller' ? 'Seller Dashboard' : 'TrustCart AI account'}.
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
      subtitle="Choose your account type to get started with TrustCart AI."
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

        {/* Required Account Type Selection */}
        <fieldset className="space-y-2">
          <legend className="block text-xs font-semibold text-[#1E293B]">
            How would you like to use TrustCart AI? <span className="text-[#DC2626]">*</span>
          </legend>
          <div className="grid gap-2.5">
            {ACCOUNT_OPTIONS.map((option) => {
              const Icon = option.icon;
              const selected = accountType === option.value;
              return (
                <label
                  key={option.value}
                  className={`flex items-start gap-3 rounded-2xl border p-3.5 cursor-pointer transition ${
                    selected
                      ? 'border-[#635BFF] bg-[#635BFF]/6 ring-2 ring-[#635BFF]/15'
                      : 'border-slate-200 bg-[#F8FAFC] hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="accountType"
                    value={option.value}
                    checked={selected}
                    onChange={() => setAccountType(option.value)}
                    className="sr-only"
                  />
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                      selected
                        ? 'gradient-primary text-white'
                        : 'bg-white border border-slate-200 text-[#64748B]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display text-sm font-bold text-[#1E293B]">
                        {option.title}
                      </span>
                      {selected && <CheckCircle2 className="w-4 h-4 text-[#635BFF] shrink-0" />}
                    </div>
                    <p className="text-xs text-[#64748B] mt-0.5">{option.description}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </fieldset>

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
