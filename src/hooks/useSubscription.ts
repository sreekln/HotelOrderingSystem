// Subscription functionality has been removed
// This application now uses PostgreSQL with Express.js API
// Payment functionality is handled through Stripe integration

export const useSubscription = () => {
  return {
    subscription: null,
    loading: false,
    error: null,
    hasActiveSubscription: () => false,
    isSubscriptionCanceled: () => false,
    refetch: () => Promise.resolve(),
  };
};