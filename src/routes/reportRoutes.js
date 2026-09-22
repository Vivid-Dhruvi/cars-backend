const express = require('express');
const router = express.Router();
const { getReportById, streamPdfReport, sendEmailReport, generatePdfFromData } = require('../controllers/reportController');

router.get('/reports/:id', getReportById);
router.get('/reports/:id/pdf', streamPdfReport);
router.post('/reports/:id/email', sendEmailReport);
router.post('/report/pdf', generatePdfFromData);

module.exports = router;
