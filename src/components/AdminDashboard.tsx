import React, { useState, useEffect } from 'react';
import { MenuItem, mockMenuItems, mockCompanies } from '../lib/mockData';
import { supabase } from '../lib/supabase';
import { getTableSessions } from '../services/tableSessionService';
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  ShoppingBag, 
  Plus,
  Edit,
  Trash2,
  Settings,
  CreditCard,
  Clock,
  CheckCircle,
  Printer,
  Coffee,
  Utensils
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

// Part Orders and Table Sessions interfaces (matching ServerDashboard)
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
  payment_status?: 'pending' | 'paid' | 'failed';
}

interface DashboardStats {
  totalRevenue: number;
  totalSessions: number;
  totalPartOrders: number;
  totalCustomers: number;
  averageSessionValue: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    totalSessions: 0,
    totalPartOrders: 0,
    totalCustomers: 0,
    averageSessionValue: 0
  });
  const [tableSessions, setTableSessions] = useState<TableSession[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'sessions' | 'menu'>('overview');
  const [reportPeriod, setReportPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [showMenuForm, setShowMenuForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [menuForm, setMenuForm] = useState({
    name: '',
    description: '',
    price: '',
    category: 'appetizer',
    company: '',
    tax_rate: '8.5',
    food_category: 'Cooked',
    available: true
  });

  useEffect(() => {
    fetchDashboardData();
  }, [reportPeriod]);

  const fetchDashboardData = async () => {
    try {
      // Calculate date range based on report period
      const now = new Date();
      let startDate: Date;

      switch (reportPeriod) {
        case 'daily':
          startDate = new Date(now);
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'weekly':
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 7);
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'monthly':
          startDate = new Date(now);
          startDate.setMonth(now.getMonth() - 1);
          startDate.setHours(0, 0, 0, 0);
          break;
      }

      // Fetch table sessions from database with date filter
      const { data, error } = await supabase
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
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data to match the component's expected format
      const sessions: TableSession[] = (data || []).map((session: any) => ({
        table_number: session.table_number,
        customer_name: session.customer_name || 'Guest',
        total_amount: parseFloat(session.total_amount || 0),
        status: session.status,
        created_at: session.created_at,
        payment_status: session.payment_status,
        part_orders: (session.part_orders || []).map((po: any) => ({
          id: po.id,
          table_number: po.table_number,
          status: po.status,
          created_at: po.created_at,
          printed_at: po.printed_at,
          items: (po.part_order_items || []).map((item: any) => ({
            item: item.menu_items,
            quantity: item.quantity
          }))
        }))
      }));

      // Calculate stats from table sessions
      const paidSessions = sessions.filter(s => s.payment_status === 'paid');
      const totalRevenue = paidSessions.reduce((sum, session) => sum + session.total_amount, 0);
      const totalPartOrders = sessions.reduce((sum, session) => sum + session.part_orders.length, 0);
      const uniqueCustomers = new Set(sessions.map(s => s.customer_name)).size;
      const averageSessionValue = paidSessions.length > 0 ? totalRevenue / paidSessions.length : 0;

      setStats({
        totalRevenue,
        totalSessions: paidSessions.length,
        totalPartOrders,
        totalCustomers: uniqueCustomers,
        averageSessionValue
      });

      // Sort sessions by creation time
      const sortedSessions = sessions
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setTableSessions(sortedSessions);
      
      // Set menu items
      const sortedMenuItems = [...mockMenuItems].sort((a, b) => {
        if (a.category !== b.category) {
          return a.category.localeCompare(b.category);
        }
        return a.name.localeCompare(b.name);
      });
      setMenuItems(sortedMenuItems);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleMenuSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const menuData = {
        id: editingItem?.id || `menu-${Date.now()}`,
        ...menuForm,
        price: parseFloat(menuForm.price),
        tax_rate: parseFloat(menuForm.tax_rate),
        created_at: editingItem?.created_at || new Date().toISOString()
      };

      if (editingItem) {
        // Update existing item
        const itemIndex = mockMenuItems.findIndex(item => item.id === editingItem.id);
        if (itemIndex !== -1) {
          mockMenuItems[itemIndex] = menuData as MenuItem;
        }
        toast.success('Menu item updated successfully');
      } else {
        // Add new item
        mockMenuItems.push(menuData as MenuItem);
        toast.success('Menu item added successfully');
      }

      setShowMenuForm(false);
      setEditingItem(null);
      setMenuForm({
        name: '',
        description: '',
        price: '',
        category: 'appetizer',
        company: '',
        tax_rate: '8.5',
        food_category: 'Cooked',
        available: true
      });
      fetchDashboardData();
    } catch (error) {
      console.error('Error saving menu item:', error);
      toast.error('Failed to save menu item');
    }
  };

  const handleEditItem = (item: MenuItem) => {
    setEditingItem(item);
    setMenuForm({
      name: item.name,
      description: item.description,
      price: item.price.toString(),
      category: item.category,
      company: item.company,
      tax_rate: item.tax_rate.toString(),
      food_category: item.food_category,
      available: item.available
    });
    setShowMenuForm(true);
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this menu item?')) {
      return;
    }

    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));

      // Remove item from mock data
      const itemIndex = mockMenuItems.findIndex(item => item.id === itemId);
      if (itemIndex !== -1) {
        mockMenuItems.splice(itemIndex, 1);
      }

      toast.success('Menu item deleted successfully');
      fetchDashboardData();
    } catch (error) {
      console.error('Error deleting menu item:', error);
      toast.error('Failed to delete menu item');
    }
  };

  const getPartOrderStatusIcon = (status: PartOrder['status']) => {
    switch (status) {
      case 'draft':
        return <Clock className="h-3 w-3 text-gray-500" />;
      case 'sent_to_kitchen':
        return <Printer className="h-3 w-3 text-blue-500" />;
      case 'preparing':
        return <Coffee className="h-3 w-3 text-orange-500" />;
      case 'ready':
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'served':
        return <Utensils className="h-3 w-3 text-purple-500" />;
      default:
        return <Clock className="h-3 w-3 text-gray-500" />;
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-yellow-600 bg-yellow-50';
      case 'ready_to_close':
        return 'text-blue-600 bg-blue-50';
      case 'closed':
        return 'text-green-600 bg-green-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <Settings className="h-8 w-8 mr-3 text-purple-600" />
          Admin Dashboard
        </h1>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { key: 'overview', label: 'Overview' },
              { key: 'sessions', label: 'Table Sessions' },
              { key: 'menu', label: 'Menu Management' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } transition-colors`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Report Period Filter */}
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Reports</h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => setReportPeriod('daily')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    reportPeriod === 'daily'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Daily
                </button>
                <button
                  onClick={() => setReportPeriod('weekly')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    reportPeriod === 'weekly'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Weekly
                </button>
                <button
                  onClick={() => setReportPeriod('monthly')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    reportPeriod === 'monthly'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Monthly
                </button>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-md">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">£{stats.totalRevenue.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-md">
                  <ShoppingBag className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Table Sessions</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalSessions}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-md">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Part Orders</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalPartOrders}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center">
                <div className="p-2 bg-indigo-100 rounded-md">
                  <Users className="h-6 w-6 text-indigo-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Customers</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalCustomers}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-md">
                  <TrendingUp className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Avg Session Value</p>
                  <p className="text-2xl font-bold text-gray-900">£{stats.averageSessionValue.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Sessions Preview */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Recent Table Sessions</h3>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {tableSessions.slice(0, 5).map((session) => (
                  <div key={`${session.table_number}-${session.created_at}`} className="flex justify-between items-center py-2">
                    <div>
                      <p className="font-medium">Table {session.table_number}</p>
                      <p className="text-sm text-gray-500">
                        {session.customer_name} • {session.part_orders.length} part orders • {format(new Date(session.created_at), 'MMM dd, HH:mm')}
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="font-semibold">£{session.total_amount.toFixed(2)}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                        {session.status.replace('_', ' ')}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        session.payment_status === 'paid' 
                          ? 'text-green-600 bg-green-50'
                          : session.payment_status === 'pending'
                          ? 'text-yellow-600 bg-yellow-50'
                          : 'text-red-600 bg-red-50'
                      }`}>
                        {session.payment_status || 'pending'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'sessions' && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">All Table Sessions</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Table & Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Part Orders
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Session Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tableSessions.map((session) => (
                  <tr key={`${session.table_number}-${session.created_at}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      Table {session.table_number}
                      <div className="text-xs text-gray-500">{session.customer_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="space-y-1">
                        {session.part_orders.map((partOrder, index) => (
                          <div key={partOrder.id} className="flex items-center space-x-2">
                            <span className="text-xs">#{index + 1}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPartOrderStatusColor(partOrder.status)}`}>
                              {getPartOrderStatusIcon(partOrder.status)}
                              <span className="ml-1">{partOrder.status.replace('_', ' ')}</span>
                            </span>
                            <span className="text-xs text-gray-500">
                              {partOrder.items.reduce((sum, item) => sum + item.quantity, 0)} items
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      £{session.total_amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                        {session.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        session.payment_status === 'paid' 
                          ? 'text-green-600 bg-green-50'
                          : session.payment_status === 'pending'
                          ? 'text-yellow-600 bg-yellow-50'
                          : 'text-red-600 bg-red-50'
                      }`}>
                        {session.payment_status || 'pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(session.created_at), 'MMM dd, yyyy HH:mm')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'menu' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Menu Items</h3>
              <button
                onClick={() => setShowMenuForm(true)}
                className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </button>
            </div>

            {showMenuForm && (
              <div className="p-6 border-b bg-gray-50">
                <form onSubmit={handleMenuSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      required
                      value={menuForm.name}
                      onChange={(e) => setMenuForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                    <input
                      type="text"
                      required
                      value={menuForm.company}
                      onChange={(e) => setMenuForm(prev => ({ ...prev, company: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="Enter company name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={menuForm.price}
                      onChange={(e) => setMenuForm(prev => ({ ...prev, price: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tax Rate (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      required
                      value={menuForm.tax_rate}
                      onChange={(e) => setMenuForm(prev => ({ ...prev, tax_rate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="8.5"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                      value={menuForm.category}
                      onChange={(e) => setMenuForm(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="appetizer">Appetizer</option>
                      <option value="main">Main Course</option>
                      <option value="dessert">Dessert</option>
                      <option value="beverage">Beverage</option>
                    </select>
                  </div>

                  <div className="flex items-center">
                    <div className="w-full">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Food Category</label>
                      <select
                        value={menuForm.food_category}
                        onChange={(e) => setMenuForm(prev => ({ ...prev, food_category: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="Raw">Raw</option>
                        <option value="Cooked">Cooked</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-center">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={menuForm.available}
                        onChange={(e) => setMenuForm(prev => ({ ...prev, available: e.target.checked }))}
                        className="mr-2"
                      />
                      Available
                    </label>
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={menuForm.description}
                      onChange={(e) => setMenuForm(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div className="md:col-span-3 flex space-x-3">
                    <button
                      type="submit"
                      className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
                    >
                      {editingItem ? 'Update' : 'Add'} Item
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenuForm(false);
                        setEditingItem(null);
                        setMenuForm({
                          name: '',
                          description: '',
                          price: '',
                          category: 'appetizer',
                          company: '',
                          tax_rate: '8.5',
                          food_category: 'Cooked',
                          available: true
                        });
                      }}
                      className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {menuItems.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold">{item.name}</h4>
                        <p className="text-sm text-gray-600 capitalize">{item.category} • {item.food_category}</p>
                        <div className="text-xs text-gray-500">
                          <span className="font-medium">{item.company}</span>
                          {mockCompanies.find(c => c.name === item.company) && (
                            <span className="ml-1">
                              • {mockCompanies.find(c => c.name === item.company)?.category}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => handleEditItem(item)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-bold text-purple-600">£{item.price.toFixed(2)}</span>
                        <span className="text-xs text-gray-500 ml-2">Tax: {item.tax_rate}%</span>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        item.available 
                          ? 'text-green-600 bg-green-50' 
                          : 'text-red-600 bg-red-50'
                      }`}>
                        {item.available ? 'Available' : 'Unavailable'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}