import productsData from '../data/products.json';
import { apiRequest } from './apiClient.js';
import { getPublicSellerProductsSync } from './sellerProductService.js';

/**
 * Product & Catalog Service
 * Target FastAPI endpoints:
 * - GET /api/v1/products
 * - GET /api/v1/products/{id}
 */

export function getAllProductsSync() {
  return [...getPublicSellerProductsSync(), ...productsData];
}

export async function getProducts(filters = {}) {
  const mockFallback = () => {
    let result = [...getAllProductsSync()];

    const {
      search = '',
      category = 'All',
      minTrustScore = 0,
      maxPrice = Infinity,
      verifiedOnly = false,
      sortBy = 'trust-desc',
    } = filters;

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.shortSummary.toLowerCase().includes(q) ||
          p.seller.name.toLowerCase().includes(q)
      );
    }

    if (category && category !== 'All') {
      result = result.filter((p) => p.category === category);
    }

    if (minTrustScore > 0) {
      result = result.filter((p) => p.trustScore >= minTrustScore);
    }

    if (Number.isFinite(maxPrice) && maxPrice > 0) {
      result = result.filter((p) => p.price <= maxPrice);
    }

    if (verifiedOnly) {
      result = result.filter((p) => p.seller.verified);
    }

    switch (sortBy) {
      case 'price-asc':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'rating-desc':
        result.sort((a, b) => b.rating - a.rating);
        break;
      case 'trust-desc':
      default:
        result.sort((a, b) => b.trustScore - a.trustScore);
        break;
    }

    return result;
  };

  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.category && filters.category !== 'All') params.set('category', filters.category);
  if (filters.minTrustScore) params.set('minTrustScore', filters.minTrustScore);
  if (filters.maxPrice) params.set('maxPrice', filters.maxPrice);
  if (filters.verifiedOnly) params.set('verifiedOnly', 'true');
  if (filters.sortBy) params.set('sortBy', filters.sortBy);
  const query = params.toString() ? `?${params.toString()}` : '';

  try {
    const data = await apiRequest(`/products${query}`, { method: 'GET', mockDelay: 120 }, mockFallback);
    // If backend returns populated catalog products, use them; if empty placeholder, fall back to catalog
    if (Array.isArray(data) && data.length > 0) {
      return data;
    }
    return mockFallback();
  } catch {
    return mockFallback();
  }
}

export async function getProductById(id) {
  const fallback = () => getAllProductsSync().find((p) => p.id === id) || null;
  try {
    const data = await apiRequest(
      `/products/${id}`,
      { method: 'GET', mockDelay: 100 },
      fallback
    );
    return data || fallback();
  } catch {
    return fallback();
  }
}

export function getCategoriesSync() {
  const categories = Array.from(new Set(getAllProductsSync().map((p) => p.category)));
  return ['All', ...categories];
}

export function getSaferAlternativeSync(product) {
  if (!product) return null;
  const catalog = getAllProductsSync();
  if (product.saferAlternativeId) {
    return catalog.find((p) => p.id === product.saferAlternativeId) || null;
  }
  return (
    catalog.find(
      (p) =>
        p.id !== product.id &&
        p.category === product.category &&
        p.trustScore >= 85
    ) || catalog.find((p) => p.trustScore >= 92)
  );
}
