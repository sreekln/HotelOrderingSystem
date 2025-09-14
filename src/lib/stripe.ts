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
    // Get the current session token
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      throw new Error('Failed to get authentication session');
    }
    
    if (!session?.access_token) {
      throw new Error('No authentication token available');
    }

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
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