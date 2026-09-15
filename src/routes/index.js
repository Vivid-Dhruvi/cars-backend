const express = require('express');
const router = express.Router();

const inspectionRoutes = require('./inspectionRoutes');
const paymentRoutes = require('./paymentRoutes');
const reportRoutes = require('./reportRoutes');
const uploadRoutes = require('./uploadRoutes');
const adminRoutes = require('./adminRoutes');

// Health Check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'CarsInsure AI Vision Inspection API',
    timestamp: new Date().toISOString()
  });
});

// Mount modular sub-routes under /api
router.use('/', inspectionRoutes);
router.use('/', paymentRoutes);
router.use('/', reportRoutes);
router.use('/', uploadRoutes);
router.use('/', adminRoutes);

module.exports = router;
