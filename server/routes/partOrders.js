const express = require('express');
const PartOrder = require('../models/PartOrder');
const TableSession = require('../models/TableSession');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all part orders
router.get('/', authenticateToken, async (req, res) => {
  try {
    const filters = {};
    
    if (req.query.status) {
      filters.status = req.query.status;
    }
    
    if (req.query.table_number) {
      filters.table_number = parseInt(req.query.table_number);
    }
    
    if (req.query.table_session_id) {
      filters.table_session_id = req.query.table_session_id;
    }
    
    const partOrders = await PartOrder.findAll(filters);
    res.json(partOrders);
  } catch (error) {
    console.error('Error fetching part orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get part order by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const partOrder = await PartOrder.findById(req.params.id);
    if (!partOrder) {
      return res.status(404).json({ error: 'Part order not found' });
    }
    res.json(partOrder);
  } catch (error) {
    console.error('Error fetching part order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update part order status
router.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }
    
    // Check permissions based on role
    const allowedStatuses = {
      server: ['draft', 'sent_to_kitchen'],
      kitchen: ['sent_to_kitchen', 'preparing', 'ready'],
      admin: ['draft', 'sent_to_kitchen', 'preparing', 'ready', 'served']
    };
    
    if (!allowedStatuses[req.user.role]?.includes(status)) {
      return res.status(403).json({ error: 'Not authorized to set this status' });
    }
    
    const partOrder = await PartOrder.updateStatus(req.params.id, status);
    if (!partOrder) {
      return res.status(404).json({ error: 'Part order not found' });
    }
    
    res.json(partOrder);
  } catch (error) {
    console.error('Error updating part order status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark part order as printed
router.patch('/:id/print', authenticateToken, requireRole(['server', 'kitchen', 'admin']), async (req, res) => {
  try {
    const partOrder = await PartOrder.markPrinted(req.params.id);
    if (!partOrder) {
      return res.status(404).json({ error: 'Part order not found' });
    }
    
    // Also update status to sent_to_kitchen if it's still draft
    if (partOrder.status === 'draft') {
      await PartOrder.updateStatus(req.params.id, 'sent_to_kitchen');
    }
    
    res.json(partOrder);
  } catch (error) {
    console.error('Error marking part order as printed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update part order
router.put('/:id', authenticateToken, requireRole(['server', 'admin']), async (req, res) => {
  try {
    const partOrder = await PartOrder.update(req.params.id, req.body);
    if (!partOrder) {
      return res.status(404).json({ error: 'Part order not found' });
    }
    
    // Update table session total
    await TableSession.updateTotal(partOrder.table_session_id);
    
    res.json(partOrder);
  } catch (error) {
    console.error('Error updating part order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete part order
router.delete('/:id', authenticateToken, requireRole(['server', 'admin']), async (req, res) => {
  try {
    const partOrder = await PartOrder.findById(req.params.id);
    if (!partOrder) {
      return res.status(404).json({ error: 'Part order not found' });
    }
    
    await PartOrder.delete(req.params.id);
    
    // Update table session total
    await TableSession.updateTotal(partOrder.table_session_id);
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting part order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get kitchen queue (for kitchen dashboard)
router.get('/kitchen/queue', authenticateToken, requireRole(['kitchen', 'admin']), async (req, res) => {
  try {
    const partOrders = await PartOrder.getKitchenQueue();
    res.json(partOrders);
  } catch (error) {
    console.error('Error fetching kitchen queue:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;