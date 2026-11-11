import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getAllProductsSync } from '../services/productService';
import { createOrder, getOrders } from '../services/orderService';
import { useAuth } from './AuthContext';

const TrustCartContext = createContext(null);

const DEFAULT_COMPARE_IDS = ['sony-wh1000xm5', 'bose-qc-ultra', 'airpods-pro-clone-risk'];

function getCartKey(userId) {
  return `trustcart_cart_v2_${userId}`;
}

function getCompareKey(userId) {
  return `trustcart_compare_v2_${userId || 'guest'}`;
}

function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

export function TrustCartProvider({ children }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const userId = user?.id || null;

  const [cartItems, setCartItems] = useState([]);
  const [compareIds, setCompareIds] = useState(() =>
    readStorage(getCompareKey(null), DEFAULT_COMPARE_IDS).slice(0, 3)
  );
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [catalogVersion, setCatalogVersion] = useState(0);

  const refreshCatalog = useCallback(() => {
    setCatalogVersion((v) => v + 1);
  }, []);

  const allProducts = useMemo(() => getAllProductsSync(), [catalogVersion]);

  // Load user-specific cart whenever authenticated user changes
  useEffect(() => {
    if (!userId) {
      setCartItems([]);
      return;
    }
    const stored = readStorage(getCartKey(userId), []);
    setCartItems(Array.isArray(stored) ? stored : []);
  }, [userId]);

  // Persist user-specific cart
  useEffect(() => {
    if (!userId) return;
    try {
      localStorage.setItem(getCartKey(userId), JSON.stringify(cartItems));
    } catch {
      // Ignore storage errors
    }
  }, [cartItems, userId]);

  // Load & persist comparison slots per user/guest
  useEffect(() => {
    const stored = readStorage(getCompareKey(userId), DEFAULT_COMPARE_IDS);
    setCompareIds(Array.isArray(stored) ? stored.slice(0, 3) : DEFAULT_COMPARE_IDS);
  }, [userId]);

  useEffect(() => {
    try {
      localStorage.setItem(getCompareKey(userId), JSON.stringify(compareIds));
    } catch {
      // Ignore storage errors
    }
  }, [compareIds, userId]);

  // Load orders strictly for the authenticated user
  useEffect(() => {
    let active = true;
    if (!userId) {
      setOrders([]);
      setOrdersLoading(false);
      return;
    }

    setOrdersLoading(true);
    getOrders(userId)
      .then((list) => {
        if (active) setOrders(list);
      })
      .finally(() => {
        if (active) setOrdersLoading(false);
      });

    return () => {
      active = false;
    };
  }, [userId]);

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToast({ id, message, type });
    setTimeout(() => {
      setToast((curr) => (curr && curr.id === id ? null : curr));
    }, 3200);
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  const detailedCartItems = useMemo(() => {
    return cartItems
      .map((entry) => {
        const product = allProducts.find((p) => p.id === entry.productId);
        if (!product) return null;
        return {
          ...entry,
          product,
          lineTotal: product.price * entry.quantity,
        };
      })
      .filter(Boolean);
  }, [cartItems, allProducts]);

  const cartCount = useMemo(
    () => detailedCartItems.reduce((sum, item) => sum + item.quantity, 0),
    [detailedCartItems]
  );

  const cartSubtotal = useMemo(
    () => detailedCartItems.reduce((sum, item) => sum + item.lineTotal, 0),
    [detailedCartItems]
  );

  const compareProducts = useMemo(
    () =>
      compareIds
        .map((id) => allProducts.find((p) => p.id === id))
        .filter(Boolean),
    [compareIds, allProducts]
  );

  const addToCart = useCallback(
    (productId, quantity = 1) => {
      if (!userId) {
        showToast('Please log in to add items to your personal cart.', 'warning');
        navigate('/login', { state: { from: location } });
        return false;
      }

      const product = allProducts.find((p) => p.id === productId);
      if (!product) return false;
      setCartItems((prev) => {
        const existing = prev.find((item) => item.productId === productId);
        if (existing) {
          return prev.map((item) =>
            item.productId === productId
              ? { ...item, quantity: item.quantity + quantity }
              : item
          );
        }
        return [...prev, { productId, quantity }];
      });
      if (product.trustScore < 60) {
        showToast(`Added "${product.name}" — Note: High Risk Alert active`, 'warning');
      } else {
        showToast(`Added "${product.name}" to cart`, 'success');
      }
      return true;
    },
    [userId, allProducts, showToast, navigate, location]
  );

  const updateCartQuantity = useCallback(
    (productId, quantity) => {
      if (!userId) return;
      if (quantity <= 0) {
        setCartItems((prev) => prev.filter((item) => item.productId !== productId));
        return;
      }
      setCartItems((prev) =>
        prev.map((item) =>
          item.productId === productId ? { ...item, quantity } : item
        )
      );
    },
    [userId]
  );

  const removeFromCart = useCallback(
    (productId) => {
      if (!userId) return;
      setCartItems((prev) => prev.filter((item) => item.productId !== productId));
      showToast('Item removed from cart', 'info');
    },
    [userId, showToast]
  );

  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  const toggleCompare = useCallback(
    (productId) => {
      const product = allProducts.find((p) => p.id === productId);
      setCompareIds((prev) => {
        if (prev.includes(productId)) {
          showToast(`Removed "${product?.name || 'item'}" from comparison`, 'info');
          return prev.filter((id) => id !== productId);
        }
        if (prev.length >= 3) {
          showToast('Comparison limit reached (max 3 products). Remove one first.', 'warning');
          return prev;
        }
        showToast(`Added "${product?.name || 'item'}" to comparison (${prev.length + 1}/3)`, 'success');
        return [...prev, productId];
      });
    },
    [allProducts, showToast]
  );

  const setCompareSlot = useCallback((slotIndex, productId) => {
    setCompareIds((prev) => {
      const next = [...prev];
      if (!productId) {
        next.splice(slotIndex, 1);
        return next;
      }
      const existingIdx = next.indexOf(productId);
      if (existingIdx !== -1 && existingIdx !== slotIndex) {
        next.splice(existingIdx, 1);
      }
      if (slotIndex < next.length) {
        next[slotIndex] = productId;
      } else {
        next.push(productId);
      }
      return next.slice(0, 3);
    });
  }, []);

  const clearCompare = useCallback(() => {
    setCompareIds([]);
    showToast('Comparison cleared', 'info');
  }, [showToast]);

  const recordCompletedOrder = useCallback(
    async (orderPayload) => {
      if (!userId) {
        throw new Error('Authentication required to complete an order.');
      }
      const saved = await createOrder(orderPayload, userId);
      setOrders((prev) => [saved, ...prev]);
      clearCart();
      showToast(`Order ${saved.id} confirmed via PayPal Sandbox!`, 'success');
      return saved;
    },
    [userId, clearCart, showToast]
  );

  const value = {
    allProducts,
    refreshCatalog,
    cartItems: detailedCartItems,
    cartCount,
    cartSubtotal,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    compareIds,
    compareProducts,
    toggleCompare,
    setCompareSlot,
    clearCompare,
    orders,
    ordersLoading,
    recordCompletedOrder,
    toast,
    showToast,
    dismissToast,
  };

  return (
    <TrustCartContext.Provider value={value}>
      {children}
    </TrustCartContext.Provider>
  );
}

export function useTrustCart() {
  const ctx = useContext(TrustCartContext);
  if (!ctx) {
    throw new Error('useTrustCart must be used within TrustCartProvider');
  }
  return ctx;
}
