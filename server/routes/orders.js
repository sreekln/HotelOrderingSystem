const express = require('express');
const Order = require('../models/Order');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all orders
router.get('/', authenticateToken, async (req, res) => {
  try {
    const filters = {};
    
    // Apply role-based filtering
    if (req.user.role === 'server') {
      filters.customer_id = req.user.id;
    }
    
    if (req.query.status) {
      filters.status = req.query.status;
    }
    
    const orders = await Order.findAll(filters);
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get order by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Check permissions
    if (req.user.role === 'server' && order.customer_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create order
router.post('/', authenticateToken, requireRole(['server', 'admin']), async (req, res) => {
  try {
    const orderData = {
      ...req.body,
      customer_id: req.user.id
    };
    
    const order = await Order.create(orderData);
    res.status(201).json(order);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update order status
router.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }
    
    // Check permissions based on role
    const allowedStatuses = {
      server: ['pending', 'cancelled'],
      kitchen: ['confirmed', 'preparing', 'ready'],
      admin: ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled']
    };
    
    if (!allowedStatuses[req.user.role]?.includes(status)) {
      return res.status(403).json({ error: 'Not authorized to set this status' });
    }
    
    const order = await Order.updateStatus(req.params.id, status);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json(order);
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update payment status
router.patch('/:id/payment', authenticateToken, requireRole(['server', 'admin']), async (req, res) => {
  try {
    const { payment_status } = req.body;
    
    if (!payment_status) {
      return res.status(400).json({ error: 'Payment status is required' });
    }
    
    const order = await Order.updatePaymentStatus(req.params.id, payment_status);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json(order);
  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;