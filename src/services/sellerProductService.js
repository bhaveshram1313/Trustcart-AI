import { isSupabaseConfigured, supabase } from '../lib/supabaseClient.js';
import { getCurrentUser } from './authService.js';

/**
 * Seller Product Management Service
 *
 * Security model:
 * - Never trusts a sellerId supplied by frontend forms or payloads.
 * - Resolves the authenticated session user via getAuthenticatedSeller()
 *   (supabase.auth.getUser() in Supabase mode, active session in Dev mode).
 * - Enforces accountType === 'seller' and strict ownership (seller_id === sessionUser.id)
 *   on every read/create/update/delete operation alongside Supabase RLS policies.
 */

const SELLER_PRODUCTS_KEY = 'trustcart_seller_products_v1';

function readStoredSellerProducts() {
  try {
    const raw = localStorage.getItem(SELLER_PRODUCTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStoredSellerProducts(items) {
  localStorage.setItem(SELLER_PRODUCTS_KEY, JSON.stringify(items));
}

function generateProductId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `sp_${crypto.randomUUID()}`;
  }
  return `sp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

async function requireAuthenticatedSeller() {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) {
      throw new Error('Unauthorized: Please log in with a valid seller session.');
    }
    const current = await getCurrentUser();
    if (!current || current.id !== data.user.id || current.accountType !== 'seller') {
      throw new Error('Forbidden: Only verified seller accounts can perform this action.');
    }
    return current;
  }

  const current = await getCurrentUser();
  if (!current) {
    throw new Error('Unauthorized: Authentication required.');
  }
  if (current.accountType !== 'seller') {
    throw new Error('Forbidden: Buyer accounts cannot manage seller products.');
  }
  return current;
}

function normalizeSpecs(specsInput) {
  if (!specsInput || typeof specsInput !== 'object') return {};
  const clean = {};
  Object.entries(specsInput).forEach(([key, val]) => {
    const k = String(key || '').trim();
    const v = String(val || '').trim();
    if (k && v) clean[k] = v;
  });
  return clean;
}

function toCatalogProductShape(record) {
  const specs = normalizeSpecs(record.specs);
  const price = Number(record.price) || 0;
  const stock = Number(record.stock ?? 0);
  const trustScore = Number(record.trustScore ?? 88);
  const shopDisplay = record.sellerShopName || record.sellerFullName || 'TrustCart Seller';

  return {
    id: record.id,
    sellerId: record.sellerId,
    name: record.name,
    brand: shopDisplay,
    category: record.category,
    price,
    originalPrice: price,
    marketMedianPrice: price,
    rating: 4.8,
    reviewCount: 1,
    verifiedPurchasePct: 100,
    trustScore,
    riskLevel: trustScore >= 85 ? 'safe' : trustScore >= 65 ? 'caution' : 'high',
    image: record.imageUrl || '/images/products/dock.svg',
    imageUrl: record.imageUrl || '/images/products/dock.svg',
    description: record.description,
    shortSummary: record.description,
    aiVerdict: `Listed directly by registered TrustCart Seller "${shopDisplay}". Verified seller ownership attached.`,
    highlights: [
      `In stock: ${stock} unit${stock === 1 ? '' : 's'} ready to ship`,
      `Sold directly by ${shopDisplay}`,
      'Protected by TrustCart AI Seller Verification & PayPal Escrow',
    ],
    stock,
    seller: {
      name: shopDisplay,
      fullName: record.sellerFullName || '',
      email: record.sellerEmail || '',
      phone: record.sellerPhone || '',
      businessAddress: record.sellerBusinessAddress || '',
      verified: true,
      rating: 4.9,
      accountAgeMonths: 12,
      fulfillment: 'Direct Seller Fulfillment',
      location: record.sellerBusinessAddress || 'Verified Seller Hub',
      returnWindowDays: 30,
      authorizedDealer: true,
    },
    specs,
    riskAnalysis: {
      priceAnomaly: 90,
      sellerCredibility: 88,
      reviewAuthenticity: 86,
      counterfeitSignal: 92,
      returnProtection: 88,
      indicators: [
        {
          title: 'Verified registered seller account',
          status: 'pass',
          detail: `Listing ownership verified for ${shopDisplay}.`,
        },
        {
          title: 'Active inventory confirmed',
          status: stock > 0 ? 'pass' : 'warning',
          detail: stock > 0 ? `${stock} unit(s) currently in stock.` : 'Currently out of stock.',
        },
      ],
    },
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    isSellerListing: true,
  };
}

function mapSupabaseProductRow(row) {
  return toCatalogProductShape({
    id: row.id,
    sellerId: row.seller_id,
    name: row.name,
    category: row.category,
    description: row.description,
    price: row.price,
    imageUrl: row.image_url,
    specs: row.specifications ?? row.specs,
    stock: row.stock,
    trustScore: row.trust_score,
    sellerShopName: row.seller_shop_name || 'TrustCart Seller',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export function getPublicSellerProductsSync() {
  return readStoredSellerProducts().map(toCatalogProductShape);
}

export async function getMySellerProducts() {
  const seller = await requireAuthenticatedSeller();

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('seller_id', seller.id)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(mapSupabaseProductRow);
  }

  return readStoredSellerProducts()
    .filter((item) => item.sellerId === seller.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map(toCatalogProductShape);
}

export async function getMySellerProductById(productId) {
  const seller = await requireAuthenticatedSeller();

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .eq('seller_id', seller.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) {
      throw new Error('Product not found or you do not have permission to access it.');
    }
    return mapSupabaseProductRow(data);
  }

  const all = readStoredSellerProducts();
  const found = all.find((p) => p.id === productId);
  if (!found) {
    throw new Error('Product not found.');
  }
  if (found.sellerId !== seller.id) {
    throw new Error('Forbidden: You can only view or edit products owned by your account.');
  }
  return toCatalogProductShape(found);
}

export async function createSellerProduct(payload) {
  // Always derive seller identity from verified session, NEVER from payload.sellerId
  const seller = await requireAuthenticatedSeller();

  const name = (payload.name || '').trim();
  const category = (payload.category || '').trim();
  const description = (payload.description || '').trim();
  const price = Number(payload.price);
  const stock = Number.parseInt(payload.stock, 10);
  const imageUrl = (payload.imageUrl || '').trim() || '/images/products/dock.svg';
  const specs = normalizeSpecs(payload.specs);

  if (name.length < 3) {
    throw new Error('Product name must be at least 3 characters.');
  }
  if (!category) {
    throw new Error('Please choose a product category.');
  }
  if (description.length < 10) {
    throw new Error('Please enter a product description (at least 10 characters).');
  }
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error('Price must be greater than $0.00.');
  }
  if (!Number.isInteger(stock) || stock < 0) {
    throw new Error('Stock quantity must be a whole number (0 or greater).');
  }

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('products')
      .insert({
        seller_id: seller.id,
        name,
        category,
        description,
        price: Number(price.toFixed(2)),
        image_url: imageUrl,
        specifications: specs,
        stock,
        trust_score: 89,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return mapSupabaseProductRow(data);
  }

  const now = new Date().toISOString();
  const record = {
    id: generateProductId(),
    sellerId: seller.id,
    sellerFullName: seller.fullName,
    sellerEmail: seller.email,
    sellerShopName: seller.sellerProfile?.shopName || `${seller.fullName}'s Shop`,
    sellerPhone: seller.sellerProfile?.phone || '',
    sellerBusinessAddress: seller.sellerProfile?.businessAddress || '',
    name,
    category,
    description,
    price: Number(price.toFixed(2)),
    imageUrl,
    specs,
    stock,
    trustScore: 89,
    createdAt: now,
    updatedAt: now,
  };

  const current = readStoredSellerProducts();
  writeStoredSellerProducts([record, ...current]);
  return toCatalogProductShape(record);
}

