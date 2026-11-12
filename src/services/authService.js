import { isSupabaseConfigured, supabase } from '../lib/supabaseClient.js';
import { apiRequest } from './apiClient.js';

/**
 * Authentication Service for TrustCart AI
 *
 * Uses Supabase Auth + public.profiles / public.seller_profiles automatically
 * when VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are configured in .env.
 *
 * When Supabase credentials are unavailable, runs in clearly labelled
 * "Development Authentication Mode" with per-user isolated accounts stored locally
 * (never a shared hardcoded account).
 */

const DEV_USERS_KEY = 'trustcart_dev_users_v1';
const DEV_SESSION_KEY = 'trustcart_dev_session_v1';
const DEV_SELLER_PROFILES_KEY = 'trustcart_seller_profiles_v1';

const VALID_ACCOUNT_TYPES = new Set(['buyer', 'seller']);

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

function readDevSellerProfiles() {
  try {
    const raw = localStorage.getItem(DEV_SELLER_PROFILES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeDevSellerProfiles(map) {
  localStorage.setItem(DEV_SELLER_PROFILES_KEY, JSON.stringify(map));
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
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return `fallback_${Math.abs(hash).toString(16)}`;
}

function normalizeAccountType(rawType) {
  return VALID_ACCOUNT_TYPES.has(rawType) ? rawType : 'buyer';
}

function buildDefaultSellerProfile(user) {
  return {
    userId: user.id,
    fullName: user.fullName || '',
    email: user.email || '',
    shopName: '',
    phone: '',
    businessAddress: '',
    updatedAt: user.createdAt || new Date().toISOString(),
  };
}

function mapSupabaseUser(sbUser, profileRow = null, sellerRow = null) {
  if (!sbUser) return null;
  const fullName =
    profileRow?.full_name ||
    sbUser.user_metadata?.full_name ||
    sbUser.user_metadata?.name ||
    (sbUser.email ? sbUser.email.split('@')[0] : 'TrustCart Member');

  const accountType = normalizeAccountType(
    profileRow?.account_type || sbUser.user_metadata?.account_type
  );

  const base = {
    id: sbUser.id,
    email: sbUser.email || '',
    fullName,
    accountType,
    authProvider: 'supabase',
    createdAt: sbUser.created_at,
  };

  if (accountType === 'seller') {
    base.sellerProfile = {
      userId: sbUser.id,
      fullName,
      email: base.email,
      shopName: sellerRow?.shop_name || sbUser.user_metadata?.shop_name || '',
      phone: sellerRow?.phone || sbUser.user_metadata?.phone || '',
      businessAddress:
        sellerRow?.business_address || sbUser.user_metadata?.business_address || '',
      updatedAt: sellerRow?.updated_at || base.createdAt,
    };
  }

  return base;
}

async function enrichSupabaseUser(sbUser) {
  if (!sbUser || !supabase) return null;
  try {
    const { data: profileRow } = await supabase
      .from('profiles')
      .select('id, full_name, email, account_type')
      .eq('id', sbUser.id)
      .maybeSingle();

    const accountType = normalizeAccountType(
      profileRow?.account_type || sbUser.user_metadata?.account_type
    );

    let sellerRow = null;
    if (accountType === 'seller') {
      const { data } = await supabase
        .from('seller_profiles')
        .select('user_id, shop_name, phone, business_address, updated_at')
        .eq('user_id', sbUser.id)
        .maybeSingle();
      sellerRow = data || null;
    }

    return mapSupabaseUser(sbUser, profileRow, sellerRow);
  } catch {
    return mapSupabaseUser(sbUser);
  }
}

function sanitizeDevUser(devUser) {
  if (!devUser) return null;
  const accountType = normalizeAccountType(devUser.accountType);
  const base = {
    id: devUser.id,
    email: devUser.email,
    fullName: devUser.fullName,
    accountType,
    authProvider: 'development',
    createdAt: devUser.createdAt,
  };

  if (accountType === 'seller') {
    const profiles = readDevSellerProfiles();
    base.sellerProfile = profiles[devUser.id] || buildDefaultSellerProfile(base);
  }

  return base;
}

export function getAuthModeInfo() {
  if (isSupabaseConfigured) {
    return {
      isSupabase: true,
      mode: 'supabase',
      label: 'Supabase Authentication',
      description: 'Connected to live Supabase Auth & Row Level Security.',
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
    if (error || !data?.session?.user) return null;
    return enrichSupabaseUser(data.session.user);
  }

  const session = readDevSession();
  if (!session?.userId) return null;
  const users = readDevUsers();
  const matched = users.find((u) => u.id === session.userId);
  return sanitizeDevUser(matched || null);
}

export function onAuthStateChange(callback) {
  if (isSupabaseConfigured && supabase) {
    const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user) {
        callback(null);
        return;
      }
      const enriched = await enrichSupabaseUser(session.user);
      callback(enriched);
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

export async function signup({ fullName, email, password, accountType }) {
  const trimmedName = (fullName || '').trim();
  const normalizedEmail = (email || '').trim().toLowerCase();

  if (!VALID_ACCOUNT_TYPES.has(accountType)) {
    throw new Error('Please choose how you would like to use TrustCart AI (Buyer or Seller).');
  }
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
          account_type: accountType,
        },
      },
    });
    if (error) throw new Error(error.message);

    // Synchronize registration with backend if available
    apiAuthRegister({
      email: normalizedEmail,
      fullName: trimmedName,
      password,
      accountType,
    }).catch(() => {});

    const mapped = data.user ? await enrichSupabaseUser(data.user) : null;
    return {
      user: mapped,
      requiresEmailConfirmation: !data.session,
    };
  }

  // Development Auth Mode: create isolated local user account with explicit accountType
  const users = readDevUsers();
  const existing = users.find((u) => u.email === normalizedEmail);
  if (existing) {
    throw new Error('An account with this email already exists. Please log in instead.');
  }

  const salt = generateId('salt');
  const passwordHash = await hashPassword(password, salt);
  const createdAt = new Date().toISOString();
  const newUser = {
    id: generateId('usr'),
    fullName: trimmedName,
    email: normalizedEmail,
    accountType,
    salt,
    passwordHash,
    createdAt,
  };

  writeDevUsers([...users, newUser]);

  if (accountType === 'seller') {
    const profiles = readDevSellerProfiles();
    profiles[newUser.id] = buildDefaultSellerProfile(newUser);
    writeDevSellerProfiles(profiles);
  }

  writeDevSession({
    userId: newUser.id,
    createdAt,
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

    // Synchronize login with backend if available
    apiAuthLogin({ email: normalizedEmail, password }).catch(() => {});

    return enrichSupabaseUser(data.user);
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

export async function updateSellerProfile({ fullName, shopName, phone, businessAddress }) {
  const activeUser = await getCurrentUser();
  if (!activeUser) {
    throw new Error('Authentication required.');
  }
  if (activeUser.accountType !== 'seller') {
    throw new Error('Only seller accounts can manage a seller profile.');
  }

  const cleanFullName = (fullName ?? activeUser.fullName).trim();
  const cleanShopName = (shopName ?? '').trim();
  const cleanPhone = (phone ?? '').trim();
  const cleanAddress = (businessAddress ?? '').trim();

  if (cleanFullName.length < 2) {
    throw new Error('Full name must be at least 2 characters.');
  }

  if (isSupabaseConfigured && supabase) {
    // Update auth & profile using verified session user ID (never from client payload)
    const { data: userData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !userData?.user) throw new Error('Invalid session.');
    const uid = userData.user.id;

    const { error: profileErr } = await supabase
      .from('profiles')
      .update({ full_name: cleanFullName, updated_at: new Date().toISOString() })
      .eq('id', uid);
    if (profileErr) throw new Error(profileErr.message);

    const { error: sellerErr } = await supabase.from('seller_profiles').upsert(
      {
        user_id: uid,
        shop_name: cleanShopName,
        phone: cleanPhone,
        business_address: cleanAddress,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
    if (sellerErr) throw new Error(sellerErr.message);

    const refreshed = await enrichSupabaseUser(userData.user);
    return refreshed;
  }

  // Development Auth Mode: persist under active authenticated user's own ID
  const users = readDevUsers();
  const idx = users.findIndex((u) => u.id === activeUser.id);
  if (idx === -1) throw new Error('Account not found.');

  users[idx] = { ...users[idx], fullName: cleanFullName };
  writeDevUsers(users);

  const profiles = readDevSellerProfiles();
  profiles[activeUser.id] = {
    userId: activeUser.id,
    fullName: cleanFullName,
    email: activeUser.email,
    shopName: cleanShopName,
    phone: cleanPhone,
    businessAddress: cleanAddress,
    updatedAt: new Date().toISOString(),
  };
  writeDevSellerProfiles(profiles);

  const updatedUser = sanitizeDevUser(users[idx]);
  notifyDevListeners(updatedUser);
  return updatedUser;
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

/**
 * FastAPI Backend Authentication Endpoints
 * These provide direct access to the backend's auth routes when transitioning
 * from Supabase to custom JWT auth in future milestones.
 */
export async function apiAuthLogin({ email, password }) {
  return apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function apiAuthRegister({ email, fullName, password, accountType = 'buyer' }) {
  return apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, full_name: fullName, password, account_type: accountType }),
  });
}

export async function apiAuthMe(token) {
  return apiRequest('/auth/me', {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}
