const express = require('express');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Create checkout session
router.post('/checkout', authenticateToken, async (req, res) => {
  try {
    const { price_id, success_url, cancel_url, mode, orderId, amount } = req.body;

    // For now, return a mock response
    // In production, integrate with Stripe API
    const mockSession = {
      id: `cs_${Date.now()}`,
      url: `https://checkout.stripe.com/pay/mock_session_${Date.now()}`,
      success_url,
      cancel_url,
    };

    res.json(mockSession);
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Create payment intent
router.post('/payment-intent', authenticateToken, async (req, res) => {
  try {
    const { amount, currency, orderId } = req.body;

    // For now, return a mock response
    // In production, integrate with Stripe API
    const mockPaymentIntent = {
      id: `pi_${Date.now()}`,
      amount,
      currency,
      status: 'requires_payment_method',
      client_secret: `pi_${Date.now()}_secret_mock`,
    };

    res.json(mockPaymentIntent);
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
});

// Confirm payment intent
router.post('/confirm-payment', authenticateToken, async (req, res) => {
  try {
    const { payment_intent_id, payment_method_id } = req.body;

    // For now, return a mock response
    // In production, integrate with Stripe API
    const mockConfirmation = {
      id: payment_intent_id,
      status: 'succeeded',
      amount: 1000,
      currency: 'gbp',
    };

    res.json(mockConfirmation);
  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
});

module.exports = router;