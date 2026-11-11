import { apiRequest } from './apiClient';

/**
 * PayPal Sandbox Payment Service
 * Ready for FastAPI PayPal Orders v2 REST API + @paypal/react-paypal-js integration:
 * - POST /api/v1/payments/paypal/create-order
 * - POST /api/v1/payments/paypal/capture-order
 */

const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {};

export const paypalConfig = {
  clientId: env.VITE_PAYPAL_CLIENT_ID || 'sb-trustcart-demo-client-id',
  environment: 'sandbox',
  currency: 'USD',
};

export async function createPayPalOrder({ amount, items }) {
  return apiRequest(
    '/payments/paypal/create-order',
    {
      method: 'POST',
      body: JSON.stringify({ amount, currency: 'USD', items }),
      mockDelay: 320,
    },
    () => {
      const token = Math.random().toString(36).substring(2, 10).toUpperCase();
      return {
        paypalOrderId: `PAYID-SB-${token}`,
        status: 'CREATED',
        environment: 'sandbox',
        amount: Number(amount.toFixed(2)),
        currency: 'USD',
        buyerProtectionEligible: true,
      };
    }
  );
}

export async function capturePayPalOrder({ paypalOrderId, fundingSource }) {
  return apiRequest(
    '/payments/paypal/capture-order',
    {
      method: 'POST',
      body: JSON.stringify({ paypalOrderId, fundingSource }),
      mockDelay: 420,
    },
    () => {
      const captureCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      return {
        paypalOrderId,
        captureId: `CAP-${captureCode}`,
        status: 'COMPLETED',
        fundingSource: fundingSource || 'PayPal Sandbox (Visa •••• 4242)',
        capturedAt: new Date().toISOString(),
        buyerProtectionStatus: 'Active — Protected up to $2,500',
      };
    }
  );
}
