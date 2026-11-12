import { apiRequest } from './apiClient';

const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {};

export const paypalConfig = {
  clientId: env.VITE_PAYPAL_CLIENT_ID || '',
  environment: 'sandbox',
  currency: 'USD',
};

/**
 * Fetch and synchronize PayPal Sandbox configuration from backend if not already set in environment.
 */
export async function getPayPalConfig() {
  if (paypalConfig.clientId && paypalConfig.clientId !== 'your-paypal-sandbox-client-id') {
    return paypalConfig;
  }

  try {
    const remote = await apiRequest('/payments/paypal/config', { method: 'GET' });
    if (remote?.clientId) {
      paypalConfig.clientId = remote.clientId;
    }
  } catch (err) {
    console.warn('Could not fetch PayPal configuration from backend:', err?.message || err);
  }

  return paypalConfig;
}

export async function createPayPalOrder({ amount, subtotal, shipping, tax, items = [] }) {
  // Ensure we have a client ID before initiating an order
  if (!paypalConfig.clientId || paypalConfig.clientId === 'your-paypal-sandbox-client-id') {
    await getPayPalConfig();
  }

  if (!paypalConfig.clientId || paypalConfig.clientId === 'your-paypal-sandbox-client-id') {
    throw new Error('PayPal Sandbox Client ID is not configured. Please set VITE_PAYPAL_CLIENT_ID or configure backend.');
  }

  const result = await apiRequest(
    '/payments/paypal/create-order',
    {
      method: 'POST',
      body: JSON.stringify({
        amount: Number(Number(amount).toFixed(2)),
        currency: 'USD',
        subtotal: subtotal !== undefined ? Number(Number(subtotal).toFixed(2)) : undefined,
        shipping: shipping !== undefined ? Number(Number(shipping).toFixed(2)) : undefined,
        tax: tax !== undefined ? Number(Number(tax).toFixed(2)) : undefined,
        items,
      }),
    }
  );

  if (!result?.paypalOrderId) {
    throw new Error('PayPal did not return an order ID.');
  }

  return result;
}

export async function capturePayPalOrder({ paypalOrderId, fundingSource }) {
  if (!paypalOrderId) {
    throw new Error('PayPal order ID is missing.');
  }

  const result = await apiRequest(
    '/payments/paypal/capture-order',
    {
      method: 'POST',
      body: JSON.stringify({
        paypalOrderId,
        fundingSource,
      }),
    }
  );

  if (result?.status !== 'COMPLETED' || !result?.captureId) {
    throw new Error('PayPal payment capture was not completed.');
  }

  return result;
}
