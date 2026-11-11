/**
 * Base API client for TrustCart AI.
 * Ready for FastAPI backend integration via VITE_API_BASE_URL.
 * Gracefully falls back to local mock handlers when backend is unavailable or in demo mode.
 */

const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {};
const API_BASE_URL = env.VITE_API_BASE_URL || '';
const USE_MOCK_FALLBACK = env.VITE_USE_MOCK_FALLBACK !== 'false';

export const delay = (ms = 220) => new Promise((resolve) => setTimeout(resolve, ms));

export async function apiRequest(endpoint, options = {}, mockHandler = null) {
  // Use mock handler directly when no FastAPI base URL is explicitly active in local demo mode
  if ((!API_BASE_URL || USE_MOCK_FALLBACK) && typeof mockHandler === 'function') {
    await delay(options.mockDelay ?? 180);
    return mockHandler();
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    if (USE_MOCK_FALLBACK && typeof mockHandler === 'function') {
      await delay(150);
      return mockHandler();
    }
    throw error;
  }
}

export const apiConfig = {
  baseUrl: API_BASE_URL || 'mock://local-trustcart',
  isMockMode: !API_BASE_URL || USE_MOCK_FALLBACK,
};
