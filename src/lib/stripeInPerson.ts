import { supabase } from './supabase';

export interface CreatePaymentIntentParams {
  amount: number;
  currency: string;
  orderId: string;
  capture_method?: 'automatic' | 'manual';
  payment_method_types?: string[];
}

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  client_secret?: string;
}

export const createPaymentIntent = async (params: CreatePaymentIntentParams): Promise<PaymentIntent> => {
  try {
    // Get the current session token
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      throw new Error('Failed to get authentication session');
    }
    
    if (!session?.access_token) {
      throw new Error('No authentication token available');
    }

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-payment-intent`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: params.amount,
        currency: params.currency,
        order_id: params.orderId,
        capture_method: params.capture_method || 'automatic',
        payment_method_types: params.payment_method_types || ['card_present'],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create payment intent');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw error;
  }
};

export const confirmPaymentIntent = async (paymentIntentId: string, paymentMethodId: string) => {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      throw new Error('Failed to get authentication session');
    }
    
    if (!session?.access_token) {
      throw new Error('No authentication token available');
    }

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-confirm-payment`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        payment_intent_id: paymentIntentId,
        payment_method_id: paymentMethodId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to confirm payment');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error confirming payment:', error);
    throw error;
  }
};