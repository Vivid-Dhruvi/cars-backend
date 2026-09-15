const express = require('express');
const router = express.Router();
const { streamPdfReport, sendEmailReport } = require('../controllers/reportController');

router.get('/reports/:id/pdf', streamPdfReport);
router.post('/reports/:id/email', sendEmailReport);

module.exports = router;
