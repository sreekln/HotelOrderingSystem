import React, { useState, useEffect } from 'react';
import { MenuItem, Order, mockMenuItems, mockOrders, mockOrderItems, getOrderItemsWithMenuItems, calculateTax, calculateTotal } from '../lib/mockData';
import { useAuth } from '../lib/mockAuth';
import { ShoppingCart, Plus, Minus, Clock, CheckCircle, CreditCard, Shield, Smartphone } from 'lucide-react';
import toast from 'react-hot-toast';
import { createCheckoutSession } from '../lib/stripe';
import { Link } from 'react-router-dom';
import InPersonPayment from './InPersonPayment';

const CustomerDashboard: React.FC = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<{ item: MenuItem; quantity: number }[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableNumber, setTableNumber] = useState<number>(1);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [paymentLoading, setPaymentLoading] = useState<string | null>(null);
  const [showInPersonPayment, setShowInPersonPayment] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchMenuItems();
    if (user) {
      fetchOrders();
    }
  }, [user]);

  const fetchMenuItems = async () => {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const availableItems = mockMenuItems.filter(item => item.available);
      setMenuItems(availableItems);
    } catch (error) {
      console.error('Error fetching menu items:', error);
      toast.error('Failed to load menu items');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const userOrders = mockOrders
        .filter(order => order.customer_id === user?.id)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setOrders(userOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
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

  const getTotalAmount = () => {
    return cart.reduce((total, cartItem) => total + (cartItem.item.price * cartItem.quantity), 0);
  };

  
  const getSubtotal = () => {
    return getTotalAmount();
  };

  const getTaxAmount = () => {
    return cart.reduce((totalTax, cartItem) => {
      const itemSubtotal = cartItem.item.price * cartItem.quantity;
      const itemTax = itemSubtotal * (cartItem.item.tax_rate / 100);
      return totalTax + itemTax;
    }, 0);
  };

  const getFinalTotal = () => {
    return getSubtotal() + getTaxAmount();
  };

  const createOrder = async () => {
    if (!user || cart.length === 0) return;

    try {
      setLoading(true);

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Create new order
      const newOrder: Order = {
        id: `order-${Date.now()}`,
        customer_id: user.id,
        subtotal: getSubtotal(),
        tax_amount: getTaxAmount(),
        total_amount: getFinalTotal(),
        status: 'pending',
        payment_status: 'pending',
        table_number: tableNumber,
        special_instructions: specialInstructions,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Add to mock orders
      mockOrders.unshift(newOrder);
      
      // Create order items
      cart.forEach(cartItem => {
        mockOrderItems.push({
          id: `item-${Date.now()}-${cartItem.item.id}`,
          order_id: newOrder.id,
          menu_item_id: cartItem.item.id,
          quantity: cartItem.quantity,
          price: cartItem.item.price
        });
      });

      toast.success('Order placed successfully! You can pay after delivery.');
      setCart([]);
      setSpecialInstructions('');
      fetchOrders();
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (order: Order) => {
    if (!user) return;

    try {
      setPaymentLoading(order.id);
      
      console.log('Creating checkout session for order:', order.id, 'Amount:', order.total_amount);
      
      // Create a dynamic price for the order total
      const checkoutData = await createCheckoutSession({
        price_id: '', // Empty since we're using dynamic pricing
        success_url: `${window.location.origin}/success?order_id=${order.id}`,
        cancel_url: `${window.location.origin}/?payment=cancelled`,
        mode: 'payment',
        orderId: order.id,
        amount: Math.round(order.total_amount * 100), // Convert to cents
      });

      console.log('Checkout session created:', checkoutData);

      if (checkoutData.url) {
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

  const handleInPersonPayment = (order: Order) => {
    setShowInPersonPayment(order.id);
  };

  const handleInPersonPaymentSuccess = () => {
    if (showInPersonPayment) {
      // Update order payment status
      const orderIndex = mockOrders.findIndex(order => order.id === showInPersonPayment);
      if (orderIndex !== -1) {
        mockOrders[orderIndex] = {
          ...mockOrders[orderIndex],
          payment_status: 'paid',
          updated_at: new Date().toISOString()
        };
      }
      toast.success('In-person payment completed successfully!');
      setShowInPersonPayment(null);
      fetchOrders();
    }
  };

  const handleInPersonPaymentCancel = () => {
    setShowInPersonPayment(null);
  };

  const groupedMenuItems = menuItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'confirmed':
      case 'preparing':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'ready':
      case 'delivered':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const canPayForOrder = (order: Order) => {
    return order.status === 'delivered' && order.payment_status === 'pending';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Menu */}
      <div className="lg:col-span-2">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Our Menu</h2>
        
        {Object.entries(groupedMenuItems).map(([category, items]) => (
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
        ))}
      </div>

      {/* Cart & Orders */}
      <div className="space-y-6">
        {/* Payment Gateway Promotion */}
        <div className="bg-gradient-to-r from-amber-50 to-amber-100 rounded-lg shadow-sm border border-amber-200">
          <div className="p-4">
            <div className="flex items-center mb-2">
              <Shield className="h-5 w-5 text-amber-600 mr-2" />
              <h3 className="font-semibold text-amber-800">Secure Payment Gateway</h3>
            </div>
            <p className="text-sm text-amber-700 mb-3">
              Enable secure payment processing for your orders with our premium payment gateway.
            </p>
            <Link
              to="/payment-gateway"
              className="inline-flex items-center px-3 py-1.5 bg-amber-600 text-white text-sm font-medium rounded-md hover:bg-amber-700 transition-colors"
            >
              Learn More
            </Link>
          </div>
        </div>

        {/* Cart */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-gray-900 flex items-center">
              <ShoppingCart className="h-5 w-5 mr-2" />
              Your Cart ({cart.reduce((sum, item) => sum + item.quantity, 0)})
            </h3>
          </div>
          
          <div className="p-4">
            {cart.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Your cart is empty</p>
            ) : (
              <>
                <div className="space-y-3 mb-4">
                  {cart.map(cartItem => (
                    <div key={cartItem.item.id} className="flex justify-between items-center">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{cartItem.item.name}</p>
                        <p className="text-amber-600 font-semibold">£{cartItem.item.price.toFixed(2)}</p>
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
                      Table Number
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={tableNumber}
                      onChange={(e) => setTableNumber(parseInt(e.target.value))}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Special Instructions
                    </label>
                    <textarea
                      value={specialInstructions}
                      onChange={(e) => setSpecialInstructions(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                      placeholder="Any special requests..."
                    />
                  </div>

                  <div className="border-t pt-3 space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span>Subtotal:</span>
                      <span>£{getSubtotal().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span>Tax:</span>
                      <span>£{getTaxAmount().toFixed(2)}</span>
                    </div>
                    <div className="text-xs text-gray-500 space-y-1">
                      {cart.map((cartItem, index) => (
                        <div key={index} className="flex justify-between">
                          <span>{cartItem.item.name} (Tax: {cartItem.item.tax_rate}%)</span>
                          <span>£{(cartItem.item.price * cartItem.quantity * cartItem.item.tax_rate / 100).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between items-center font-bold text-lg border-t pt-2">
                      <span>Total:</span>
                      <span className="text-amber-600">£{getFinalTotal().toFixed(2)}</span>
                    </div>
                  </div>

                  <button
                    onClick={createOrder}
                    disabled={loading}
                    className="w-full bg-amber-600 text-white py-2 px-4 rounded-md hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Place Order (Pay After Delivery)
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-gray-900">Recent Orders</h3>
          </div>
          
          <div className="p-4">
            {orders.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No orders yet</p>
            ) : (
              <div className="space-y-3">
                {orders.slice(0, 5).map(order => (
                  <div key={order.id} className="border rounded-md p-3">
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <span className="text-sm font-medium">Order #{order.id.slice(-6)}</span>
                        <span className="text-xs text-gray-500 ml-2">Table {order.table_number}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(order.status)}
                        <span className="text-sm capitalize">{order.status}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-sm mb-2">
                      <span>£{order.total_amount.toFixed(2)}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        order.payment_status === 'pending' 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : order.payment_status === 'paid'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {order.payment_status === 'pending' ? 'Payment Pending' : 
                         order.payment_status === 'paid' ? 'Paid' : order.payment_status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 text-right">
                      {new Date(order.created_at).toLocaleTimeString()}
                    </div>
                    {canPayForOrder(order) && (
                      <div className="mt-2 space-y-2">
                        <button
                          onClick={() => handlePayment(order)}
                          disabled={paymentLoading === order.id}
                          className="w-full bg-blue-600 text-white py-1.5 px-3 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center text-sm font-medium"
                        >
                          {paymentLoading === order.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          ) : (
                            <CreditCard className="h-4 w-4 mr-2" />
                          )}
                          {paymentLoading === order.id ? 'Processing...' : 'Pay Online'}
                        </button>
                        
                        <button
                          onClick={() => handleInPersonPayment(order)}
                          className="w-full bg-green-600 text-white py-1.5 px-3 rounded-md hover:bg-green-700 transition-colors flex items-center justify-center text-sm font-medium"
                        >
                          <Smartphone className="h-4 w-4 mr-2" />
                          Accept In-Person Payment
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* In-Person Payment Modal */}
      {showInPersonPayment && (
        <InPersonPayment
          orderId={showInPersonPayment}
          amount={orders.find(o => o.id === showInPersonPayment)?.total_amount || 0}
          onSuccess={handleInPersonPaymentSuccess}
          onCancel={handleInPersonPaymentCancel}
        />
      )}
    </div>
  );
};

export default CustomerDashboard;