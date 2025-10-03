import React, { useState, useEffect } from 'react';
import { Order, OrderItem, MenuItem, mockOrders, mockUsers, mockMenuItems, mockOrderItems, getOrderItemsWithMenuItems, calculateCartTax, calculateCartTotal } from '../lib/mockData';
import { Clock, CheckCircle, AlertCircle, ChefHat, Edit, Save, X, Plus, Minus, Trash2, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface OrderWithItems extends Order {
  order_items: (OrderItem & {
    menu_item: MenuItem;
  })[];
  customer: {
    full_name: string;
  };
}

interface EditOrderItem {
  id: string;
  menu_item_id: string;
  quantity: number;
  price: number;
  menu_item: MenuItem;
  isNew?: boolean;
}

const KitchenDashboard: React.FC = () => {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'confirmed' | 'preparing' | 'ready'>('pending');
  const [editingOrder, setEditingOrder] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    tableNumber: number;
    specialInstructions: string;
    items: EditOrderItem[];
  }>({
    tableNumber: 1,
    specialInstructions: '',
    items: []
  });
  const [showAddItem, setShowAddItem] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [availableItems, setAvailableItems] = useState<MenuItem[]>([]);

  useEffect(() => {
    fetchOrders();
    setAvailableItems(mockMenuItems.filter(item => item.available));
  }, []);

  const fetchOrders = async () => {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const kitchenOrders = mockOrders
        .filter(order => ['pending', 'confirmed', 'preparing', 'ready'].includes(order.status))
        .map(order => ({
          ...order,
          customer: mockUsers.find(user => user.id === order.customer_id) || { full_name: 'Unknown Customer' },
          order_items: getOrderItemsWithMenuItems(order.id)
        }))
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      
      setOrders(kitchenOrders as OrderWithItems[]);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Update order status in mock data
      const orderIndex = mockOrders.findIndex(order => order.id === orderId);
      if (orderIndex !== -1) {
        mockOrders[orderIndex] = {
          ...mockOrders[orderIndex],
          status: status as any,
          updated_at: new Date().toISOString()
        };
      }
      
      toast.success(`Order status updated to ${status}`);
      fetchOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Failed to update order status');
    }
  };

  const startEditingOrder = (order: OrderWithItems) => {
    setEditingOrder(order.id);
    setEditForm({
      tableNumber: order.table_number || 1,
      specialInstructions: order.special_instructions || '',
      items: order.order_items.map(item => ({
        id: item.id,
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        price: item.price,
        menu_item: item.menu_item,
        isNew: false
      }))
    });
    setShowAddItem(false);
    setSearchTerm('');
  };

  const cancelEditing = () => {
    setEditingOrder(null);
    setEditForm({
      tableNumber: 1,
      specialInstructions: '',
      items: []
    });
    setShowAddItem(false);
    setSearchTerm('');
  };

  const calculateOrderTotals = (items: EditOrderItem[]) => {
    const cartItems = items.map(item => ({
      item: item.menu_item,
      quantity: item.quantity
    }));
    
    return calculateCartTotal(cartItems);
  };

  const saveOrderChanges = async (orderId: string) => {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const totals = calculateOrderTotals(editForm.items);
      
      // Update order in mock data
      const orderIndex = mockOrders.findIndex(order => order.id === orderId);
      if (orderIndex !== -1) {
        mockOrders[orderIndex] = {
          ...mockOrders[orderIndex],
          table_number: editForm.tableNumber,
          special_instructions: editForm.specialInstructions,
          subtotal: totals.subtotal,
          tax_amount: totals.tax,
          total_amount: totals.total,
          updated_at: new Date().toISOString()
        };
      }
      
      // Remove old order items
      const oldItemIds = mockOrderItems
        .filter(item => item.order_id === orderId)
        .map(item => item.id);
      
      oldItemIds.forEach(itemId => {
        const itemIndex = mockOrderItems.findIndex(item => item.id === itemId);
        if (itemIndex !== -1) {
          mockOrderItems.splice(itemIndex, 1);
        }
      });
      
      // Add updated order items
      editForm.items.forEach(editItem => {
        const newOrderItem: OrderItem = {
          id: editItem.isNew ? `item-${Date.now()}-${editItem.menu_item_id}` : editItem.id,
          order_id: orderId,
          menu_item_id: editItem.menu_item_id,
          quantity: editItem.quantity,
          price: editItem.menu_item.price
        };
        mockOrderItems.push(newOrderItem);
      });
      
      toast.success('Order updated successfully');
      setEditingOrder(null);
      fetchOrders();
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Failed to update order');
    }
  };

  const updateItemQuantity = (itemId: string, delta: number) => {
    setEditForm(prev => ({
      ...prev,
      items: prev.items.map(item => 
        item.id === itemId 
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item
      )
    }));
  };

  const removeItem = (itemId: string) => {
    setEditForm(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }));
    toast.success('Item removed from order');
  };

  const addItemToOrder = (menuItem: MenuItem) => {
    const existingItem = editForm.items.find(item => item.menu_item_id === menuItem.id);
    
    if (existingItem) {
      // Increase quantity if item already exists
      updateItemQuantity(existingItem.id, 1);
      toast.success(`Increased ${menuItem.name} quantity`);
    } else {
      // Add new item
      const newItem: EditOrderItem = {
        id: `new-${Date.now()}-${menuItem.id}`,
        menu_item_id: menuItem.id,
        quantity: 1,
        price: menuItem.price,
        menu_item: menuItem,
        isNew: true
      };
      
      setEditForm(prev => ({
        ...prev,
        items: [...prev.items, newItem]
      }));
      toast.success(`${menuItem.name} added to order`);
    }
  };

  const filteredOrders = orders.filter(order => order.status === activeTab);
  const filteredMenuItems = availableItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'confirmed':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'preparing':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'ready':
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <AlertCircle className="h-4 w-4" />;
      case 'confirmed':
        return <Clock className="h-4 w-4" />;
      case 'preparing':
        return <ChefHat className="h-4 w-4" />;
      case 'ready':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getNextAction = (status: string) => {
    switch (status) {
      case 'pending':
        return { label: 'Confirm Order', nextStatus: 'confirmed', color: 'bg-blue-600 hover:bg-blue-700' };
      case 'confirmed':
        return { label: 'Start Preparing', nextStatus: 'preparing', color: 'bg-orange-600 hover:bg-orange-700' };
      case 'preparing':
        return { label: 'Mark Ready', nextStatus: 'ready', color: 'bg-green-600 hover:bg-green-700' };
      case 'ready':
        return { label: 'Mark Delivered', nextStatus: 'delivered', color: 'bg-purple-600 hover:bg-purple-700' };
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <ChefHat className="h-8 w-8 mr-3 text-orange-600" />
          Kitchen Dashboard
        </h1>
        <div className="text-sm text-gray-600">
          Active Orders: {orders.filter(o => ['pending', 'confirmed', 'preparing'].includes(o.status)).length}
        </div>
      </div>

      {/* Status Tabs */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { key: 'pending', label: 'Pending', count: orders.filter(o => o.status === 'pending').length },
              { key: 'confirmed', label: 'Confirmed', count: orders.filter(o => o.status === 'confirmed').length },
              { key: 'preparing', label: 'Preparing', count: orders.filter(o => o.status === 'preparing').length },
              { key: 'ready', label: 'Ready', count: orders.filter(o => o.status === 'ready').length },
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

      {/* Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredOrders.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <ChefHat className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No {activeTab} orders</p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const nextAction = getNextAction(order.status);
            const isEditing = editingOrder === order.id;
            const orderTotals = isEditing ? calculateOrderTotals(editForm.items) : null;
            
            return (
              <div key={order.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                {/* Order Header */}
                <div className="p-4 border-b">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        Order #{order.id.slice(-6)}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {order.customer.full_name}
                      </p>
                      <div className="flex items-center mt-1">
                        <span className="text-lg font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-md">
                          Table {isEditing ? editForm.tableNumber : order.table_number}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {order.status === 'pending' && !isEditing && (
                        <button
                          onClick={() => startEditingOrder(order)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="Edit Order"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      )}
                      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                        {getStatusIcon(order.status)}
                        <span className="ml-1.5 capitalize">{order.status}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">
                      {format(new Date(order.created_at), 'HH:mm')}
                    </span>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">
                        £{(isEditing ? orderTotals?.total : order.total_amount)?.toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-500">
                        (Tax: £{(isEditing ? orderTotals?.tax : order.tax_amount)?.toFixed(2)})
                      </div>
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div className="p-4">
                  {isEditing && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-3">Edit Order Details</h4>
                      
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="block text-sm font-medium text-blue-800 mb-1">
                            Table Number
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={editForm.tableNumber}
                            onChange={(e) => setEditForm(prev => ({ ...prev, tableNumber: parseInt(e.target.value) || 1 }))}
                            className="w-full px-2 py-1 border border-blue-300 rounded text-sm"
                          />
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-blue-800 mb-1">
                          Special Instructions
                        </label>
                        <textarea
                          value={editForm.specialInstructions}
                          onChange={(e) => setEditForm(prev => ({ ...prev, specialInstructions: e.target.value }))}
                          rows={2}
                          className="w-full px-2 py-1 border border-blue-300 rounded text-sm"
                          placeholder="Any special requests..."
                        />
                      </div>

                      {/* Add Item Section */}
                      <div className="mb-3">
                        <div className="flex justify-between items-center mb-2">
                          <label className="block text-sm font-medium text-blue-800">
                            Order Items
                          </label>
                          <button
                            onClick={() => setShowAddItem(!showAddItem)}
                            className="flex items-center px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add Item
                          </button>
                        </div>

                        {showAddItem && (
                          <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded">
                            <div className="mb-2">
                              <div className="relative">
                                <Search className="absolute left-2 top-1.5 h-3 w-3 text-gray-400" />
                                <input
                                  type="text"
                                  placeholder="Search menu items..."
                                  value={searchTerm}
                                  onChange={(e) => setSearchTerm(e.target.value)}
                                  className="w-full pl-7 pr-2 py-1 border border-green-300 rounded text-xs"
                                />
                              </div>
                            </div>
                            <div className="max-h-32 overflow-y-auto space-y-1">
                              {filteredMenuItems.slice(0, 5).map(item => (
                                <button
                                  key={item.id}
                                  onClick={() => addItemToOrder(item)}
                                  className="w-full text-left px-2 py-1 hover:bg-green-100 rounded text-xs flex justify-between items-center"
                                >
                                  <span>{item.name}</span>
                                  <span className="text-green-600 font-medium">£{item.price.toFixed(2)}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={() => saveOrderChanges(order.id)}
                          className="flex items-center px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                        >
                          <Save className="h-3 w-3 mr-1" />
                          Save Changes
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="flex items-center px-3 py-1.5 bg-gray-500 text-white text-sm rounded hover:bg-gray-600 transition-colors"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 mb-4">
                    {(isEditing ? editForm.items : order.order_items).map((item, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <div className="flex-1">
                          <span className="font-medium text-sm">{item.menu_item.name}</span>
                          <div className="text-xs text-gray-500">
                            {item.menu_item.company} • {item.menu_item.food_category} • Tax: {item.menu_item.tax_rate}%
                          </div>
                          <div className="text-xs text-gray-600">
                            £{item.menu_item.price.toFixed(2)} each
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {isEditing ? (
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => updateItemQuantity(item.id, -1)}
                                className="p-1 hover:bg-gray-100 rounded"
                                disabled={item.quantity === 1}
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="font-semibold text-orange-600 min-w-[2rem] text-center">
                                ×{item.quantity}
                              </span>
                              <button
                                onClick={() => updateItemQuantity(item.id, 1)}
                                className="p-1 hover:bg-gray-100 rounded"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => removeItem(item.id)}
                                className="p-1 text-red-600 hover:bg-red-50 rounded ml-2"
                                title="Remove item"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            item.quantity > 1 && (
                              <span className="text-orange-600 font-semibold">×{item.quantity}</span>
                            )
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Order Totals in Edit Mode */}
                  {isEditing && orderTotals && (
                    <div className="mb-4 p-2 bg-gray-50 border border-gray-200 rounded text-sm">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>£{orderTotals.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tax:</span>
                        <span>£{orderTotals.tax.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold border-t pt-1 mt-1">
                        <span>Total:</span>
                        <span>£{orderTotals.total.toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  {order.special_instructions && (
                    <div className="mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded">
                      <p className="text-sm text-yellow-800">
                        <strong>Special Instructions:</strong> {isEditing ? editForm.specialInstructions : order.special_instructions}
                      </p>
                    </div>
                  )}

                  {nextAction && (
                    <button
                      onClick={() => updateOrderStatus(order.id, nextAction.nextStatus)}
                      className={`w-full py-2 px-4 rounded-md text-white text-sm font-medium transition-colors ${nextAction.color}`}
                      disabled={isEditing}
                    >
                      {nextAction.label}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default KitchenDashboard;