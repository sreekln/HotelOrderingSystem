import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { useSubscription } from '../hooks/useSubscription';
import { useNotifications } from '../hooks/useNotifications';
import { LogOut, User, ChefHat, Settings, Bell } from 'lucide-react';
import { getProductByPriceId } from '../stripe-config';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, signOut } = useAuth();
  const { subscription, hasActiveSubscription } = useSubscription();
  const { notifications, unreadCount, clearNotifications, markAsRead } = useNotifications(user?.id, user?.role);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) {
    return <>{children}</>;
  }

  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications) {
      markAsRead();
    }
  };

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

              {/* Notification Bell - Only for Servers */}
              {user.role === 'server' && (
                <div className="relative" ref={notificationRef}>
                  <button
                    onClick={handleNotificationClick}
                    className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Notification Dropdown */}
                  {showNotifications && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden flex flex-col">
                      <div className="p-3 border-b border-gray-200 flex justify-between items-center">
                        <h3 className="font-semibold text-gray-900">Notifications</h3>
                        {notifications.length > 0 && (
                          <button
                            onClick={clearNotifications}
                            className="text-xs text-amber-600 hover:text-amber-700 font-medium"
                          >
                            Clear All
                          </button>
                        )}
                      </div>
                      <div className="overflow-y-auto flex-1">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center text-gray-500">
                            <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                            <p className="text-sm">No new notifications</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-gray-100">
                            {notifications.slice(0, 10).map((notification) => (
                              <div
                                key={notification.id}
                                className="p-3 hover:bg-gray-50 transition-colors"
                              >
                                <div className="flex items-start">
                                  <div className={`p-1.5 rounded-full mr-3 ${
                                    notification.type === 'part_order'
                                      ? 'bg-amber-100'
                                      : 'bg-blue-100'
                                  }`}>
                                    <Bell className={`h-3 w-3 ${
                                      notification.type === 'part_order'
                                        ? 'text-amber-600'
                                        : 'text-blue-600'
                                    }`} />
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm text-gray-900 font-medium">
                                      {notification.message}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      {notification.timestamp.toLocaleTimeString()}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
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