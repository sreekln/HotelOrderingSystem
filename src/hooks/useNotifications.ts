import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface Notification {
  id: string;
  type: 'part_order' | 'item_status';
  message: string;
  timestamp: Date;
  tableNumber?: string;
}

export const useNotifications = (userId?: string, userRole?: string) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastNotificationTime = useRef<number>(Date.now());

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZURE');
    }
  }, []);

  const playNotificationSound = () => {
    const now = Date.now();
    if (now - lastNotificationTime.current > 1000) {
      console.log('Playing notification sound');
      audioRef.current?.play().catch(err => console.error('Audio play failed:', err));
      lastNotificationTime.current = now;
    } else {
      console.log('Notification sound throttled (too soon since last sound)');
    }
  };

  useEffect(() => {
    if (!userId || userRole !== 'server') {
      console.log('Notifications not enabled - userId:', userId, 'userRole:', userRole);
      return;
    }

    console.log('Setting up notification subscriptions for user:', userId);

    const partOrdersSubscription = supabase
      .channel('part_orders_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'part_orders',
          filter: `server_id=eq.${userId}`
        },
        (payload) => {
          console.log('Part order updated:', payload);

          const newStatus = payload.new.status;
          const oldStatus = payload.old?.status;

          if (newStatus === oldStatus) {
            console.log('Part order status unchanged, skipping notification');
            return;
          }

          const tableNumber = payload.new.table_number;

          const statusMessages: Record<string, string> = {
            preparing: 'Kitchen started preparing order',
            ready: 'Order is ready to serve',
            served: 'Order marked as served'
          };

          const message = statusMessages[newStatus];
          console.log('Part order status message:', message, 'for status:', newStatus);

          if (message) {
            const notification: Notification = {
              id: `${payload.new.id}-${Date.now()}`,
              type: 'part_order',
              message: `Table ${tableNumber}: ${message}`,
              timestamp: new Date(),
              tableNumber
            };

            console.log('Creating part order notification:', notification);
            setNotifications(prev => [notification, ...prev]);
            setUnreadCount(prev => prev + 1);
            playNotificationSound();
          }
        }
      )
      .subscribe();

    const itemsSubscription = supabase
      .channel('part_order_items_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'part_order_items'
        },
        async (payload) => {
          try {
            console.log('Part order item updated:', payload);

            const newStatus = payload.new.status;
            const oldStatus = payload.old?.status;

            if (newStatus === oldStatus) {
              console.log('Status unchanged, skipping notification');
              return;
            }

            const partOrderId = payload.new.part_order_id;
            const menuItemId = payload.new.menu_item_id;

            console.log('Fetching part order:', partOrderId);
            const { data: partOrder, error: partOrderError } = await supabase
              .from('part_orders')
              .select('table_number, server_id')
              .eq('id', partOrderId)
              .maybeSingle();

            if (partOrderError) {
              console.error('Error fetching part order:', partOrderError);
              return;
            }

            console.log('Part order data:', partOrder);

            if (partOrder && partOrder.server_id === userId) {
              console.log('Fetching menu item:', menuItemId);
              const { data: menuItem, error: menuItemError } = await supabase
                .from('menu_items')
                .select('name')
                .eq('id', menuItemId)
                .maybeSingle();

              if (menuItemError) {
                console.error('Error fetching menu item:', menuItemError);
                return;
              }

              console.log('Menu item data:', menuItem);

              const statusMessages: Record<string, string> = {
                preparing: 'is being prepared',
                ready: 'is ready',
                served: 'has been served'
              };

              const message = statusMessages[newStatus];
              console.log('Status message:', message, 'for status:', newStatus);

              if (message && menuItem) {
                const notification: Notification = {
                  id: `${payload.new.id}-${Date.now()}`,
                  type: 'item_status',
                  message: `Table ${partOrder.table_number}: ${menuItem.name} ${message}`,
                  timestamp: new Date(),
                  tableNumber: partOrder.table_number
                };

                console.log('Creating notification:', notification);
                setNotifications(prev => [notification, ...prev]);
                setUnreadCount(prev => prev + 1);
                playNotificationSound();
              } else {
                console.log('No notification created - message:', message, 'menuItem:', menuItem);
              }
            } else {
              console.log('Part order not for this user or not found');
            }
          } catch (error) {
            console.error('Error in part_order_items subscription:', error);
          }
        }
      )
      .subscribe();

    return () => {
      partOrdersSubscription.unsubscribe();
      itemsSubscription.unsubscribe();
    };
  }, [userId, userRole]);

  const clearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  const markAsRead = () => {
    setUnreadCount(0);
  };

  return {
    notifications,
    unreadCount,
    clearNotifications,
    markAsRead
  };
};
