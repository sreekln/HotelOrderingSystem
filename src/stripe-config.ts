export const stripeProducts = [
  {
    id: 'prod_T33Kdtcn464nUD',
    priceId: 'price_1S6xEARvejBl05RPmAS3zVJT',
    name: 'Payment Gateway',
    description: 'Secure payment processing for hotel orders',
    price: 10.00,
    mode: 'payment' as const,
  },
];

export const getStripeConfig = () => {
  return {
    publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
    products: stripeProducts,
  };
};

export const getProductById = (productId: string) => {
  return stripeProducts.find(product => product.id === productId);
};

export const getProductByPriceId = (priceId: string) => {
  return stripeProducts.find(product => product.priceId === priceId);
};