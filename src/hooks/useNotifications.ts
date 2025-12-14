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
      audioRef.current?.play().catch(err => console.log('Audio play failed:', err));
      lastNotificationTime.current = now;
    }
  };

  useEffect(() => {
    if (!userId || userRole !== 'server') return;

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
          const newStatus = payload.new.status;
          const tableNumber = payload.new.table_number;

          const statusMessages: Record<string, string> = {
            preparing: 'Kitchen started preparing order',
            ready: 'Order is ready to serve',
            served: 'Order marked as served'
          };

          const message = statusMessages[newStatus];
          if (message) {
            const notification: Notification = {
              id: `${payload.new.id}-${Date.now()}`,
              type: 'part_order',
              message: `Table ${tableNumber}: ${message}`,
              timestamp: new Date(),
              tableNumber
            };

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
          const newStatus = payload.new.status;
          const partOrderId = payload.new.part_order_id;

          const { data: partOrder } = await supabase
            .from('part_orders')
            .select('table_number, server_id')
            .eq('id', partOrderId)
            .maybeSingle();

          if (partOrder && partOrder.server_id === userId) {
            const { data: menuItem } = await supabase
              .from('menu_items')
              .select('name')
              .eq('id', payload.new.menu_item_id)
              .maybeSingle();

            const statusMessages: Record<string, string> = {
              preparing: 'is being prepared',
              ready: 'is ready',
              served: 'has been served'
            };

            const message = statusMessages[newStatus];
            if (message && menuItem) {
              const notification: Notification = {
                id: `${payload.new.id}-${Date.now()}`,
                type: 'item_status',
                message: `Table ${partOrder.table_number}: ${menuItem.name} ${message}`,
                timestamp: new Date(),
                tableNumber: partOrder.table_number
              };

              setNotifications(prev => [notification, ...prev]);
              setUnreadCount(prev => prev + 1);
              playNotificationSound();
            }
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
