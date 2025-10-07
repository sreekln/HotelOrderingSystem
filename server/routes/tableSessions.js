const express = require('express');
const TableSession = require('../models/TableSession');
const PartOrder = require('../models/PartOrder');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all table sessions
router.get('/', authenticateToken, async (req, res) => {
  try {
    const filters = {};
    
    if (req.query.status) {
      filters.status = req.query.status;
    }
    
    if (req.query.table_number) {
      filters.table_number = parseInt(req.query.table_number);
    }
    
    const sessions = await TableSession.findAll(filters);
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching table sessions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get table session by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const session = await TableSession.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Table session not found' });
    }
    res.json(session);
  } catch (error) {
    console.error('Error fetching table session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create table session
router.post('/', authenticateToken, requireRole(['server', 'admin']), async (req, res) => {
  try {
    const session = await TableSession.create(req.body);
    res.status(201).json(session);
  } catch (error) {
    console.error('Error creating table session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update table session status
router.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }
    
    const session = await TableSession.updateStatus(req.params.id, status);
    if (!session) {
      return res.status(404).json({ error: 'Table session not found' });
    }
    
    res.json(session);
  } catch (error) {
    console.error('Error updating table session status:', error);
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
    
    const session = await TableSession.updatePaymentStatus(req.params.id, payment_status);
    if (!session) {
      return res.status(404).json({ error: 'Table session not found' });
    }
    
    res.json(session);
  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add part order to table session
router.post('/:id/part-orders', authenticateToken, requireRole(['server', 'admin']), async (req, res) => {
  try {
    const session = await TableSession.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Table session not found' });
    }
    
    const partOrderData = {
      ...req.body,
      table_session_id: req.params.id,
      table_number: session.table_number
    };
    
    const partOrder = await PartOrder.create(partOrderData);
    
    // Update session total
    await TableSession.updateTotal(req.params.id);
    
    res.status(201).json(partOrder);
  } catch (error) {
    console.error('Error creating part order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get active session for table
router.get('/table/:table_number/active', authenticateToken, async (req, res) => {
  try {
    const session = await TableSession.findByTableNumber(parseInt(req.params.table_number));
    if (!session) {
      return res.status(404).json({ error: 'No active session found for this table' });
    }
    res.json(session);
  } catch (error) {
    console.error('Error fetching active table session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;