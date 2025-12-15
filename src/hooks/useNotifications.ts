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
    console.log('[Notifications] Hook triggered - userId:', userId, 'userRole:', userRole);

    if (!userId) {
      console.log('[Notifications] ❌ Not enabled - no userId');
      return;
    }

    console.log('[Notifications] ⚡ Setting up subscriptions for user:', userId, 'role:', userRole);
    console.log('[Notifications] 🌐 Supabase client:', supabase);

    // Check auth status
    supabase.auth.getSession().then(({ data, error }) => {
      console.log('[Notifications] 🔐 Auth session:', {
        hasSession: !!data.session,
        userId: data.session?.user?.id,
        error
      });
    });

    // Log the realtime client state
    const realtimeClient = (supabase as any).realtime;
    console.log('[Notifications] 🔌 Realtime client:', realtimeClient);
    console.log('[Notifications] 🔌 Realtime endpoint:', realtimeClient?.endPoint);
    console.log('[Notifications] 🔌 Realtime connection:', realtimeClient?.conn);
    console.log('[Notifications] 🔌 Realtime connection state:', realtimeClient?.conn?.readyState);
    console.log('[Notifications] 🔌 WebSocket CONNECTING=0, OPEN=1, CLOSING=2, CLOSED=3');

    const channelName = `part_order_items_${Math.random().toString(36).substring(7)}`;
    console.log('[Notifications] Using channel:', channelName);

    const channel = supabase.channel(channelName);
    console.log('[Notifications] 📺 Channel created:', channel);
    console.log('[Notifications] 📺 Channel socket:', (channel as any).socket);

    // Test callback registration
    console.log('[Notifications] 🎤 Registering callback for postgres_changes...');

    const itemsSubscription = channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'part_order_items'
        },
        async (payload: any) => {
          console.log('[Notifications] 🔔 RAW EVENT RECEIVED:', payload);
          console.log('[Notifications] 🔔 Event type:', payload.eventType);
          console.log('[Notifications] 🔔 Table:', payload.table);
          console.log('[Notifications] 🔔 Schema:', payload.schema);

          try {
            const newStatus = payload.new?.status;
            const partOrderId = payload.new?.part_order_id;
            const menuItemId = payload.new?.menu_item_id;

            console.log('[Notifications] Event details:', {
              newStatus,
              partOrderId,
              menuItemId,
              hasOld: !!payload.old
            });

            if (!newStatus || !partOrderId || !menuItemId) {
              console.error('[Notifications] ❌ Missing required fields:', { newStatus, partOrderId, menuItemId });
              return;
            }

            console.log('[Notifications] 📞 Fetching part order...', partOrderId);
            const { data: partOrder, error: partOrderError } = await supabase
              .from('part_orders')
              .select('table_number')
              .eq('id', partOrderId)
              .maybeSingle();

            if (partOrderError) {
              console.error('[Notifications] ❌ Error fetching part order:', partOrderError);
              return;
            }

            if (!partOrder) {
              console.error('[Notifications] ❌ Part order not found:', partOrderId);
              return;
            }

            console.log('[Notifications] ✅ Part order found. Table:', partOrder.table_number);

            console.log('[Notifications] 📞 Fetching menu item...', menuItemId);
            const { data: menuItem, error: menuItemError } = await supabase
              .from('menu_items')
              .select('name')
              .eq('id', menuItemId)
              .maybeSingle();

            if (menuItemError) {
              console.error('[Notifications] ❌ Error fetching menu item:', menuItemError);
              return;
            }

            if (!menuItem) {
              console.error('[Notifications] ❌ Menu item not found:', menuItemId);
              return;
            }

            console.log('[Notifications] ✅ Menu item found:', menuItem.name);

            const statusMessages: Record<string, string> = {
              pending: 'is pending',
              preparing: 'is being prepared',
              ready: 'is ready',
              served: 'has been served'
            };

            const message = statusMessages[newStatus];

            if (!message) {
              console.error('[Notifications] ❌ No message for status:', newStatus);
              return;
            }

            const notification: Notification = {
              id: `${payload.new.id}-${Date.now()}`,
              type: 'item_status',
              message: `Table ${partOrder.table_number}: ${menuItem.name} ${message}`,
              timestamp: new Date(),
              tableNumber: partOrder.table_number
            };

            console.log('[Notifications] 🎉 CREATING NOTIFICATION:', notification);
            setNotifications(prev => {
              console.log('[Notifications] Current notifications:', prev.length);
              return [notification, ...prev];
            });
            setUnreadCount(prev => {
              const newCount = prev + 1;
              console.log('[Notifications] Unread count:', prev, '->', newCount);
              return newCount;
            });

            console.log('[Notifications] 🔊 Playing sound...');
            playNotificationSound();
          } catch (error) {
            console.error('[Notifications] ❌ ERROR in callback:', error);
          }
        }
      )
      .subscribe((status, err) => {
        console.log('[Notifications] 📡 Subscription status changed:', status);
        console.log('[Notifications] 📡 Full status object:', { status, err });
        if (err) {
          console.error('[Notifications] ❌ Subscription error:', err);
        }
        if (status === 'SUBSCRIBED') {
          console.log('[Notifications] ✅ Successfully subscribed to part_order_items updates!');
          console.log('[Notifications] ✅ Listening for UPDATE events on public.part_order_items');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Notifications] ❌ CHANNEL ERROR - subscription failed');
        } else if (status === 'TIMED_OUT') {
          console.error('[Notifications] ❌ TIMED OUT - subscription timeout');
        } else if (status === 'CLOSED') {
          console.warn('[Notifications] ⚠️ CLOSED - subscription closed');
        }
      });

    console.log('[Notifications] 🎯 Subscription object:', itemsSubscription);
    console.log('[Notifications] 🎯 Channel state:', itemsSubscription.state);

    // Log channel internals
    console.log('[Notifications] 🔧 Channel socket state:', (itemsSubscription as any).socket?.connectionState);
    console.log('[Notifications] 🔧 Channel subscriptions:', (itemsSubscription as any).bindings);

    // Log channel state changes
    setTimeout(() => {
      const socketObj = (itemsSubscription as any).socket;
      console.log('[Notifications] 🕐 After 1s - Channel state:', itemsSubscription.state);
      console.log('[Notifications] 🕐 After 1s - Socket connectionState:', socketObj?.connectionState);
      console.log('[Notifications] 🕐 After 1s - Socket readyState:', socketObj?.conn?.readyState);
      console.log('[Notifications] 🕐 After 1s - Socket isConnected:', socketObj?.isConnected?.());
    }, 1000);

    setTimeout(() => {
      const socketObj = (itemsSubscription as any).socket;
      console.log('[Notifications] 🕑 After 3s - Channel state:', itemsSubscription.state);
      console.log('[Notifications] 🕑 After 3s - Socket connectionState:', socketObj?.connectionState);
      console.log('[Notifications] 🕑 After 3s - Socket readyState:', socketObj?.conn?.readyState);
      console.log('[Notifications] 🕑 After 3s - Socket isConnected:', socketObj?.isConnected?.());
    }, 3000);

    setTimeout(() => {
      const socketObj = (itemsSubscription as any).socket;
      console.log('[Notifications] 🕕 After 5s - Channel state:', itemsSubscription.state);
      console.log('[Notifications] 🕕 After 5s - Socket connectionState:', socketObj?.connectionState);
      console.log('[Notifications] 🕕 After 5s - Socket readyState:', socketObj?.conn?.readyState);
      console.log('[Notifications] 🕕 After 5s - Socket isConnected:', socketObj?.isConnected?.());

      // Final diagnostic
      if (socketObj?.conn?.readyState === 1) {
        console.log('[Notifications] ✅ WebSocket is OPEN (readyState=1)');
      } else {
        console.error('[Notifications] ❌ WebSocket is NOT OPEN. ReadyState:', socketObj?.conn?.readyState);
      }
    }, 5000);

    return () => {
      console.log('[Notifications] 🧹 Cleaning up subscription, final state:', itemsSubscription.state);
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
