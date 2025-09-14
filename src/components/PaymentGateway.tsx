import React, { useState } from 'react';
import { CreditCard, Shield, Zap, ArrowRight } from 'lucide-react';
import { createCheckoutSession } from '../lib/stripe';
import { stripeProducts } from '../stripe-config';
import toast from 'react-hot-toast';

const PaymentGateway: React.FC = () => {
  const [loading, setLoading] = useState<string | null>(null);

  const paymentGatewayProduct = stripeProducts.find(p => p.name === 'Payment Gateway');

  const handlePurchase = async () => {
    if (!paymentGatewayProduct) {
      toast.error('Product not found');
      return;
    }

    try {
      setLoading(paymentGatewayProduct.id);
      
      const checkoutData = await createCheckoutSession({
        priceId: paymentGatewayProduct.priceId,
        successUrl: `${window.location.origin}/success?price_id=${paymentGatewayProduct.priceId}`,
        cancelUrl: `${window.location.origin}/payment-gateway`,
        mode: paymentGatewayProduct.mode,
      });

      if (checkoutData.url) {
        window.location.href = checkoutData.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Failed to initiate payment');
    } finally {
      setLoading(null);
    }
  };

  if (!paymentGatewayProduct) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Payment gateway product not configured</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Secure Payment Gateway</h1>
        <p className="text-lg text-gray-600">
          Enable secure payment processing for your hotel ordering system
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Features */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-900">Why Choose Our Payment Gateway?</h2>
          
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Shield className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Bank-Level Security</h3>
                <p className="text-gray-600">
                  PCI DSS compliant with end-to-end encryption to protect customer data
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Zap className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Lightning Fast</h3>
                <p className="text-gray-600">
                  Process payments in seconds with our optimized checkout flow
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <CreditCard className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Multiple Payment Methods</h3>
                <p className="text-gray-600">
                  Accept all major credit cards, digital wallets, and local payment methods
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Card */}
        <div className="bg-white rounded-xl shadow-lg border p-8">
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-gray-900">{paymentGatewayProduct.name}</h3>
            <p className="text-gray-600 mt-2">{paymentGatewayProduct.description}</p>
          </div>

          <div className="text-center mb-8">
            <div className="text-4xl font-bold text-amber-600 mb-2">
              £{paymentGatewayProduct.price.toFixed(2)}
            </div>
            <p className="text-gray-500">One-time setup fee</p>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-gray-700">Secure payment processing</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-gray-700">Real-time transaction monitoring</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-gray-700">Automated order status updates</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-gray-700">24/7 customer support</span>
            </div>
          </div>

          <button
            onClick={handlePurchase}
            disabled={loading === paymentGatewayProduct.id}
            className="w-full bg-amber-600 text-white py-4 px-6 rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold flex items-center justify-center"
          >
            {loading === paymentGatewayProduct.id ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            ) : (
              <CreditCard className="h-5 w-5 mr-2" />
            )}
            {loading === paymentGatewayProduct.id ? 'Processing...' : 'Purchase Now'}
            {!loading && <ArrowRight className="h-5 w-5 ml-2" />}
          </button>

          <p className="text-xs text-gray-500 text-center mt-4">
            Secure checkout powered by Stripe. Your payment information is encrypted and secure.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentGateway;