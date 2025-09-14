import { supabase } from './supabase';

export interface CreateCheckoutSessionParams {
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  mode: 'payment' | 'subscription';
  orderId?: string;
  amount?: number;
}

export const createCheckoutSession = async (params: CreateCheckoutSessionParams) => {
  try {
    // For mock auth, we'll simulate the token
    const mockToken = 'mock-auth-token';

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mockToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create checkout session');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
};

export const redirectToCheckout = (sessionId: string) => {
  // In a real implementation, you would use Stripe.js to redirect
  // For now, we'll simulate the redirect
  window.location.href = `https://checkout.stripe.com/pay/${sessionId}`;
};