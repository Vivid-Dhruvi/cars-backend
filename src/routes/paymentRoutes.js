const express = require('express');
const router = express.Router();
const { initiatePayment, checkoutPayment, handlePaymentIPN } = require('../controllers/paymentController');

router.post('/payment/initiate', initiatePayment);
router.post('/payment/checkout', checkoutPayment);
router.post('/payment/ipn', handlePaymentIPN);

module.exports = router;
