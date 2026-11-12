/**
 * Base API client for TrustCart AI.
 * Communicates with FastAPI backend via VITE_API_BASE_URL (defaults to http://localhost:8000/api/v1).
 * Gracefully falls back to local mock handlers when backend is unavailable or offline.
 */

const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {};
export const API_BASE_URL = (env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1').replace(/\/+$/, '');
export const USE_MOCK_FALLBACK = env.VITE_USE_MOCK_FALLBACK !== 'false';

export const delay = (ms = 220) => new Promise((resolve) => setTimeout(resolve, ms));

export async function apiRequest(endpoint, options = {}, mockHandler = null) {
  // If no base URL is defined and mock handler is provided, use mock handler directly
  if (!API_BASE_URL && typeof mockHandler === 'function') {
    await delay(options.mockDelay ?? 180);
    return mockHandler();
  }

  try {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
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

export async function checkBackendHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      return { online: false, status: response.status };
    }
    const data = await response.json();
    return { online: true, ...data };
  } catch (error) {
    return { online: false, error: error.message };
  }
}

export const apiConfig = {
  baseUrl: API_BASE_URL,
  isMockMode: !API_BASE_URL,
  useMockFallback: USE_MOCK_FALLBACK,
};
