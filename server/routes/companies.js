const express = require('express');
const Company = require('../models/Company');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all companies
router.get('/', authenticateToken, async (req, res) => {
  try {
    const companies = await Company.findAll();
    res.json(companies);
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get company by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }
    res.json(company);
  } catch (error) {
    console.error('Error fetching company:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create company (admin only)
router.post('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const company = await Company.create(req.body);
    res.status(201).json(company);
  } catch (error) {
    console.error('Error creating company:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update company (admin only)
router.put('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const company = await Company.update(req.params.id, req.body);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }
    res.json(company);
  } catch (error) {
    console.error('Error updating company:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete company (admin only)
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    await Company.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting company:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get companies by category
router.get('/category/:category', authenticateToken, async (req, res) => {
  try {
    const companies = await Company.findByCategory(req.params.category);
    res.json(companies);
  } catch (error) {
    console.error('Error fetching companies by category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;