import React, { useState, useEffect } from 'react';
import { MenuItem } from '../lib/mockData';
import { supabase } from '../lib/supabase';
import { DollarSign, CreditCard, Printer, Edit2, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { createPortal } from 'react-dom';
import InPersonPayment from './InPersonPayment';

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
  const [showInPersonPayment, setShowInPersonPayment] = useState<{ sessionId: string; amount: number } | null>(null);
  const [sessionDiscounts, setSessionDiscounts] = useState<{ [sessionId: string]: { type: 'percentage' | 'amount'; value: number } }>({});

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
              isEditing: true,
              editedQuantity: item.quantity,
              editedPrice: parseFloat(item.unit_price),
              editedDiscount: parseFloat(item.discount_percent || 0)
            });
          });
        });
        initialEditableItems[session.id] = allItems;
      });
      setEditableItems(initialEditableItems);

      // Initialize session discounts
      const initialDiscounts: { [key: string]: { type: 'percentage' | 'amount'; value: number } } = {};
      sessionsWithOrders.forEach((session) => {
        initialDiscounts[session.id] = { type: 'percentage', value: 0 };
      });
      setSessionDiscounts(initialDiscounts);

    } catch (error) {
      console.error('Error fetching closed sessions:', error);
      toast.error('Failed to load closed sessions');
    } finally {
      setLoading(false);
    }
  };

  const updateItemField = async (sessionId: string, itemId: string, field: string, value: number) => {
    setEditableItems(prev => ({
      ...prev,
      [sessionId]: prev[sessionId].map(item =>
        item.id === itemId ? { ...item, [field]: value } : item
      )
    }));

    const item = editableItems[sessionId].find(i => i.id === itemId);
    if (!item) return;

    const updatedItem = { ...item, [field]: value };
    const subtotal = updatedItem.editedQuantity * updatedItem.editedPrice;
    const discountAmount = subtotal * (updatedItem.editedDiscount / 100);

    try {
      const { error } = await supabase
        .from('part_order_items')
        .update({
          quantity: updatedItem.editedQuantity,
          unit_price: updatedItem.editedPrice,
          discount_percent: updatedItem.editedDiscount,
          discount_amount: discountAmount,
          subtotal: subtotal - discountAmount
        })
        .eq('id', itemId);

      if (error) throw error;

      const updatedItems = editableItems[sessionId].map(item =>
        item.id === itemId ? updatedItem : item
      );
      const sessionDiscount = sessionDiscounts[sessionId];
      const totals = calculateTotals(updatedItems, sessionDiscount);

      await supabase
        .from('table_sessions')
        .update({ total_amount: totals.total })
        .eq('id', sessionId);
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error('Failed to update item');
    }
  };

  const calculateTotals = (items: EditableItem[], sessionDiscount?: { type: 'percentage' | 'amount'; value: number }) => {
    const subtotal = items.reduce((sum, item) => {
      return sum + (item.editedQuantity * item.editedPrice);
    }, 0);

    const itemDiscountTotal = items.reduce((sum, item) => {
      const itemSubtotal = item.editedQuantity * item.editedPrice;
      return sum + (itemSubtotal * (item.editedDiscount / 100));
    }, 0);

    const afterItemDiscount = subtotal - itemDiscountTotal;

    // Calculate session-level discount
    let sessionDiscountAmount = 0;
    if (sessionDiscount && sessionDiscount.value > 0) {
      if (sessionDiscount.type === 'percentage') {
        sessionDiscountAmount = afterItemDiscount * (sessionDiscount.value / 100);
      } else {
        sessionDiscountAmount = sessionDiscount.value;
      }
    }

    const afterAllDiscounts = afterItemDiscount - sessionDiscountAmount;

    const tax = items.reduce((sum, item) => {
      const itemSubtotal = item.editedQuantity * item.editedPrice;
      const itemDiscount = itemSubtotal * (item.editedDiscount / 100);
      const itemAfterDiscount = itemSubtotal - itemDiscount;
      return sum + (itemAfterDiscount * ((item.menu_item.tax_rate || 0) / 100));
    }, 0);

    // Apply session discount to tax proportionally
    const taxAfterDiscount = sessionDiscountAmount > 0 ? (tax * (afterAllDiscounts / afterItemDiscount)) : tax;

    const total = afterAllDiscounts + taxAfterDiscount;

    return {
      subtotal,
      itemDiscountTotal,
      afterItemDiscount,
      sessionDiscountAmount,
      afterAllDiscounts,
      tax: taxAfterDiscount,
      total
    };
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

  const handleStripePayment = (sessionId: string) => {
    const session = closedSessions.find(s => s.id === sessionId);
    if (!session) return;

    const items = editableItems[sessionId];
    const sessionDiscount = sessionDiscounts[sessionId];
    const totals = calculateTotals(items, sessionDiscount);

    setShowInPersonPayment({ sessionId, amount: totals.total });
  };

  const updateSessionDiscount = async (sessionId: string, type: 'percentage' | 'amount', value: number) => {
    setSessionDiscounts(prev => ({
      ...prev,
      [sessionId]: { type, value }
    }));

    const items = editableItems[sessionId];
    const totals = calculateTotals(items, { type, value });

    try {
      await supabase
        .from('table_sessions')
        .update({ total_amount: totals.total })
        .eq('id', sessionId);
    } catch (error) {
      console.error('Error updating session discount:', error);
      toast.error('Failed to update discount');
    }
  };

  const handleInPersonPaymentSuccess = async () => {
    if (!showInPersonPayment) return;

    try {
      const { error } = await supabase
        .from('table_sessions')
        .update({ payment_status: 'paid' })
        .eq('id', showInPersonPayment.sessionId);

      if (error) throw error;

      toast.success('Payment completed successfully');
      setShowInPersonPayment(null);
      await fetchClosedSessions();
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast.error('Failed to update payment status');
    }
  };

  const handleInPersonPaymentCancel = () => {
    setShowInPersonPayment(null);
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {closedSessions.map((session) => {
            const items = editableItems[session.id] || [];
            const sessionDiscount = sessionDiscounts[session.id] || { type: 'percentage', value: 0 };
            const totals = calculateTotals(items, sessionDiscount);

            return (
              <div key={session.id} className="bg-white rounded-lg shadow-sm border">
                <div className="p-4 border-b">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">Table {session.table_number}</h3>
                      <p className="text-xs text-gray-500 mt-1">
                        Closed: {new Date(session.closed_at).toLocaleString()}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${session.payment_status === 'paid'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                      }`}>
                      {session.payment_status === 'paid' ? 'Paid' : 'Pending'}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg text-amber-600">
                      £{totals.total.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {session.part_orders.length} part order{session.part_orders.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  <div className="overflow-x-auto mb-4">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b-2">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Item Name</th>
                          <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700">Qty</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">Unit Price</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {items.map((item) => {
                          const itemTotal = item.editedQuantity * item.editedPrice;

                          return (
                            <tr key={item.id} className="hover:bg-gray-50">
                              <td className="px-3 py-2">
                                <div className="font-medium text-gray-900">{item.menu_item.name}</div>
                                {item.special_instructions && (
                                  <div className="text-xs text-gray-500 mt-1">{item.special_instructions}</div>
                                )}
                              </td>
                              <td className="px-3 py-2 text-center">
                                {session.payment_status === 'paid' ? (
                                  <span className="font-medium text-gray-900">{item.editedQuantity}</span>
                                ) : (
                                  <input
                                    type="number"
                                    min="1"
                                    value={item.editedQuantity}
                                    onChange={(e) => updateItemField(session.id, item.id, 'editedQuantity', parseInt(e.target.value) || 1)}
                                    className="w-16 px-2 py-1 border rounded text-center text-sm"
                                  />
                                )}
                              </td>
                              <td className="px-3 py-2 text-right">
                                {session.payment_status === 'paid' ? (
                                  <span className="font-medium text-gray-900">£{item.editedPrice.toFixed(2)}</span>
                                ) : (
                                  <div className="flex items-center justify-end">
                                    <span className="mr-1">£</span>
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={item.editedPrice}
                                      onChange={(e) => updateItemField(session.id, item.id, 'editedPrice', parseFloat(e.target.value) || 0)}
                                      className="w-20 px-2 py-1 border rounded text-right text-sm"
                                    />
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-2 text-right font-semibold text-gray-900">
                                £{itemTotal.toFixed(2)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="border-t pt-3 mb-3">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between text-gray-700">
                        <span>Subtotal:</span>
                        <span>£{totals.subtotal.toFixed(2)}</span>
                      </div>
                      {totals.itemDiscountTotal > 0 && (
                        <div className="flex justify-between text-red-600">
                          <span>Item Discounts:</span>
                          <span>-£{totals.itemDiscountTotal.toFixed(2)}</span>
                        </div>
                      )}

                      {/* Session-level discount input */}
                      {session.payment_status !== 'paid' && (
                        <div className="border-t border-b py-2 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-700">Additional Discount:</span>
                            <div className="flex items-center space-x-2">
                              <select
                                value={sessionDiscount.type}
                                onChange={(e) => updateSessionDiscount(session.id, e.target.value as 'percentage' | 'amount', sessionDiscount.value)}
                                className="px-2 py-1 border rounded text-xs"
                                disabled={session.payment_status === 'paid'}
                              >
                                <option value="percentage">%</option>
                                <option value="amount">£</option>
                              </select>
                              <input
                                type="number"
                                min="0"
                                step={sessionDiscount.type === 'percentage' ? '1' : '0.01'}
                                max={sessionDiscount.type === 'percentage' ? '100' : undefined}
                                value={sessionDiscount.value}
                                onChange={(e) => updateSessionDiscount(session.id, sessionDiscount.type, parseFloat(e.target.value) || 0)}
                                className="w-20 px-2 py-1 border rounded text-right text-xs"
                                placeholder="0"
                                disabled={session.payment_status === 'paid'}
                              />
                            </div>
                          </div>
                          {sessionDiscount.value > 0 && (
                            <div className="flex justify-between text-red-600 text-xs">
                              <span>Discount Applied:</span>
                              <span>-£{totals.sessionDiscountAmount.toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {session.payment_status === 'paid' && totals.sessionDiscountAmount > 0 && (
                        <div className="flex justify-between text-red-600">
                          <span>Additional Discount:</span>
                          <span>-£{totals.sessionDiscountAmount.toFixed(2)}</span>
                        </div>
                      )}

                      <div className="flex justify-between text-gray-700">
                        <span>Tax:</span>
                        <span>£{totals.tax.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-gray-900 border-t pt-1">
                        <span>Total:</span>
                        <span>£{totals.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={() => handlePrintReceipt(session)}
                      className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors flex items-center justify-center text-sm"
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      Print Receipt
                    </button>
                    {session.payment_status !== 'paid' && (
                      <>
                        <button
                          onClick={() => handleCashPayment(session.id)}
                          disabled={paymentLoading === session.id}
                          className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center text-sm font-medium"
                        >
                          <DollarSign className="h-4 w-4 mr-2" />
                          {paymentLoading === session.id ? 'Processing...' : 'Pay by Cash'}
                        </button>
                        <button
                          onClick={() => handleStripePayment(session.id)}
                          disabled={paymentLoading === session.id}
                          className="w-full px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:opacity-50 transition-colors flex items-center justify-center text-sm font-medium"
                        >
                          <CreditCard className="h-4 w-4 mr-2" />
                          {paymentLoading === session.id ? 'Processing...' : 'Pay with Terminal'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showInPersonPayment && (
        <InPersonPayment
          orderId={`table-${showInPersonPayment.sessionId}`}
          amount={showInPersonPayment.amount}
          onSuccess={handleInPersonPaymentSuccess}
          onCancel={handleInPersonPaymentCancel}
        />
      )}

      {printReceipt && createPortal(
        <div className="print-only-content">
          <div className="space-y-4">
            <div className="text-center border-b-2 border-gray-800 pb-3">
              <h1 className="text-2xl font-bold text-gray-900">Lush and Hush</h1>
              <p className="text-sm text-gray-700 mt-1">101 Notting Hill Gate, London, UK</p>
              <p className="text-sm text-gray-700 mb-2">07786 189088</p>
              <p className="text-xs text-gray-600 border-t border-gray-400 pt-2 mt-2">{new Date().toLocaleString()}</p>
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
                const sessionDiscount = sessionDiscounts[printReceipt.id] || { type: 'percentage', value: 0 };
                const totals = calculateTotals(editableItems[printReceipt.id] || [], sessionDiscount);
                return (
                  <>
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>£{totals.subtotal.toFixed(2)}</span>
                    </div>
                    {totals.itemDiscountTotal > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>Item Discounts:</span>
                        <span>-£{totals.itemDiscountTotal.toFixed(2)}</span>
                      </div>
                    )}
                    {totals.sessionDiscountAmount > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>Additional Discount ({sessionDiscount.type === 'percentage' ? `${sessionDiscount.value}%` : `£${sessionDiscount.value.toFixed(2)}`}):</span>
                        <span>-£{totals.sessionDiscountAmount.toFixed(2)}</span>
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
