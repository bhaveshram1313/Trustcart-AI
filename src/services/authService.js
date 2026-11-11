import { isSupabaseConfigured, supabase } from '../lib/supabaseClient.js';

/**
 * Authentication Service for TrustCart AI
 *
 * Uses Supabase Auth automatically when VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
 * are configured in .env.
 *
 * When Supabase credentials are unavailable, runs in clearly labelled
 * "Development Authentication Mode" with per-user isolated accounts stored locally
 * (never a shared hardcoded account).
 */

const DEV_USERS_KEY = 'trustcart_dev_users_v1';
const DEV_SESSION_KEY = 'trustcart_dev_session_v1';

const devListeners = new Set();

function notifyDevListeners(user) {
  devListeners.forEach((cb) => {
    try {
      cb(user);
    } catch {
      // Ignore listener errors
    }
  });
}

function readDevUsers() {
  try {
    const raw = localStorage.getItem(DEV_USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeDevUsers(users) {
  localStorage.setItem(DEV_USERS_KEY, JSON.stringify(users));
}

function readDevSession() {
  try {
    const raw = localStorage.getItem(DEV_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeDevSession(session) {
  if (!session) {
    localStorage.removeItem(DEV_SESSION_KEY);
    return;
  }
  localStorage.setItem(DEV_SESSION_KEY, JSON.stringify(session));
}

function generateId(prefix = 'usr') {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

async function hashPassword(password, salt) {
  const input = `${salt}:${password}`;
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const bytes = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Fallback deterministic encoding if WebCrypto subtle is unavailable
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return `fallback_${Math.abs(hash).toString(16)}`;
}

function mapSupabaseUser(sbUser) {
  if (!sbUser) return null;
  return {
    id: sbUser.id,
    email: sbUser.email || '',
    fullName:
      sbUser.user_metadata?.full_name ||
      sbUser.user_metadata?.name ||
      (sbUser.email ? sbUser.email.split('@')[0] : 'TrustCart Member'),
    authProvider: 'supabase',
    createdAt: sbUser.created_at,
  };
}

function sanitizeDevUser(devUser) {
  if (!devUser) return null;
  return {
    id: devUser.id,
    email: devUser.email,
    fullName: devUser.fullName,
    authProvider: 'development',
    createdAt: devUser.createdAt,
  };
}

export function getAuthModeInfo() {
  if (isSupabaseConfigured) {
    return {
      isSupabase: true,
      mode: 'supabase',
      label: 'Supabase Authentication',
      description: 'Connected to live Supabase Auth.',
    };
  }
  return {
    isSupabase: false,
    mode: 'development',
    label: 'Development Auth Mode',
    description:
      'Supabase credentials not detected. Accounts are isolated locally per user in this browser.',
  };
}

export function validatePasswordStrength(password = '') {
  const checks = {
    minLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
  };
  const valid = Object.values(checks).every(Boolean);
  return { valid, checks };
}

export async function getCurrentUser() {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.auth.getSession();
    if (error) return null;
    return mapSupabaseUser(data?.session?.user || null);
  }

  const session = readDevSession();
  if (!session?.userId) return null;
  const users = readDevUsers();
  const matched = users.find((u) => u.id === session.userId);
  return sanitizeDevUser(matched || null);
}

export function onAuthStateChange(callback) {
  if (isSupabaseConfigured && supabase) {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(mapSupabaseUser(session?.user || null));
    });
    return () => {
      data?.subscription?.unsubscribe();
    };
  }

  devListeners.add(callback);
  return () => {
    devListeners.delete(callback);
  };
}

export async function signup({ fullName, email, password }) {
  const trimmedName = (fullName || '').trim();
  const normalizedEmail = (email || '').trim().toLowerCase();

  if (!trimmedName || trimmedName.length < 2) {
    throw new Error('Please enter your full name (at least 2 characters).');
  }
  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error('Please enter a valid email address.');
  }
  const strength = validatePasswordStrength(password);
  if (!strength.valid) {
    throw new Error(
      'Password must be at least 8 characters and include uppercase, lowercase, and a number.'
    );
  }

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          full_name: trimmedName,
        },
      },
    });
    if (error) throw new Error(error.message);

    // Note: If email confirmation is enabled on Supabase project, session may be null
    return {
      user: mapSupabaseUser(data.user),
      requiresEmailConfirmation: !data.session,
    };
  }

  // Development Auth Mode: create isolated local user account
  const users = readDevUsers();
  const existing = users.find((u) => u.email === normalizedEmail);
  if (existing) {
    throw new Error('An account with this email already exists. Please log in instead.');
  }

  const salt = generateId('salt');
  const passwordHash = await hashPassword(password, salt);
  const newUser = {
    id: generateId('usr'),
    fullName: trimmedName,
    email: normalizedEmail,
    salt,
    passwordHash,
    createdAt: new Date().toISOString(),
  };

  writeDevUsers([...users, newUser]);
  writeDevSession({
    userId: newUser.id,
    createdAt: new Date().toISOString(),
  });

  const cleanUser = sanitizeDevUser(newUser);
  notifyDevListeners(cleanUser);
  return { user: cleanUser, requiresEmailConfirmation: false };
}

export async function login({ email, password }) {
  const normalizedEmail = (email || '').trim().toLowerCase();
  if (!normalizedEmail || !password) {
    throw new Error('Please enter both your email and password.');
  }

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    if (error) throw new Error(error.message);
    return mapSupabaseUser(data.user);
  }

  // Development Auth Mode: verify email & salted password hash
  const users = readDevUsers();
  const matched = users.find((u) => u.email === normalizedEmail);
  if (!matched) {
    throw new Error('Invalid email or password. No account matches those credentials.');
  }

  const candidateHash = await hashPassword(password, matched.salt);
  if (candidateHash !== matched.passwordHash) {
    throw new Error('Invalid email or password. Please check your credentials.');
  }

  writeDevSession({
    userId: matched.id,
    createdAt: new Date().toISOString(),
  });

  const cleanUser = sanitizeDevUser(matched);
  notifyDevListeners(cleanUser);
  return cleanUser;
}

export async function logout() {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
    return;
  }

  writeDevSession(null);
  notifyDevListeners(null);
}

export async function resetPassword({ email, newPassword }) {
  const normalizedEmail = (email || '').trim().toLowerCase();
  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error('Please enter a valid account email address.');
  }

  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${window.location.origin}/login`,
    });
    if (error) throw new Error(error.message);
    return {
      mode: 'supabase',
      message: `Password reset link sent to ${normalizedEmail}. Check your inbox.`,
    };
  }

  // Development Auth Mode: verify email exists and update salted password hash locally
  const users = readDevUsers();
  const idx = users.findIndex((u) => u.email === normalizedEmail);
  if (idx === -1) {
    throw new Error('No local development account found with that email address.');
  }

  const strength = validatePasswordStrength(newPassword);
  if (!strength.valid) {
    throw new Error(
      'New password must be at least 8 characters and include uppercase, lowercase, and a number.'
    );
  }

  const newSalt = generateId('salt');
  const newHash = await hashPassword(newPassword, newSalt);
  users[idx] = { ...users[idx], salt: newSalt, passwordHash: newHash };
  writeDevUsers(users);

  return {
    mode: 'development',
    message: `Development password updated for ${normalizedEmail}. You can now log in.`,
  };
}
