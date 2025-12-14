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
      console.log('[Notifications] Not enabled - userId:', userId, 'userRole:', userRole);
      return;
    }

    console.log('[Notifications] Setting up subscriptions for user:', userId);

    const itemsSubscription = supabase
      .channel(`part_order_items_changes_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'part_order_items'
        },
        async (payload) => {
          try {
            console.log('[Notifications] Part order item UPDATE event received:', {
              id: payload.new.id,
              oldStatus: payload.old?.status,
              newStatus: payload.new.status,
              partOrderId: payload.new.part_order_id
            });

            const newStatus = payload.new.status;
            const oldStatus = payload.old?.status;

            if (!newStatus || newStatus === oldStatus) {
              console.log('[Notifications] Status unchanged, skipping');
              return;
            }

            const partOrderId = payload.new.part_order_id;
            const menuItemId = payload.new.menu_item_id;

            if (!partOrderId || !menuItemId) {
              console.error('[Notifications] Missing partOrderId or menuItemId');
              return;
            }

            console.log('[Notifications] Fetching part order:', partOrderId);
            const { data: partOrder, error: partOrderError } = await supabase
              .from('part_orders')
              .select('table_number, server_id')
              .eq('id', partOrderId)
              .maybeSingle();

            if (partOrderError) {
              console.error('[Notifications] Error fetching part order:', partOrderError);
              return;
            }

            if (!partOrder) {
              console.log('[Notifications] Part order not found:', partOrderId);
              return;
            }

            console.log('[Notifications] Part order found:', {
              tableNumber: partOrder.table_number,
              serverId: partOrder.server_id,
              currentUserId: userId
            });

            console.log('[Notifications] Fetching menu item:', menuItemId);
            const { data: menuItem, error: menuItemError } = await supabase
              .from('menu_items')
              .select('name')
              .eq('id', menuItemId)
              .maybeSingle();

            if (menuItemError) {
              console.error('[Notifications] Error fetching menu item:', menuItemError);
              return;
            }

            if (!menuItem) {
              console.log('[Notifications] Menu item not found:', menuItemId);
              return;
            }

            console.log('[Notifications] Menu item found:', menuItem.name);

            const statusMessages: Record<string, string> = {
              pending: 'is pending',
              preparing: 'is being prepared',
              ready: 'is ready',
              served: 'has been served'
            };

            const message = statusMessages[newStatus];

            if (!message) {
              console.log('[Notifications] No message for status:', newStatus);
              return;
            }

            const notification: Notification = {
              id: `${payload.new.id}-${Date.now()}`,
              type: 'item_status',
              message: `Table ${partOrder.table_number}: ${menuItem.name} ${message}`,
              timestamp: new Date(),
              tableNumber: partOrder.table_number
            };

            console.log('[Notifications] ✅ Creating notification:', notification);
            setNotifications(prev => [notification, ...prev]);
            setUnreadCount(prev => prev + 1);
            playNotificationSound();
          } catch (error) {
            console.error('[Notifications] Error in subscription callback:', error);
          }
        }
      )
      .subscribe((status) => {
        console.log('[Notifications] Subscription status:', status);
      });

    return () => {
      console.log('[Notifications] Cleaning up subscription');
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
