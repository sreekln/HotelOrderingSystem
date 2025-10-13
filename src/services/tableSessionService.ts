import { supabase } from '../lib/supabase';

export interface PartOrderItem {
  menu_item_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  special_instructions?: string;
}

export interface PartOrder {
  id?: string;
  table_session_id: string;
  server_id: string;
  table_number: number;
  status: 'draft' | 'sent_to_kitchen' | 'preparing' | 'ready' | 'served';
  printed_at?: string;
  items: PartOrderItem[];
  created_at?: string;
}

export interface TableSession {
  id?: string;
  table_number: number;
  server_id: string;
  customer_name?: string;
  status: 'active' | 'ready_to_close' | 'closed';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  total_amount: number;
  opened_at?: string;
  closed_at?: string;
  created_at?: string;
  part_orders?: any[];
}

export async function createTableSession(
  tableNumber: number,
  serverId: string,
  customerName?: string
): Promise<{ data: TableSession | null; error: any }> {
  try {
    // Check if there's already an active session for this table
    const { data: existingSessions } = await supabase
      .from('table_sessions')
      .select('*')
      .eq('table_number', tableNumber)
      .eq('status', 'active')
      .maybeSingle();

    if (existingSessions) {
      return { data: existingSessions, error: null };
    }

    // Create new session
    const { data, error } = await supabase
      .from('table_sessions')
      .insert({
        table_number: tableNumber,
        server_id: serverId,
        status: 'active',
        payment_status: 'pending',
        total_amount: 0
      })
      .select()
      .single();

    return { data, error };
  } catch (error) {
    console.error('Error creating table session:', error);
    return { data: null, error };
  }
}

export async function createPartOrder(
  partOrder: PartOrder
): Promise<{ data: any; error: any }> {
  try {
    // Insert part order
    const { data: partOrderData, error: partOrderError } = await supabase
      .from('part_orders')
      .insert({
        table_session_id: partOrder.table_session_id,
        server_id: partOrder.server_id,
        table_number: partOrder.table_number,
        status: partOrder.status,
        printed_at: partOrder.printed_at
      })
      .select()
      .single();

    if (partOrderError) {
      return { data: null, error: partOrderError };
    }

    // Insert part order items
    const items = partOrder.items.map(item => ({
      part_order_id: partOrderData.id,
      menu_item_id: item.menu_item_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.subtotal,
      special_instructions: item.special_instructions
    }));

    const { error: itemsError } = await supabase
      .from('part_order_items')
      .insert(items);

    if (itemsError) {
      // Rollback by deleting the part order
      await supabase.from('part_orders').delete().eq('id', partOrderData.id);
      return { data: null, error: itemsError };
    }

    // Update table session total
    const totalAmount = partOrder.items.reduce((sum, item) => sum + item.subtotal, 0);

    const { data: sessionData } = await supabase
      .from('table_sessions')
      .select('total_amount')
      .eq('id', partOrder.table_session_id)
      .single();

    if (sessionData) {
      await supabase
        .from('table_sessions')
        .update({
          total_amount: (sessionData.total_amount || 0) + totalAmount
        })
        .eq('id', partOrder.table_session_id);
    }

    return { data: partOrderData, error: null };
  } catch (error) {
    console.error('Error creating part order:', error);
    return { data: null, error };
  }
}

export async function getTableSessions(serverId?: string): Promise<{ data: any[] | null; error: any }> {
  try {
    let query = supabase
      .from('table_sessions')
      .select(`
        *,
        part_orders (
          *,
          part_order_items (
            *,
            menu_items (*)
          )
        )
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (serverId) {
      query = query.eq('server_id', serverId);
    }

    const { data, error } = await query;

    return { data, error };
  } catch (error) {
    console.error('Error fetching table sessions:', error);
    return { data: null, error };
  }
}

export async function updatePartOrderStatus(
  partOrderId: string,
  status: 'draft' | 'sent_to_kitchen' | 'preparing' | 'ready' | 'served'
): Promise<{ error: any }> {
  try {
    const { error } = await supabase
      .from('part_orders')
      .update({ status })
      .eq('id', partOrderId);

    return { error };
  } catch (error) {
    console.error('Error updating part order status:', error);
    return { error };
  }
}

export async function closeTableSession(
  sessionId: string
): Promise<{ error: any }> {
  try {
    const { error } = await supabase
      .from('table_sessions')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    return { error };
  } catch (error) {
    console.error('Error closing table session:', error);
    return { error };
  }
}

export async function updateTableSessionPaymentStatus(
  sessionId: string,
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded'
): Promise<{ error: any }> {
  try {
    const { error } = await supabase
      .from('table_sessions')
      .update({ payment_status: paymentStatus })
      .eq('id', sessionId);

    return { error };
  } catch (error) {
    console.error('Error updating payment status:', error);
    return { error };
  }
}
