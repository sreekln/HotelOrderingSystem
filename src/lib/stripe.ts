import { apiClient } from './api';

export interface CreateCheckoutSessionParams {
  price_id: string;
  success_url: string;
  cancel_url: string;
  mode: 'payment' | 'subscription';
  orderId?: string;
  amount?: number;
}

export const createCheckoutSession = async (params: CreateCheckoutSessionParams) => {
  try {
    // Use API client for checkout session creation
    const response = await apiClient.createCheckoutSession(params);
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response.data;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
};

export const redirectToCheckout = (sessionId: string) => {
  // Redirect to Stripe checkout
  window.location.href = `https://checkout.stripe.com/pay/${sessionId}`;
};