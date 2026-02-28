const express = require('express');
const {
    getBalance,
    createDeposit,
    handleNowPaymentsIPN
} = require('../controllers/walletController');

const router = express.Router();

// Import protect middleware
const { protect } = require('../middleware/auth');

// This IPN route must be public for NowPayments to access it
router.post('/nowpayments-ipn', handleNowPaymentsIPN);

// All routes below this will be protected
router.use(protect);

router.get('/balance', getBalance);
router.post('/deposit', createDeposit);

module.exports = router;
