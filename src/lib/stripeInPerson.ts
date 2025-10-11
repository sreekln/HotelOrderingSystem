import { apiClient } from './api';

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
    // Use API client for payment intent creation
    const response = await apiClient.createPaymentIntent(params);
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response.data;
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw error;
  }
};

export const confirmPaymentIntent = async (paymentIntentId: string, paymentMethodId: string) => {
  try {
    // Use API client for payment confirmation
    const response = await apiClient.confirmPaymentIntent(paymentIntentId, paymentMethodId);
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response.data;
  } catch (error) {
    console.error('Error confirming payment:', error);
    throw error;
  }
};