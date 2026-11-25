import { apiRequest } from './apiClient';

/**
 * Real Gemini AI & Risk Analysis Service
 * Communicates with backend endpoints powered by Google Gemini:
 * - POST /api/v1/ai/assistant
 * - POST /api/v1/ai/risk-analysis
 * - POST /api/v1/ai/compare
 *
 * NOTE: Mock/fake AI responses have been removed. If the backend or Gemini service
 * is unreachable or unconfigured, real errors are propagated to the UI.
 */

export async function askShoppingAssistant(query) {
  const trimmed = (query || '').trim();
  if (!trimmed) {
    throw new Error('Please enter a search query for the AI Shopping Assistant.');
  }

  return await apiRequest('/ai/assistant', {
    method: 'POST',
    body: JSON.stringify({ query: trimmed }),
  });
}

export async function analyzeListingRisk(input = {}) {
  return await apiRequest('/ai/risk-analysis', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function compareProductsWithAI(products = []) {
  if (!products || !products.length) return null;

  return await apiRequest('/ai/compare', {
    method: 'POST',
    body: JSON.stringify({ productIds: products.map((p) => p.id) }),
  });
}
