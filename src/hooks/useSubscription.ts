// This hook has been removed - using PostgreSQL with Express API instead
// Subscription functionality moved to backend API
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