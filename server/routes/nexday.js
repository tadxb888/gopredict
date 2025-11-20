const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const LICENSE_ID = '3561334610044732';
const API_BASE = 'http://175.110.113.174:8080';

/**
 * @route   GET /api/nexday/endpoints
 * @desc    Get Nexday signed CloudFront URLs
 * @access  Private
 */
router.get(
  '/endpoints',
  authenticate,
  asyncHandler(async (req, res) => {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(
      `${API_BASE}/api/v1/client/${LICENSE_ID}/endpoints`
    );
    
    const data = await response.json();
    res.json(data);
  })
);

/**
 * @route   GET /api/nexday/data
 * @desc    Proxy CloudFront data requests
 * @access  Private
 */
router.get(
  '/data',
  authenticate,
  asyncHandler(async (req, res) => {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL parameter required' });
    }
    
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(url);
    const data = await response.json();
    
    res.json(data);
  })
);

module.exports = router;
