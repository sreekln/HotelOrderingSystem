import React, { useState, useEffect } from 'react';
import { MenuItem } from '../lib/supabase';
import { supabase } from '../lib/supabase';
import { getTableSessions } from '../services/tableSessionService';
import {
  PoundSterling,
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
  Utensils,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import TablesManagement from './TablesManagement';

// Part Orders and Table Sessions interfaces (matching ServerDashboard)
interface PartOrder {
  id: string;
  table_number: string;
  items: { item: MenuItem; quantity: number }[];
  special_instructions?: string;
  status: 'draft' | 'sent_to_kitchen' | 'preparing' | 'ready' | 'served';
  created_at: string;
  printed_at?: string;
}

interface TableSession {
  table_number: string;
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
  const [activeTab, setActiveTab] = useState<'overview' | 'sessions' | 'menu' | 'tables'>('overview');
  const [selectedSession, setSelectedSession] = useState<TableSession | null>(null);
  const [reportFilter, setReportFilter] = useState<'today' | 'week' | 'month' | 'all'>('all');
  const [showMenuForm, setShowMenuForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [menuForm, setMenuForm] = useState({
    name: '',
    description: '',
    price: '',
    category: 'daytime',
    company: '',
    tax_rate: '20',
    food_category: 'Cooked',
    available: true
  });

  useEffect(() => {
    fetchDashboardData();
  }, [reportFilter]);

  const fetchDashboardData = async () => {
    try {
      // Calculate date range based on report filter
      const now = new Date();
      let startDate: Date | null = null;

      switch (reportFilter) {
        case 'today':
          startDate = new Date(now);
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate = new Date(now);
          startDate.setDate(now.getDate() - now.getDay());
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'all':
          startDate = null;
          break;
      }

      // Fetch table sessions from database with date filter
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
        `);

      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }

      const { data, error } = await query.order('created_at', { ascending: false });

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

      // Fetch menu items from database
      const { data: menuData, error: menuError } = await supabase
        .from('menu_items')
        .select('*')
        .is('deleted_at', null)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (menuError) throw menuError;

      setMenuItems(menuData || []);

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
      const menuData = {
        name: menuForm.name,
        description: menuForm.description,
        price: parseFloat(menuForm.price),
        category: menuForm.category,
        company: menuForm.company,
        tax_rate: parseFloat(menuForm.tax_rate),
        food_category: menuForm.food_category,
        available: menuForm.available
      };

      if (editingItem) {
        // Update existing item
        const { error } = await supabase
          .from('menu_items')
          .update(menuData)
          .eq('id', editingItem.id);

        if (error) throw error;
        toast.success('Menu item updated successfully');
      } else {
        // Add new item
        const { error } = await supabase
          .from('menu_items')
          .insert([menuData]);

        if (error) throw error;
        toast.success('Menu item added successfully');
      }

      setShowMenuForm(false);
      setEditingItem(null);
      setMenuForm({
        name: '',
        description: '',
        price: '',
        category: 'daytime',
        company: '',
        tax_rate: '20',
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
      // Soft delete by setting deleted_at timestamp
      const { error } = await supabase
        .from('menu_items')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', itemId);

      if (error) throw error;

      toast.success('Menu item deleted successfully');
      fetchDashboardData();
    } catch (error) {
      console.error('Error deleting menu item:', error);
      toast.error('Failed to delete menu item');
    }
  };

  const handleExportToExcel = () => {
    try {
      // Prepare CSV data
      const csvRows = [];

      // Add headers
      const headers = ['Table Number', 'Customer Name', 'Total Amount', 'Status', 'Payment Status', 'Number of Orders', 'Created At'];
      csvRows.push(headers.join(','));

      // Add data rows
      tableSessions.forEach(session => {
        const row = [
          session.table_number,
          `"${session.customer_name}"`,
          session.total_amount.toFixed(2),
          session.status,
          session.payment_status || 'pending',
          session.part_orders.length,
          format(new Date(session.created_at), 'yyyy-MM-dd HH:mm:ss')
        ];
        csvRows.push(row.join(','));
      });

      // Create CSV content
      const csvContent = csvRows.join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      // Generate filename with current date and filter
      const dateStr = format(new Date(), 'yyyy-MM-dd');
      const filterLabel = reportFilter === 'today' ? 'Today' :
                         reportFilter === 'week' ? 'ThisWeek' :
                         reportFilter === 'month' ? 'ThisMonth' : 'AllTime';
      const filename = `sales-report-${filterLabel}-${dateStr}.csv`;

      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Report exported successfully');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('Failed to export report');
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

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="width" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filter:
            </span>
            <button
              onClick={() => setReportFilter('today')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                reportFilter === 'today'
                  ? 'bg-gray-800 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setReportFilter('week')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                reportFilter === 'week'
                  ? 'bg-gray-800 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => setReportFilter('month')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                reportFilter === 'month'
                  ? 'bg-gray-800 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setReportFilter('all')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                reportFilter === 'all'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              All Time
            </button>
          </div>

          <button
            onClick={handleExportToExcel}
            className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition-colors flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Excel
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { key: 'overview', label: 'Overview' },
              { key: 'sessions', label: 'Table Sessions' },
              { key: 'menu', label: 'Menu Management' },
              { key: 'tables', label: 'Tables' }
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
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-md">
                  <PoundSterling className="h-6 w-6 text-green-600" />
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
                  <tr
                    key={`${session.table_number}-${session.created_at}`}
                    onClick={() => setSelectedSession(session)}
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                  >
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
                      <option value="daytime">Daytime</option>
                      <option value="dinner">Dinner</option>
                      <option value="dessert">Dessert</option>
                      <option value="coffeetea">Coffee & Tea</option>
                      <option value="drinks">Drinks</option>
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
                          category: 'daytime',
                          company: '',
                          tax_rate: '20',
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

      {activeTab === 'tables' && (
        <TablesManagement />
      )}

      {/* Session Details Popup */}
      {selectedSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b bg-amber-50 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Table {selectedSession.table_number} Details
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedSession.customer_name} • {format(new Date(selectedSession.created_at), 'MMM dd, yyyy HH:mm')}
                </p>
              </div>
              <button
                onClick={() => setSelectedSession(null)}
                className="p-2 hover:bg-amber-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {/* Status Badges */}
              <div className="flex items-center space-x-3 mb-6">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedSession.status)}`}>
                  Session: {selectedSession.status.replace('_', ' ')}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  selectedSession.payment_status === 'paid'
                    ? 'text-green-600 bg-green-50'
                    : selectedSession.payment_status === 'pending'
                    ? 'text-yellow-600 bg-yellow-50'
                    : 'text-red-600 bg-red-50'
                }`}>
                  Payment: {selectedSession.payment_status || 'pending'}
                </span>
              </div>

              {/* Part Orders */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 text-lg">
                  Part Orders ({selectedSession.part_orders.length})
                </h3>

                {selectedSession.part_orders.map((partOrder, index) => (
                  <div key={partOrder.id} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <span className="font-medium text-gray-900">Part Order #{index + 1}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPartOrderStatusColor(partOrder.status)}`}>
                          {getPartOrderStatusIcon(partOrder.status)}
                          <span className="ml-1">{partOrder.status.replace('_', ' ')}</span>
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {format(new Date(partOrder.created_at), 'HH:mm:ss')}
                      </span>
                    </div>

                    {/* Items Table */}
                    <div className="bg-white rounded border">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100 border-b">
                          <tr>
                            <th className="px-4 py-2 text-left font-medium text-gray-700">Item</th>
                            <th className="px-4 py-2 text-center font-medium text-gray-700">Quantity</th>
                            <th className="px-4 py-2 text-right font-medium text-gray-700">Unit Price</th>
                            <th className="px-4 py-2 text-right font-medium text-gray-700">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {partOrder.items.map(({ item, quantity }) => (
                            <tr key={item.id}>
                              <td className="px-4 py-2">
                                <div className="font-medium text-gray-900">{item.name}</div>
                                <div className="text-xs text-gray-500">{item.category}</div>
                              </td>
                              <td className="px-4 py-2 text-center">{quantity}</td>
                              <td className="px-4 py-2 text-right">£{item.price.toFixed(2)}</td>
                              <td className="px-4 py-2 text-right font-medium">£{(item.price * quantity).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-50 border-t">
                          <tr>
                            <td colSpan={3} className="px-4 py-2 text-right font-medium text-gray-700">
                              Part Order Total:
                            </td>
                            <td className="px-4 py-2 text-right font-bold text-gray-900">
                              £{partOrder.items.reduce((sum, { item, quantity }) => sum + (item.price * quantity), 0).toFixed(2)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {partOrder.special_instructions && (
                      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                        <p className="text-xs font-medium text-yellow-800 mb-1">Special Instructions:</p>
                        <p className="text-sm text-yellow-900">{partOrder.special_instructions}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Session Total */}
              <div className="mt-6 pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">Session Total:</span>
                  <span className="text-2xl font-bold text-amber-600">
                    £{selectedSession.total_amount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end">
              <button
                onClick={() => setSelectedSession(null)}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}