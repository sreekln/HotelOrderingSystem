import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit2, Trash2, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../lib/auth';

interface Table {
  id: string;
  table_name: string;
  created_at: string;
  updated_at: string;
}

const TablesManagement: React.FC = () => {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [newTableName, setNewTableName] = useState('');
  const [addingNew, setAddingNew] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    try {
      const { data, error } = await supabase
        .from('tables')
        .select('*')
        .is('deleted_at', null)
        .order('table_name', { ascending: true });

      if (error) throw error;

      setTables(data || []);
    } catch (error) {
      console.error('Error fetching tables:', error);
      toast.error('Failed to load tables');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTable = async () => {
    if (!newTableName.trim()) {
      toast.error('Please enter a table name');
      return;
    }

    try {
      const { error } = await supabase
        .from('tables')
        .insert({
          table_name: newTableName.trim(),
          created_by: user?.id
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('A table with this name already exists');
        } else {
          throw error;
        }
        return;
      }

      toast.success('Table added successfully');
      setNewTableName('');
      setAddingNew(false);
      fetchTables();
    } catch (error) {
      console.error('Error adding table:', error);
      toast.error('Failed to add table');
    }
  };

  const handleUpdateTable = async (id: string) => {
    if (!editingName.trim()) {
      toast.error('Please enter a table name');
      return;
    }

    try {
      const { error } = await supabase
        .from('tables')
        .update({ table_name: editingName.trim() })
        .eq('id', id);

      if (error) {
        if (error.code === '23505') {
          toast.error('A table with this name already exists');
        } else {
          throw error;
        }
        return;
      }

      toast.success('Table updated successfully');
      setEditingId(null);
      setEditingName('');
      fetchTables();
    } catch (error) {
      console.error('Error updating table:', error);
      toast.error('Failed to update table');
    }
  };

  const handleDeleteTable = async (id: string, tableName: string) => {
    if (!confirm(`Are you sure you want to delete table "${tableName}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('tables')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      toast.success('Table deleted successfully');
      fetchTables();
    } catch (error) {
      console.error('Error deleting table:', error);
      toast.error('Failed to delete table');
    }
  };

  const startEditing = (table: Table) => {
    setEditingId(table.id);
    setEditingName(table.table_name);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName('');
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
        <h2 className="text-xl font-bold text-gray-900">Tables Management</h2>
        {!addingNew && (
          <button
            onClick={() => setAddingNew(true)}
            className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors flex items-center text-sm font-medium"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Table
          </button>
        )}
      </div>

      {addingNew && (
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Add New Table</h3>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={newTableName}
              onChange={(e) => setNewTableName(e.target.value)}
              placeholder="Enter table name (e.g., Table 1, A1, etc.)"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleAddTable();
                }
              }}
            />
            <button
              onClick={handleAddTable}
              className="p-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                setAddingNew(false);
                setNewTableName('');
              }}
              className="p-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border">
        {tables.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">No tables added yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Table Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Last Updated
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {tables.map((table) => (
                  <tr key={table.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      {editingId === table.id ? (
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleUpdateTable(table.id);
                            }
                          }}
                        />
                      ) : (
                        <span className="font-medium text-gray-900">{table.table_name}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(table.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(table.updated_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {editingId === table.id ? (
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleUpdateTable(table.id)}
                            className="p-1 text-green-600 hover:text-green-700"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="p-1 text-gray-600 hover:text-gray-700"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => startEditing(table)}
                            className="p-1 text-amber-600 hover:text-amber-700"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTable(table.id, table.table_name)}
                            className="p-1 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TablesManagement;
