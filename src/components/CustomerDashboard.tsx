import React, { useState, useEffect } from 'react';
import { MenuItem, calculateCartTotal } from '../lib/mockData';
import { apiClient } from '../lib/api';
import { useAuth } from '../lib/auth';
import { ShoppingCart, Plus, Minus, Clock, CheckCircle, CreditCard, Save, X, Search, User, DollarSign, Shield, Printer, Coffee, Utensils } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { createCheckoutSession } from '../lib/stripe';
import InPersonPayment from './InPersonPayment';

interface PartOrder {
  id: string;
  table_number: number;
  items: { item: MenuItem; quantity: number }[];
  special_instructions?: string;
  status: 'draft' | 'sent_to_kitchen' | 'preparing' | 'ready' | 'served';
  created_at: string;
  printed_at?: string;
}

interface TableSession {
  table_number: number;
  customer_name: string;
  part_orders: PartOrder[];
  total_amount: number;
  status: 'active' | 'ready_to_close' | 'closed';
  created_at: string;
}

const ServerDashboard: React.FC = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<{ item: MenuItem; quantity: number }[]>([]);
  const [tableSessions, setTableSessions] = useState<TableSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<number>(1);
  const [customerName, setCustomerName] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'order' | 'tables'>('order');
  const [paymentLoading, setPaymentLoading] = useState<string | null>(null);
  const [showInPersonPayment, setShowInPersonPayment] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchMenuItems();
    fetchTableSessions();
  }, []);

  const fetchMenuItems = async () => {
    try {
      const response = await apiClient.getMenuItems();
      if (response.data) {
        const availableItems = response.data.filter(item => item.available);
        setMenuItems(availableItems);
      }
    } catch (error) {
      console.error('Error fetching menu items:', error);
      toast.error('Failed to load menu items');
    } finally {
      setLoading(false);
    }
  };

  const fetchTableSessions = async () => {
    try {
      const response = await apiClient.getTableSessions();
      if (response.data) {
        setTableSessions(response.data);
      }
    } catch (error) {
      console.error('Error fetching table sessions:', error);
      toast.error('Failed to load table sessions');
    }
  };

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(cartItem => cartItem.item.id === item.id);
      if (existing) {
        return prev.map(cartItem =>
          cartItem.item.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      }
      return [...prev, { item, quantity: 1 }];
    });
    toast.success(`${item.name} added to cart`);
  };

  const updateCartQuantity = (itemId: string, delta: number) => {
    setCart(prev => {
      return prev.map(cartItem => {
        if (cartItem.item.id === itemId) {
          const newQuantity = Math.max(0, cartItem.quantity + delta);
          return newQuantity === 0 ? null : { ...cartItem, quantity: newQuantity };
        }
        return cartItem;
      }).filter(Boolean) as { item: MenuItem; quantity: number }[];
    });
  };

  const printToKitchen = async (partOrder: PartOrder) => {
    try {
      setLoading(true);
      
      // Simulate printing delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // In a real implementation, this would send to kitchen printer
      console.log('Printing to kitchen:', {
        table: partOrder.table_number,
        items: partOrder.items,
        instructions: partOrder.special_instructions,
        timestamp: new Date().toISOString()
      });
      
      toast.success(`Order sent to kitchen printer for Table ${partOrder.table_number}`);
      
      return {
        ...partOrder,
        status: 'sent_to_kitchen' as const,
        printed_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error printing to kitchen:', error);
      toast.error('Failed to send order to kitchen');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const sendPartOrder = async () => {
    if (!user || cart.length === 0) {
      toast.error('Please add items to cart');
      return;
    }

    if (!customerName.trim()) {
      toast.error('Please enter customer name');
      return;
    }

    try {
      setLoading(true);

      // Check if table session exists
      const sessionResponse = await apiClient.getActiveTableSession(selectedTable);
      let sessionId;
      
      if (sessionResponse.data) {
        sessionId = sessionResponse.data.id;
      } else {
        // Create new table session
        const newSessionResponse = await apiClient.createTableSession({
          table_number: selectedTable,
          customer_name: customerName
        });
        
        if (newSessionResponse.error) {
          throw new Error(newSessionResponse.error);
        }
        
        sessionId = newSessionResponse.data.id;
      }
      
      // Create part order
      const partOrderData = {
        table_number: selectedTable,
        items: cart.map(cartItem => ({
          item: cartItem.item,
          quantity: cartItem.quantity
        })),
        special_instructions: specialInstructions,
      };
      
      const partOrderResponse = await apiClient.addPartOrderToSession(sessionId, partOrderData);
      if (partOrderResponse.error) {
        throw new Error(partOrderResponse.error);
      }
      
      // Mark as printed (sent to kitchen)
      await apiClient.markPartOrderPrinted(partOrderResponse.data.id);

      // Clear cart and form
      setCart([]);
      setSpecialInstructions('');
      
      // Refresh table sessions
      fetchTableSessions();
      
      toast.success(`Part order sent to kitchen for Table ${selectedTable}`);
    } catch (error) {
      console.error('Error sending part order:', error);
      toast.error('Failed to send part order');
    } finally {
      setLoading(false);
    }
  };

  const updatePartOrderStatus = async (sessionIndex: number, partOrderId: string, newStatus: PartOrder['status']) => {
    try {
      const response = await apiClient.updatePartOrderStatus(partOrderId, newStatus);
      if (response.error) {
        throw new Error(response.error);
      }
      
      // Refresh table sessions
      fetchTableSessions();
      
      toast.success(`Part order status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating part order status:', error);
      toast.error('Failed to update part order status');
    }
  };

  const closeTableSession = async (session: TableSession) => {
    if (!user) return;

    try {
      setPaymentLoading(session.table_number.toString());
      
      // Create checkout session for the total amount
      const checkoutData = await createCheckoutSession({
        price_id: '', // Empty since we're using dynamic pricing
        success_url: `${window.location.origin}/success?table=${session.table_number}`,
        cancel_url: `${window.location.origin}/?payment=cancelled`,
        mode: 'payment',
        orderId: `table-${session.table_number}-${Date.now()}`,
        amount: Math.round(session.total_amount * 100), // Convert to cents
      });

      if (checkoutData.url) {
        // Mark session as closed
        setTableSessions(prev => 
          prev.map(s => 
            s.table_number === session.table_number 
              ? { ...s, status: 'closed' as const }
              : s
          )
        );
        
        window.location.href = checkoutData.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Failed to initiate payment');
    } finally {
      setPaymentLoading(null);
    }
  };

  const handleInPersonPayment = (session: TableSession) => {
    setShowInPersonPayment(session.table_number.toString());
  };

  const handleInPersonPaymentSuccess = () => {
    if (showInPersonPayment) {
      const tableNumber = parseInt(showInPersonPayment);
      
      // Mark session as closed and paid
      setTableSessions(prev => 
        prev.map(session => 
          session.table_number === tableNumber 
            ? { ...session, status: 'closed' as const }
            : session
        )
      );
      
      toast.success('In-person payment completed successfully!');
      setShowInPersonPayment(null);
    }
  };

  const handleInPersonPaymentCancel = () => {
    setShowInPersonPayment(null);
  };

  const canCloseSession = (session: TableSession) => {
    return session.part_orders.every(partOrder => partOrder.status === 'served');
  };

  const groupedMenuItems = menuItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  const filteredMenuItems = menuItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPartOrderStatusIcon = (status: PartOrder['status']) => {
    switch (status) {
      case 'draft':
        return <Clock className="h-4 w-4 text-gray-500" />;
      case 'sent_to_kitchen':
        return <Printer className="h-4 w-4 text-blue-500" />;
      case 'preparing':
        return <Coffee className="h-4 w-4 text-orange-500" />;
      case 'ready':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'served':
        return <Utensils className="h-4 w-4 text-purple-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPartOrderStatusColor = (status: PartOrder['status']) => {
    switch (status) {
      case 'draft':
        return 'text-gray-600 bg-gray-50';
      case 'sent_to_kitchen':
        return 'text-blue-600 bg-blue-50';
      case 'preparing':
        return 'text-orange-600 bg-orange-50';
      case 'ready':
        return 'text-green-600 bg-green-50';
      case 'served':
        return 'text-purple-600 bg-purple-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <User className="h-8 w-8 mr-3 text-amber-600" />
          Server Dashboard
        </h1>
        <div className="text-sm text-gray-600">
          Active Tables: {tableSessions.filter(s => s.status === 'active').length}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { key: 'order', label: 'Take Order' },
              { key: 'tables', label: 'Table Sessions' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-amber-500 text-amber-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } transition-colors`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {activeTab === 'order' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Menu */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Menu</h2>
            
            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search menu items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
            </div>
            
            {searchTerm ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredMenuItems.map(item => (
                  <div key={item.id} className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{item.name}</h4>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xs text-gray-500">{item.company}</span>
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                            {item.food_category}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                        <div className="mt-2">
                          <p className="text-lg font-bold text-amber-600">£{item.price.toFixed(2)}</p>
                          <p className="text-xs text-gray-500">Tax: {item.tax_rate}%</p>
                        </div>
                      </div>
                      <button
                        onClick={() => addToCart(item)}
                        className="ml-4 p-2 bg-amber-600 text-white rounded-full hover:bg-amber-700 transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              Object.entries(groupedMenuItems).map(([category, items]) => (
                <div key={category} className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 capitalize">{category}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {items.map(item => (
                      <div key={item.id} className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{item.name}</h4>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className="text-xs text-gray-500">{item.company}</span>
                              <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                                {item.food_category}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                            <div className="mt-2">
                              <p className="text-lg font-bold text-amber-600">£{item.price.toFixed(2)}</p>
                              <p className="text-xs text-gray-500">Tax: {item.tax_rate}%</p>
                            </div>
                          </div>
                          <button
                            onClick={() => addToCart(item)}
                            className="ml-4 p-2 bg-amber-600 text-white rounded-full hover:bg-amber-700 transition-colors"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Part Order Cart */}
          <div className="space-y-6">
            {/* Payment Gateway Promotion */}
            <div className="bg-gradient-to-r from-amber-50 to-amber-100 rounded-lg shadow-sm border border-amber-200">
              <div className="p-4">
                <div className="flex items-center mb-2">
                  <Shield className="h-5 w-5 text-amber-600 mr-2" />
                  <h3 className="font-semibold text-amber-800">Secure Payment Gateway</h3>
                </div>
                <p className="text-sm text-amber-700 mb-3">
                  Enable secure payment processing with Stripe Terminal integration.
                </p>
                <Link
                  to="/payment-gateway"
                  className="inline-flex items-center px-3 py-1.5 bg-amber-600 text-white text-sm font-medium rounded-md hover:bg-amber-700 transition-colors"
                >
                  Learn More
                </Link>
              </div>
            </div>

            {/* Part Order Form */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-4 border-b">
                <h3 className="font-semibold text-gray-900 flex items-center">
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  Part Order ({cart.reduce((sum, item) => sum + item.quantity, 0)} items)
                </h3>
              </div>
              
              <div className="p-4">
                {/* Table and Customer Info */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Table Number
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={selectedTable}
                      onChange={(e) => setSelectedTable(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Customer Name
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="Enter customer name"
                    />
                  </div>
                </div>

                {cart.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">Add items to create part order</p>
                ) : (
                  <>
                    <div className="space-y-3 mb-4">
                      {cart.map(cartItem => (
                        <div key={cartItem.item.id} className="flex justify-between items-center">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{cartItem.item.name}</p>
                            <p className="text-blue-600 font-semibold">£{cartItem.item.price.toFixed(2)}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => updateCartQuantity(cartItem.item.id, -1)}
                              className="p-1 hover:bg-gray-100 rounded"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="font-medium">{cartItem.quantity}</span>
                            <button
                              onClick={() => updateCartQuantity(cartItem.item.id, 1)}
                              className="p-1 hover:bg-gray-100 rounded"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="border-t pt-4 space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Special Instructions
                        </label>
                        <textarea
                          value={specialInstructions}
                          onChange={(e) => setSpecialInstructions(e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                          placeholder="Any special requests for kitchen..."
                        />
                      </div>

                      <div className="border-t pt-3 space-y-2">
                        {(() => {
                          const cartTotals = calculateCartTotal(cart);
                          return (
                            <>
                              <div className="flex justify-between items-center text-sm">
                                <span>Subtotal:</span>
                                <span>£{cartTotals.subtotal.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between items-center text-sm">
                                <span>Tax:</span>
                                <span>£{cartTotals.tax.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between items-center font-bold text-lg border-t pt-2">
                                <span>Total:</span>
                                <span className="text-amber-600">£{cartTotals.total.toFixed(2)}</span>
                              </div>
                            </>
                          );
                        })()}
                      </div>

                      <button
                        onClick={sendPartOrder}
                        disabled={loading || !customerName.trim()}
                        className="w-full bg-amber-600 text-white py-3 px-4 rounded-md hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center font-medium"
                      >
                        <Printer className="h-4 w-4 mr-2" />
                        {loading ? 'Sending to Kitchen...' : 'Send to Kitchen'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tables' && (
        <div className="space-y-6">
          {tableSessions.length === 0 ? (
            <div className="text-center py-12">
              <User className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No active table sessions</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {tableSessions.map((session, sessionIndex) => (
                <div key={session.table_number} className="bg-white rounded-lg shadow-sm border">
                  <div className="p-4 border-b">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          Table {session.table_number}
                        </h3>
                        <p className="text-sm text-gray-600">{session.customer_name}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        session.status === 'active' 
                          ? 'bg-green-100 text-green-800'
                          : session.status === 'ready_to_close'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {session.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg text-amber-600">
                        £{session.total_amount.toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {session.part_orders.length} part order{session.part_orders.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="space-y-3 mb-4">
                      {session.part_orders.map((partOrder, partIndex) => (
                        <div key={partOrder.id} className="border rounded-lg p-3">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium">
                              Part Order #{partIndex + 1}
                            </span>
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPartOrderStatusColor(partOrder.status)}`}>
                                {getPartOrderStatusIcon(partOrder.status)}
                                <span className="ml-1 capitalize">{partOrder.status.replace('_', ' ')}</span>
                              </span>
                            </div>
                          </div>
                          
                          <div className="text-xs text-gray-600 space-y-1 mb-2">
                            {partOrder.items.map((item, itemIndex) => (
                              <div key={itemIndex} className="flex justify-between">
                                <span>{item.item.name} ×{item.quantity}</span>
                                <span>£{(item.item.price * item.quantity).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>

                          {partOrder.special_instructions && (
                            <div className="text-xs text-yellow-800 bg-yellow-50 p-2 rounded mb-2">
                              <strong>Instructions:</strong> {partOrder.special_instructions}
                            </div>
                          )}

                          <div className="flex justify-between items-center text-xs text-gray-500">
                            <span>{new Date(partOrder.created_at).toLocaleTimeString()}</span>
                            {partOrder.printed_at && (
                              <span>Printed: {new Date(partOrder.printed_at).toLocaleTimeString()}</span>
                            )}
                          </div>

                          {/* Part Order Status Controls */}
                          {partOrder.status === 'sent_to_kitchen' && (
                            <button
                              onClick={() => updatePartOrderStatus(sessionIndex, partOrder.id, 'preparing')}
                              className="w-full mt-2 bg-amber-600 text-white py-1 px-2 rounded text-xs hover:bg-amber-700 transition-colors"
                            >
                              Mark Preparing
                            </button>
                          )}
                          {partOrder.status === 'preparing' && (
                            <button
                              onClick={() => updatePartOrderStatus(sessionIndex, partOrder.id, 'ready')}
                              className="w-full mt-2 bg-green-600 text-white py-1 px-2 rounded text-xs hover:bg-green-700 transition-colors"
                            >
                              Mark Ready
                            </button>
                          )}
                          {partOrder.status === 'ready' && (
                            <button
                              onClick={() => updatePartOrderStatus(sessionIndex, partOrder.id, 'served')}
                              className="w-full mt-2 bg-purple-600 text-white py-1 px-2 rounded text-xs hover:bg-purple-700 transition-colors"
                            >
                              Mark Served
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Close Table Session */}
                    {session.status === 'active' && (
                      <div className="space-y-2">
                        {!canCloseSession(session) && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-3">
                            <p className="text-sm text-yellow-800">
                              <strong>Payment Disabled:</strong> All part orders must be marked as "Served" before payment can be processed.
                            </p>
                          </div>
                        )}
                        
                        <button
                          onClick={() => closeTableSession(session)}
                          disabled={paymentLoading === session.table_number.toString() || !canCloseSession(session)}
                          className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center text-sm font-medium"
                        >
                          {paymentLoading === session.table_number.toString() ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          ) : (
                            <CreditCard className="h-4 w-4 mr-2" />
                          )}
                          {paymentLoading === session.table_number.toString() 
                            ? 'Processing...' 
                            : !canCloseSession(session)
                            ? 'Complete All Orders First'
                            : 'Close & Pay (Stripe)'
                          }
                        </button>
                        
                        <button
                          onClick={() => handleInPersonPayment(session)}
                          disabled={!canCloseSession(session)}
                          className="w-full bg-amber-600 text-white py-2 px-4 rounded-md hover:bg-amber-700 transition-colors flex items-center justify-center text-sm font-medium"
                        >
                          <DollarSign className="h-4 w-4 mr-2" />
                          {!canCloseSession(session) ? 'Complete All Orders First' : 'Pay with Terminal'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* In-Person Payment Modal */}
      {showInPersonPayment && (
        <InPersonPayment
          orderId={`table-${showInPersonPayment}`}
          amount={tableSessions.find(s => s.table_number.toString() === showInPersonPayment)?.total_amount || 0}
          onSuccess={handleInPersonPaymentSuccess}
          onCancel={handleInPersonPaymentCancel}
        />
      )}
    </div>
  );
};

export default ServerDashboard;