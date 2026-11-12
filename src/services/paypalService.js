
import { apiRequest } from './apiClient';

const env = import.meta.env || {};

export const paypalConfig = {
  clientId: env.VITE_PAYPAL_CLIENT_ID,
  environment: 'sandbox',
  currency: 'USD',
};

export async function createPayPalOrder({ amount, items = [] }) {
  if (!paypalConfig.clientId) {
    throw new Error('PayPal Sandbox Client ID is missing.');
  }

  const result = await apiRequest(
    '/payments/paypal/create-order',
    {
      method: 'POST',
      body: JSON.stringify({
        amount,
        currency: 'USD',
        items,
      }),
    }
  );

  if (!result?.paypalOrderId) {
    throw new Error('PayPal did not return an order ID.');
  }

  return result;
}

export async function capturePayPalOrder({ paypalOrderId }) {
  if (!paypalOrderId) {
    throw new Error('PayPal order ID is missing.');
  }

  const result = await apiRequest(
    '/payments/paypal/capture-order',
    {
      method: 'POST',
      body: JSON.stringify({ paypalOrderId }),
    }
  );

  if (result?.status !== 'COMPLETED' || !result?.captureId) {
    throw new Error('PayPal payment capture was not completed.');
  }

  return result;
}
