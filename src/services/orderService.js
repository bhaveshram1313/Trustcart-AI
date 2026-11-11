import { apiRequest } from './apiClient.js';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient.js';

/**
 * Order History & Persistence Service
 * Scoped strictly per authenticated user ID so users only see their own purchases.
 *
 * Target Supabase / FastAPI endpoints:
 * - GET /api/v1/orders?userId={id}
 * - POST /api/v1/orders
 */

function getOrdersStorageKey(userId) {
  return `trustcart_orders_v2_${userId}`;
}

function loadUserOrders(userId) {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(getOrdersStorageKey(userId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((o) => o.userId === userId);
      }
    }
  } catch {
    // Ignore storage access errors
  }
  return [];
}

function saveUserOrders(userId, orders) {
  if (!userId) return;
  try {
    localStorage.setItem(getOrdersStorageKey(userId), JSON.stringify(orders));
  } catch {
    // Ignore storage quota errors
  }
}

export async function getOrders(userId) {
  if (!userId) return [];

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (!error && Array.isArray(data)) {
        return data;
      }
    } catch {
      // Fallback to local per-user storage if Supabase orders table isn't provisioned yet
    }
  }

  return apiRequest(
    `/orders?userId=${encodeURIComponent(userId)}`,
    { method: 'GET', mockDelay: 120 },
    () => loadUserOrders(userId)
  );
}

export async function createOrder(orderPayload, userId) {
  if (!userId) {
    throw new Error('Authentication required to place an order.');
  }

  return apiRequest(
    '/orders',
    {
      method: 'POST',
      body: JSON.stringify({ ...orderPayload, userId }),
      mockDelay: 220,
    },
    () => {
      const current = loadUserOrders(userId);
      const newOrder = {
        id: `TC-${Math.floor(100000 + Math.random() * 900000)}`,
        userId,
        date: new Date().toISOString(),
        status: 'Processing',
        ...orderPayload,
        timeline: [
          { step: 'Order & PayPal Escrow Confirmed', date: 'Just now', completed: true },
          { step: 'AI Seller Verification Passed', date: 'Just now', completed: true },
          { step: 'Preparing Insured Dispatch', date: 'Pending', completed: false },
          { step: 'Estimated Delivery (2–4 Days)', date: 'Scheduled', completed: false },
        ],
      };

      const updated = [newOrder, ...current];
      saveUserOrders(userId, updated);
      return newOrder;
    }
  );
}
