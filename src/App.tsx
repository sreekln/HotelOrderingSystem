import React from 'react';
import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { AuthProvider, useAuth } from './lib/auth';
import Layout from './components/Layout';
import Auth from './components/Auth';
import ServerDashboard from './components/CustomerDashboard';
import KitchenDashboard from './components/KitchenDashboard';
import AdminDashboard from './components/AdminDashboard';
import PaymentGateway from './components/PaymentGateway';
import SuccessPage from './components/SuccessPage';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();

  useEffect(() => {
    // Check for payment status in URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');

    if (paymentStatus === 'success') {
      toast.success('Payment successful!');
      // Clean up URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (paymentStatus === 'cancelled') {
      toast.error('Payment was cancelled.');
      // Clean up URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

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
      case 'server':
      default:
        return <ServerDashboard />;
    }
  };

  return (
    <Layout>
      <Routes>
        <Route path="/" element={getDashboardComponent()} />
        <Route path="/payment-gateway" element={<PaymentGateway />} />
        <Route path="/success" element={<SuccessPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
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