export async function updateSellerProduct(productId, payload) {
  const seller = await requireAuthenticatedSeller();

  const name = (payload.name || '').trim();
  const category = (payload.category || '').trim();
  const description = (payload.description || '').trim();
  const price = Number(payload.price);
  const stock = Number.parseInt(payload.stock, 10);
  const imageUrl = (payload.imageUrl || '').trim() || '/images/products/dock.svg';
  const specs = normalizeSpecs(payload.specs);

  if (name.length < 3) {
    throw new Error('Product name must be at least 3 characters.');
  }
  if (!category) {
    throw new Error('Please choose a product category.');
  }
  if (description.length < 10) {
    throw new Error('Please enter a product description (at least 10 characters).');
  }
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error('Price must be greater than $0.00.');
  }
  if (!Number.isInteger(stock) || stock < 0) {
    throw new Error('Stock quantity must be a whole number (0 or greater).');
  }

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('products')
      .update({
        name,
        category,
        description,
        price: Number(price.toFixed(2)),
        image_url: imageUrl,
        specifications: specs,
        stock,
        updated_at: new Date().toISOString(),
      })
      .eq('id', productId)
      .eq('seller_id', seller.id)
      .select()
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) {
      throw new Error('Forbidden or not found: You can only update your own products.');
    }
    return mapSupabaseProductRow(data);
  }

  const all = readStoredSellerProducts();
  const idx = all.findIndex((p) => p.id === productId);
  if (idx === -1) {
    throw new Error('Product not found.');
  }
  if (all[idx].sellerId !== seller.id) {
    throw new Error('Forbidden: You cannot edit another seller’s product.');
  }

  const updated = {
    ...all[idx],
    sellerFullName: seller.fullName,
    sellerEmail: seller.email,
    sellerShopName: seller.sellerProfile?.shopName || all[idx].sellerShopName,
    sellerPhone: seller.sellerProfile?.phone || '',
    sellerBusinessAddress: seller.sellerProfile?.businessAddress || '',
    name,
    category,
    description,
    price: Number(price.toFixed(2)),
    imageUrl,
    specs,
    stock,
    updatedAt: new Date().toISOString(),
  };

  all[idx] = updated;
  writeStoredSellerProducts(all);
  return toCatalogProductShape(updated);
}

export async function deleteSellerProduct(productId) {
  const seller = await requireAuthenticatedSeller();

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId)
      .eq('seller_id', seller.id)
      .select('id');

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) {
      throw new Error('Forbidden or not found: You can only delete your own products.');
    }
    return true;
  }

  const all = readStoredSellerProducts();
  const found = all.find((p) => p.id === productId);
  if (!found) {
    throw new Error('Product not found.');
  }
  if (found.sellerId !== seller.id) {
    throw new Error('Forbidden: You cannot delete another seller’s product.');
  }

  writeStoredSellerProducts(all.filter((p) => p.id !== productId));
  return true;
}
