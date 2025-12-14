import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, AlertCircle, ChefHat } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { updatePartOrderItemStatus } from '../services/tableSessionService';

interface PartOrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  special_instructions?: string;
  status: 'pending' | 'preparing' | 'ready' | 'served';
  menu_items: {
    id: string;
    name: string;
    price: number;
    category: string;
    tax_rate: number;
  };
}

interface PartOrder {
  id: string;
  table_number: string;
  status: string;
  created_at: string;
  printed_at?: string;
  part_order_items: PartOrderItem[];
}

interface TableSession {
  id: string;
  table_number: string;
  status: string;
  part_orders: PartOrder[];
}

const KitchenDashboard: React.FC = () => {
  const [sessions, setSessions] = useState<TableSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'preparing' | 'ready' | 'served'>('pending');

  useEffect(() => {
    fetchTableSessions();

    const subscription = supabase
      .channel('kitchen-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'part_order_items' }, () => {
        fetchTableSessions();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'part_orders' }, () => {
        fetchTableSessions();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchTableSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('table_sessions')
        .select(`
          id,
          table_number,
          status,
          part_orders (
            id,
            table_number,
            status,
            created_at,
            printed_at,
            part_order_items (
              id,
              quantity,
              unit_price,
              special_instructions,
              status,
              menu_items (
                id,
                name,
                price,
                category,
                tax_rate
              )
            )
          )
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: true });

      if (error) throw error;

      setSessions(data || []);
    } catch (error) {
      console.error('Error fetching table sessions:', error);
      toast.error('Failed to load kitchen orders');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateItemStatus = async (itemId: string, newStatus: 'pending' | 'preparing' | 'ready' | 'served') => {
    try {
      const { error } = await updatePartOrderItemStatus(itemId, newStatus);

      if (error) throw error;

      toast.success(`Item status updated to ${newStatus}`);
      fetchTableSessions();
    } catch (error) {
      console.error('Error updating item status:', error);
      toast.error('Failed to update item status');
    }
  };

  const getAllItems = () => {
    const allItems: Array<PartOrderItem & { tableNumber: string; partOrderId: string; createdAt: string }> = [];

    sessions.forEach(session => {
      session.part_orders.forEach(partOrder => {
        partOrder.part_order_items.forEach(item => {
          allItems.push({
            ...item,
            tableNumber: session.table_number,
            partOrderId: partOrder.id,
            createdAt: partOrder.created_at
          });
        });
      });
    });

    return allItems.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  };

  const filteredItems = getAllItems().filter(item => item.status === activeTab);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-700 bg-yellow-100';
      case 'preparing':
        return 'text-orange-700 bg-orange-100';
      case 'ready':
        return 'text-green-700 bg-green-100';
      case 'served':
        return 'text-blue-700 bg-blue-100';
      default:
        return 'text-gray-700 bg-gray-100';
    }
  };

  const getItemCounts = () => {
    const items = getAllItems();
    return {
      pending: items.filter(i => i.status === 'pending').length,
      preparing: items.filter(i => i.status === 'preparing').length,
      ready: items.filter(i => i.status === 'ready').length,
      served: items.filter(i => i.status === 'served').length,
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  const itemCounts = getItemCounts();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <ChefHat className="h-8 w-8 mr-3 text-orange-600" />
          Kitchen Dashboard
        </h1>
        <div className="text-sm text-gray-600">
          Active Items: {itemCounts.pending + itemCounts.preparing}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { key: 'pending', label: 'Pending', count: itemCounts.pending },
              { key: 'preparing', label: 'Preparing', count: itemCounts.preparing },
              { key: 'ready', label: 'Ready', count: itemCounts.ready },
              { key: 'served', label: 'Served', count: itemCounts.served },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } transition-colors`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredItems.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <ChefHat className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No {activeTab} items</p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div key={item.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-orange-600 bg-orange-50 px-3 py-1 rounded-md">
                    Table {item.tableNumber}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(item.status)}`}>
                    {item.status}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {format(new Date(item.createdAt), 'HH:mm')}
                </span>
              </div>

              <div className="mb-3">
                <h3 className="font-semibold text-lg text-gray-900">{item.menu_items.name}</h3>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm text-gray-600">{item.menu_items.category}</span>
                  <span className="text-sm font-medium text-gray-900">Qty: {item.quantity}</span>
                </div>
              </div>

              {item.special_instructions && (
                <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-xs text-yellow-800">
                    <strong>Note:</strong> {item.special_instructions}
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                {item.status === 'pending' && (
                  <button
                    onClick={() => handleUpdateItemStatus(item.id, 'preparing')}
                    className="flex-1 bg-orange-600 text-white py-2 px-3 rounded text-sm font-medium hover:bg-orange-700 transition-colors"
                  >
                    Start Preparing
                  </button>
                )}
                {item.status === 'preparing' && (
                  <button
                    onClick={() => handleUpdateItemStatus(item.id, 'ready')}
                    className="flex-1 bg-green-600 text-white py-2 px-3 rounded text-sm font-medium hover:bg-green-700 transition-colors"
                  >
                    Mark Ready
                  </button>
                )}
                {item.status === 'ready' && (
                  <button
                    onClick={() => handleUpdateItemStatus(item.id, 'served')}
                    className="flex-1 bg-blue-600 text-white py-2 px-3 rounded text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    Mark Served
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default KitchenDashboard;