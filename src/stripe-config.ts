export const stripeProducts = [
  {
    priceId: 'price_1QSample123456789', // This will be replaced with actual Stripe price ID
    name: 'Order Payment',
    description: 'Payment for your hotel order',
    mode: 'payment' as const,
  },
];

export const getStripeConfig = () => {
  return {
    publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
    products: stripeProducts,
  };
};