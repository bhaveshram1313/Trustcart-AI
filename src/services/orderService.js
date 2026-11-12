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
      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map((o) => ({
          ...o,
          userId: o.user_id,
          paypalTransactionId: o.paypal_transaction_id,
          buyerProtectionStatus: o.buyer_protection_status,
          shippingAddress: o.shipping_address,
          totalAmount: Number(o.total),
          total: Number(o.total),
          subtotal: Number(o.subtotal),
          shipping: Number(o.shipping),
          tax: Number(o.tax),
        }));
      }
    } catch {
      // Fallback to backend / local per-user storage if Supabase orders table isn't provisioned yet
    }
  }

  const fallback = () => loadUserOrders(userId);

  try {
    const backendOrders = await apiRequest(
      `/orders?userId=${encodeURIComponent(userId)}`,
      { method: 'GET', mockDelay: 120 },
      fallback
    );
    if (Array.isArray(backendOrders) && backendOrders.length > 0) {
      return backendOrders;
    }
    return fallback();
  } catch {
    return fallback();
  }
}

export async function createOrder(orderPayload, userId) {
  if (!userId) {
    throw new Error('Authentication required to place an order.');
  }

  if (!orderPayload.paypalTransactionId) {
    throw new Error('A verified PayPal capture transaction ID is required to create a confirmed order.');
  }

  const totalAmount = Number(orderPayload.totalAmount ?? orderPayload.total ?? 0);
  const payloadWithTotals = {
    ...orderPayload,
    total: totalAmount,
    totalAmount: totalAmount,
    userId,
  };

  const fallback = () => {
    const current = loadUserOrders(userId);
    // Prevent duplicate entries by paypalTransactionId
    const existing = current.find(
      (o) => o.paypalTransactionId && o.paypalTransactionId === orderPayload.paypalTransactionId
    );
    if (existing) return existing;

    const newOrder = {
      id: `TC-${Math.floor(100000 + Math.random() * 900000)}`,
      userId,
      date: new Date().toISOString(),
      status: 'paid',
      paymentStatus: 'COMPLETED',
      ...payloadWithTotals,
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
  };

  try {
    const backendResult = await apiRequest(
      '/orders',
      {
        method: 'POST',
        body: JSON.stringify(payloadWithTotals),
        mockDelay: 220,
      },
      fallback
    );

    const merged = {
      ...payloadWithTotals,
      ...backendResult,
      date: backendResult?.createdAt || new Date().toISOString(),
      timeline: backendResult?.timeline || [
        { step: 'Order & PayPal Escrow Confirmed', date: 'Just now', completed: true },
        { step: 'AI Seller Verification Passed', date: 'Just now', completed: true },
        { step: 'Preparing Insured Dispatch', date: 'Pending', completed: false },
        { step: 'Estimated Delivery (2–4 Days)', date: 'Scheduled', completed: false },
      ],
    };

    // Save to Supabase if configured
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('orders').insert({
          id: merged.id,
          user_id: userId,
          status: merged.status || 'paid',
          payment_method: merged.paymentMethod || 'PayPal',
          paypal_transaction_id: merged.paypalTransactionId,
          buyer_protection_status: merged.buyerProtectionStatus || 'PayPal Sandbox capture completed',
          trust_score_at_purchase: merged.trustScoreAtPurchase || 88,
          subtotal: merged.subtotal || totalAmount,
          shipping: merged.shipping || 0,
          tax: merged.tax || 0,
          total: totalAmount,
          shipping_address: merged.shippingAddress || '',
          items: merged.items || [],
          timeline: merged.timeline || [],
        });
      } catch (err) {
        console.warn('Supabase order insert note:', err?.message || err);
      }
    }

    const current = loadUserOrders(userId);
    saveUserOrders(userId, [merged, ...current.filter((o) => o.id !== merged.id)]);
    return merged;
  } catch (err) {
    console.error('Failed to save order to backend:', err);
    return fallback();
  }
}
