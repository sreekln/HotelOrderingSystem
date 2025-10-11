import React from 'react';
import { useAuth } from '../lib/mockAuth';
import { useSubscription } from '../hooks/useSubscription';
import { LogOut, User, ChefHat, Settings } from 'lucide-react';
import { getProductByPriceId } from '../stripe-config';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, signOut } = useAuth();
  const { subscription, hasActiveSubscription } = useSubscription();

  if (!user) {
    return <>{children}</>;
  }

  const getRoleIcon = () => {
    switch (user.role) {
      case 'kitchen':
        return <ChefHat className="h-5 w-5" />;
      case 'admin':
        return <Settings className="h-5 w-5" />;
      default:
        return <User className="h-5 w-5" />;
    }
  };

  const getRoleColor = () => {
    switch (user.role) {
      case 'kitchen':
        return 'text-orange-600 bg-orange-50';
      case 'admin':
        return 'text-purple-600 bg-purple-50';
      case 'server':
      default:
        return 'text-blue-600 bg-blue-50';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-gray-900">Lush & Hush</h1>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getRoleColor()}`}>
                {getRoleIcon()}
                <span className="ml-2 capitalize">{user.role}</span>
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {user.full_name}</span>
              
              {/* Subscription Status */}
              {subscription && (
                <div className="text-xs">
                  {hasActiveSubscription() ? (
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full">
                      {getProductByPriceId(subscription.price_id || '')?.name || 'Active Plan'}
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                      No Active Plan
                    </span>
                  )}
                </div>
              )}
              
              <button
                onClick={signOut}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;