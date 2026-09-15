const express = require('express');
const router = express.Router();
const { checkoutPayment } = require('../controllers/paymentController');

router.post('/payment/checkout', checkoutPayment);

module.exports = router;
