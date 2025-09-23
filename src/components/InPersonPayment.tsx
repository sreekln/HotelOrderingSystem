import React, { useState, useEffect } from 'react';
import { CreditCard, Smartphone, Wifi, CheckCircle, XCircle, Clock } from 'lucide-react';
import { createPaymentIntent } from '../lib/stripeInPerson';
import toast from 'react-hot-toast';

interface InPersonPaymentProps {
  orderId: string;
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
}

type PaymentStatus = 'idle' | 'creating' | 'waiting_for_payment' | 'processing' | 'succeeded' | 'failed';

const InPersonPayment: React.FC<InPersonPaymentProps> = ({
  orderId,
  amount,
  onSuccess,
  onCancel
}) => {
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle');
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCreatePaymentIntent = async () => {
    try {
      setPaymentStatus('creating');
      setError(null);

      const paymentIntent = await createPaymentIntent({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'gbp',
        orderId,
        capture_method: 'automatic',
        payment_method_types: ['card_present']
      });

      setPaymentIntentId(paymentIntent.id);
      setPaymentStatus('waiting_for_payment');
      toast.success('Payment ready - present card to reader');
    } catch (err: any) {
      console.error('Error creating payment intent:', err);
      setError(err.message || 'Failed to create payment intent');
      setPaymentStatus('failed');
      toast.error('Failed to initialize payment');
    }
  };

  const handleSimulatePayment = async () => {
    if (!paymentIntentId) return;

    try {
      setPaymentStatus('processing');
      
      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Simulate successful payment
      setPaymentStatus('succeeded');
      toast.success('Payment successful!');
      
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (err: any) {
      console.error('Payment failed:', err);
      setPaymentStatus('failed');
      setError('Payment failed - please try again');
      toast.error('Payment failed');
    }
  };

  const getStatusIcon = () => {
    switch (paymentStatus) {
      case 'creating':
        return <Clock className="h-8 w-8 text-blue-500 animate-pulse" />;
      case 'waiting_for_payment':
        return <CreditCard className="h-8 w-8 text-orange-500 animate-pulse" />;
      case 'processing':
        return <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>;
      case 'succeeded':
        return <CheckCircle className="h-8 w-8 text-green-500" />;
      case 'failed':
        return <XCircle className="h-8 w-8 text-red-500" />;
      default:
        return <CreditCard className="h-8 w-8 text-gray-400" />;
    }
  };

  const getStatusMessage = () => {
    switch (paymentStatus) {
      case 'creating':
        return 'Initializing payment...';
      case 'waiting_for_payment':
        return 'Present card to reader or tap to pay';
      case 'processing':
        return 'Processing payment...';
      case 'succeeded':
        return 'Payment successful!';
      case 'failed':
        return error || 'Payment failed';
      default:
        return 'Ready to accept payment';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">In-Person Payment</h2>
          <p className="text-gray-600">Order #{orderId.slice(-6)}</p>
        </div>

        {/* Amount */}
        <div className="text-center mb-8">
          <div className="text-4xl font-bold text-gray-900 mb-2">
            £{amount.toFixed(2)}
          </div>
          <p className="text-gray-500">Total amount to charge</p>
        </div>

        {/* Status Display */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            {getStatusIcon()}
          </div>
          <p className="text-lg font-medium text-gray-900 mb-2">
            {getStatusMessage()}
          </p>
          
          {paymentStatus === 'waiting_for_payment' && (
            <div className="space-y-2">
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                <Wifi className="h-4 w-4" />
                <span>Contactless payments accepted</span>
              </div>
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                <Smartphone className="h-4 w-4" />
                <span>Apple Pay, Google Pay supported</span>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {paymentStatus === 'idle' && (
            <button
              onClick={handleCreatePaymentIntent}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center"
            >
              <CreditCard className="h-5 w-5 mr-2" />
              Start Payment
            </button>
          )}

          {paymentStatus === 'waiting_for_payment' && (
            <button
              onClick={handleSimulatePayment}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              Simulate Card Payment
            </button>
          )}

          {(paymentStatus === 'succeeded' || paymentStatus === 'failed') && (
            <button
              onClick={paymentStatus === 'succeeded' ? onSuccess : onCancel}
              className={`w-full py-3 px-4 rounded-lg transition-colors font-medium ${
                paymentStatus === 'succeeded'
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-600 text-white hover:bg-gray-700'
              }`}
            >
              {paymentStatus === 'succeeded' ? 'Complete' : 'Try Again'}
            </button>
          )}

          {paymentStatus !== 'processing' && paymentStatus !== 'succeeded' && (
            <button
              onClick={onCancel}
              className="w-full bg-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-400 transition-colors font-medium"
            >
              Cancel
            </button>
          )}
        </div>

        {/* Instructions */}
        {paymentStatus === 'waiting_for_payment' && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Payment Instructions:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Insert chip card and follow prompts</li>
              <li>• Tap contactless card or mobile device</li>
              <li>• Swipe magnetic stripe if needed</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default InPersonPayment;