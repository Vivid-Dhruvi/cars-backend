const express = require('express');
const router = express.Router();
const { analyzeInspection, getInspectionById } = require('../controllers/inspectionController');

router.post('/inspection/analyze', analyzeInspection);
router.get('/inspections/:id', getInspectionById);

module.exports = router;
