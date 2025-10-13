import React, { useState, useEffect } from 'react';
import { MenuItem } from '../lib/mockData';
import { supabase } from '../lib/supabase';
import { DollarSign, CreditCard, Printer, Edit2, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { createPortal } from 'react-dom';

interface PartOrderItem {
  id: string;
  menu_item_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  discount_percent: number;
  discount_amount: number;
  special_instructions?: string;
  menu_item: MenuItem;
}

interface PartOrder {
  id: string;
  table_number: number;
  status: string;
  items: PartOrderItem[];
  created_at: string;
}

interface TableSession {
  id: string;
  table_number: number;
  status: string;
  payment_status: string;
  total_amount: number;
  part_orders: PartOrder[];
  closed_at: string;
  created_at: string;
}

interface EditableItem extends PartOrderItem {
  isEditing: boolean;
  editedQuantity: number;
  editedPrice: number;
  editedDiscount: number;
}

interface TableClosedTabProps {
  userId: string;
}

const TableClosedTab: React.FC<TableClosedTabProps> = ({ userId }) => {
  const [closedSessions, setClosedSessions] = useState<TableSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [editableItems, setEditableItems] = useState<{ [sessionId: string]: EditableItem[] }>({});
  const [printReceipt, setPrintReceipt] = useState<TableSession | null>(null);
  const [paymentLoading, setPaymentLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchClosedSessions();
  }, [userId]);

  const fetchClosedSessions = async () => {
    try {
      const { data: sessions, error: sessionsError } = await supabase
        .from('table_sessions')
        .select('*')
        .eq('server_id', userId)
        .eq('status', 'closed')
        .order('closed_at', { ascending: false });

      if (sessionsError) throw sessionsError;

      const sessionsWithOrders = await Promise.all(
        (sessions || []).map(async (session) => {
          const { data: partOrders, error: ordersError } = await supabase
            .from('part_orders')
            .select('*')
            .eq('table_session_id', session.id)
            .order('created_at', { ascending: true });

          if (ordersError) throw ordersError;

          const ordersWithItems = await Promise.all(
            (partOrders || []).map(async (order) => {
              const { data: items, error: itemsError } = await supabase
                .from('part_order_items')
                .select(`
                  *,
                  menu_item:menu_items(*)
                `)
                .eq('part_order_id', order.id);

              if (itemsError) throw itemsError;

              return {
                ...order,
                items: items || []
              };
            })
          );

          return {
            ...session,
            part_orders: ordersWithItems
          };
        })
      );

      setClosedSessions(sessionsWithOrders);

      const initialEditableItems: { [key: string]: EditableItem[] } = {};
      sessionsWithOrders.forEach((session) => {
        const allItems: EditableItem[] = [];
        session.part_orders.forEach((order) => {
          order.items.forEach((item: any) => {
            allItems.push({
              ...item,
              menu_item: item.menu_item,
              isEditing: false,
              editedQuantity: item.quantity,
              editedPrice: parseFloat(item.unit_price),
              editedDiscount: parseFloat(item.discount_percent || 0)
            });
          });
        });
        initialEditableItems[session.id] = allItems;
      });
      setEditableItems(initialEditableItems);

    } catch (error) {
      console.error('Error fetching closed sessions:', error);
      toast.error('Failed to load closed sessions');
    } finally {
      setLoading(false);
    }
  };

  const toggleEdit = (sessionId: string, itemId: string) => {
    setEditableItems(prev => ({
      ...prev,
      [sessionId]: prev[sessionId].map(item =>
        item.id === itemId ? { ...item, isEditing: !item.isEditing } : item
      )
    }));
  };

  const updateItemField = (sessionId: string, itemId: string, field: string, value: number) => {
    setEditableItems(prev => ({
      ...prev,
      [sessionId]: prev[sessionId].map(item =>
        item.id === itemId ? { ...item, [field]: value } : item
      )
    }));
  };

  const saveItem = async (sessionId: string, itemId: string) => {
    const item = editableItems[sessionId].find(i => i.id === itemId);
    if (!item) return;

    try {
      const subtotal = item.editedQuantity * item.editedPrice;
      const discountAmount = subtotal * (item.editedDiscount / 100);

      const { error } = await supabase
        .from('part_order_items')
        .update({
          quantity: item.editedQuantity,
          unit_price: item.editedPrice,
          discount_percent: item.editedDiscount,
          discount_amount: discountAmount,
          subtotal: subtotal - discountAmount
        })
        .eq('id', itemId);

      if (error) throw error;

      toast.success('Item updated');
      toggleEdit(sessionId, itemId);
      await fetchClosedSessions();
    } catch (error) {
      console.error('Error saving item:', error);
      toast.error('Failed to update item');
    }
  };

  const cancelEdit = (sessionId: string, itemId: string) => {
    const originalItem = closedSessions
      .find(s => s.id === sessionId)
      ?.part_orders.flatMap(o => o.items)
      .find(i => i.id === itemId);

    if (originalItem) {
      setEditableItems(prev => ({
        ...prev,
        [sessionId]: prev[sessionId].map(item =>
          item.id === itemId
            ? {
              ...item,
              isEditing: false,
              editedQuantity: originalItem.quantity,
              editedPrice: parseFloat(originalItem.unit_price.toString()),
              editedDiscount: parseFloat(originalItem.discount_percent?.toString() || '0')
            }
            : item
        )
      }));
    }
  };

  const calculateTotals = (items: EditableItem[]) => {
    const subtotal = items.reduce((sum, item) => {
      return sum + (item.editedQuantity * item.editedPrice);
    }, 0);

    const discountTotal = items.reduce((sum, item) => {
      const itemSubtotal = item.editedQuantity * item.editedPrice;
      return sum + (itemSubtotal * (item.editedDiscount / 100));
    }, 0);

    const afterDiscount = subtotal - discountTotal;

    const tax = items.reduce((sum, item) => {
      const itemSubtotal = item.editedQuantity * item.editedPrice;
      const itemDiscount = itemSubtotal * (item.editedDiscount / 100);
      const itemAfterDiscount = itemSubtotal - itemDiscount;
      return sum + (itemAfterDiscount * ((item.menu_item.tax_rate || 0) / 100));
    }, 0);

    const total = afterDiscount + tax;

    return { subtotal, discountTotal, afterDiscount, tax, total };
  };

  const handleCashPayment = async (sessionId: string) => {
    try {
      setPaymentLoading(sessionId);

      const { error } = await supabase
        .from('table_sessions')
        .update({ payment_status: 'paid' })
        .eq('id', sessionId);

      if (error) throw error;

      toast.success('Payment marked as paid');
      await fetchClosedSessions();
    } catch (error) {
      console.error('Error processing cash payment:', error);
      toast.error('Failed to process cash payment');
    } finally {
      setPaymentLoading(null);
    }
  };

  const handleStripePayment = async (sessionId: string) => {
    try {
      setPaymentLoading(sessionId);

      const session = closedSessions.find(s => s.id === sessionId);
      if (!session) return;

      const items = editableItems[sessionId];
      const totals = calculateTotals(items);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-payment-intent`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: Math.round(totals.total * 100),
            currency: 'gbp',
            description: `Table ${session.table_number} - Session ${session.id}`,
            order_id: session.id,
            use_checkout: true
          })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to create payment session');
      }

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No payment URL returned');
      }
    } catch (error) {
      console.error('Error processing Stripe payment:', error);
      toast.error('Failed to process Stripe payment');
      setPaymentLoading(null);
    }
  };

  const handlePrintReceipt = (session: TableSession) => {
    setPrintReceipt(session);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const closePrintPreview = () => {
    setPrintReceipt(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">Closed Tables</h2>
        <div className="text-sm text-gray-600">
          {closedSessions.length} closed {closedSessions.length === 1 ? 'session' : 'sessions'}
        </div>
      </div>

      {closedSessions.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
          <p className="text-gray-500">No closed table sessions</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {closedSessions.map((session) => {
            const items = editableItems[session.id] || [];
            const totals = calculateTotals(items);

            return (
              <div key={session.id} className="bg-white rounded-lg shadow-sm border">
                <div className="p-6 border-b bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">Table {session.table_number}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Closed: {new Date(session.closed_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${session.payment_status === 'paid'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                        }`}>
                        {session.payment_status === 'paid' ? 'Paid' : 'Pending Payment'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Item</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Quantity</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Price</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Discount %</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Total</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {items.map((item) => {
                          const itemSubtotal = item.editedQuantity * item.editedPrice;
                          const itemDiscount = itemSubtotal * (item.editedDiscount / 100);
                          const itemTotal = itemSubtotal - itemDiscount;

                          return (
                            <tr key={item.id} className="hover:bg-gray-50">
                              <td className="px-4 py-4">
                                <div className="font-medium text-gray-900">{item.menu_item.name}</div>
                                {item.special_instructions && (
                                  <div className="text-xs text-gray-500 mt-1">{item.special_instructions}</div>
                                )}
                              </td>
                              <td className="px-4 py-4 text-center">
                                {item.isEditing ? (
                                  <input
                                    type="number"
                                    min="1"
                                    value={item.editedQuantity}
                                    onChange={(e) => updateItemField(session.id, item.id, 'editedQuantity', parseInt(e.target.value) || 1)}
                                    className="w-20 px-2 py-1 border rounded text-center"
                                  />
                                ) : (
                                  <span>{item.editedQuantity}</span>
                                )}
                              </td>
                              <td className="px-4 py-4 text-right">
                                {item.isEditing ? (
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.editedPrice}
                                    onChange={(e) => updateItemField(session.id, item.id, 'editedPrice', parseFloat(e.target.value) || 0)}
                                    className="w-24 px-2 py-1 border rounded text-right"
                                  />
                                ) : (
                                  <span>£{item.editedPrice.toFixed(2)}</span>
                                )}
                              </td>
                              <td className="px-4 py-4 text-right">
                                {item.isEditing ? (
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    value={item.editedDiscount}
                                    onChange={(e) => updateItemField(session.id, item.id, 'editedDiscount', parseFloat(e.target.value) || 0)}
                                    className="w-20 px-2 py-1 border rounded text-right"
                                  />
                                ) : (
                                  <span>{item.editedDiscount}%</span>
                                )}
                              </td>
                              <td className="px-4 py-4 text-right font-semibold">
                                £{itemTotal.toFixed(2)}
                              </td>
                              <td className="px-4 py-4 text-center">
                                {item.isEditing ? (
                                  <div className="flex justify-center space-x-2">
                                    <button
                                      onClick={() => saveItem(session.id, item.id)}
                                      className="p-1 text-green-600 hover:bg-green-50 rounded"
                                      title="Save"
                                    >
                                      <Check className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => cancelEdit(session.id, item.id)}
                                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                                      title="Cancel"
                                    >
                                      <X className="h-4 w-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => toggleEdit(session.id, item.id)}
                                    className="p-1 text-amber-600 hover:bg-amber-50 rounded"
                                    title="Edit"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-6 border-t pt-4">
                    <div className="flex justify-end">
                      <div className="w-80 space-y-2">
                        <div className="flex justify-between text-gray-700">
                          <span>Subtotal:</span>
                          <span>£{totals.subtotal.toFixed(2)}</span>
                        </div>
                        {totals.discountTotal > 0 && (
                          <div className="flex justify-between text-red-600">
                            <span>Discount:</span>
                            <span>-£{totals.discountTotal.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-gray-700">
                          <span>Tax:</span>
                          <span>£{totals.tax.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xl font-bold text-gray-900 border-t pt-2">
                          <span>Total:</span>
                          <span>£{totals.total.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {session.payment_status !== 'paid' && (
                    <div className="mt-6 flex justify-end space-x-3">
                      <button
                        onClick={() => handlePrintReceipt(session)}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors flex items-center"
                      >
                        <Printer className="h-4 w-4 mr-2" />
                        Print Receipt
                      </button>
                      <button
                        onClick={() => handleCashPayment(session.id)}
                        disabled={paymentLoading === session.id}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center"
                      >
                        <DollarSign className="h-4 w-4 mr-2" />
                        {paymentLoading === session.id ? 'Processing...' : 'Pay by Cash'}
                      </button>
                      <button
                        onClick={() => handleStripePayment(session.id)}
                        disabled={paymentLoading === session.id}
                        className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:opacity-50 transition-colors flex items-center"
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        {paymentLoading === session.id ? 'Processing...' : 'Pay with Terminal'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {printReceipt && createPortal(
        <div className="print-only-content">
          <div className="space-y-4">
            <div className="text-center border-b-2 border-gray-800 pb-2">
              <h1 className="text-2xl font-bold text-gray-900">Receipt</h1>
              <p className="text-sm text-gray-600">{new Date().toLocaleString()}</p>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="font-semibold">Table Number:</span>
                <span>{printReceipt.table_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Session ID:</span>
                <span className="text-xs">{printReceipt.id}</span>
              </div>
            </div>

            <div className="border-t-2 border-gray-800 pt-3">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-1">Item</th>
                    <th className="text-center py-1">Qty</th>
                    <th className="text-right py-1">Price</th>
                    <th className="text-right py-1">Disc%</th>
                    <th className="text-right py-1">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {editableItems[printReceipt.id]?.map((item) => {
                    const itemSubtotal = item.editedQuantity * item.editedPrice;
                    const itemDiscount = itemSubtotal * (item.editedDiscount / 100);
                    const itemTotal = itemSubtotal - itemDiscount;
                    return (
                      <tr key={item.id} className="border-b">
                        <td className="py-2">{item.menu_item.name}</td>
                        <td className="text-center py-2">{item.editedQuantity}</td>
                        <td className="text-right py-2">£{item.editedPrice.toFixed(2)}</td>
                        <td className="text-right py-2">{item.editedDiscount}%</td>
                        <td className="text-right py-2">£{itemTotal.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="border-t-2 border-gray-800 pt-3 space-y-1">
              {(() => {
                const totals = calculateTotals(editableItems[printReceipt.id] || []);
                return (
                  <>
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>£{totals.subtotal.toFixed(2)}</span>
                    </div>
                    {totals.discountTotal > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>Discount:</span>
                        <span>-£{totals.discountTotal.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Tax:</span>
                      <span>£{totals.tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t-2 border-gray-800 pt-2">
                      <span>TOTAL:</span>
                      <span>£{totals.total.toFixed(2)}</span>
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="text-center text-sm text-gray-600 border-t border-gray-800 pt-2">
              <p>Thank you for your visit!</p>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default TableClosedTab;
