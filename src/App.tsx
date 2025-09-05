import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './lib/mockAuth';
import Layout from './components/Layout';
import Auth from './components/Auth';
import CustomerDashboard from './components/CustomerDashboard';
import KitchenDashboard from './components/KitchenDashboard';
import AdminDashboard from './components/AdminDashboard';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  const getDashboardComponent = () => {
    switch (user.role) {
      case 'kitchen':
        return <KitchenDashboard />;
      case 'admin':
        return <AdminDashboard />;
      case 'customer':
      default:
        return <CustomerDashboard />;
    }
  };

  return (
    <Layout>
      {getDashboardComponent()}
    </Layout>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <AppContent />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
            }}
          />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;