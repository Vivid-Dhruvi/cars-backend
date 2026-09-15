const express = require('express');
const router = express.Router();
const { getAllInspections, clearAllInspections } = require('../controllers/adminController');

router.get('/admin/inspections', getAllInspections);
router.post('/admin/clear-all', clearAllInspections);

module.exports = router;
