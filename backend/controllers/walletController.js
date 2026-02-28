const User = require('../models/User');
const Transaction = require('../models/Transaction');
const NowPaymentsApi = require('@nowpaymentsio/nowpayments-api-js');
const crypto = require('crypto');

// @desc    Get user balance
// @route   GET /api/wallet/balance
// @access  Private
exports.getBalance = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);

        res.status(200).json({
            success: true,
            balance: user.balance
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Create a deposit invoice
// @route   POST /api/wallet/deposit
// @access  Private
exports.createDeposit = async (req, res, next) => {
    const { amount, currency = 'usd' } = req.body;

    if (!amount || isNaN(amount) || amount <= 0) {
        return res.status(400).json({ success: false, error: 'Please provide a valid amount' });
    }

    try {
        const np = new NowPaymentsApi({ apiKey: process.env.NOWPAYMENTS_API_KEY });

        const orderId = `FINVIEW-${req.user.id}-${Date.now()}`;

        const invoice = await np.createInvoice({
            price_amount: amount,
            price_currency: currency,
            order_id: orderId,
            ipn_callback_url: `https://your-app-url.com/api/wallet/nowpayments-ipn` // IMPORTANT: Replace with your actual deployed URL
        });

        // Create a pending transaction in our database
        await Transaction.create({
            userId: req.user.id,
            paymentId: invoice.id,
            amount: amount,
            currency: currency,
            status: 'waiting'
        });

        res.status(200).json({
            success: true,
            paymentUrl: invoice.invoice_url
        });

    } catch (error) {
        console.error('NowPayments Error:', error);
        res.status(500).json({ success: false, error: 'Could not create deposit invoice' });
    }
};

// @desc    Handle NowPayments IPN
// @route   POST /api/wallet/nowpayments-ipn
// @access  Public
exports.handleNowPaymentsIPN = async (req, res, next) => {
    const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET;
    const signature = req.headers['x-nowpayments-sig'];

    if (!signature) {
        return res.status(401).send('No signature');
    }

    try {
        const hmac = crypto.createHmac('sha512', ipnSecret);
        hmac.update(JSON.stringify(req.body, Object.keys(req.body).sort()));
        const calculatedSignature = hmac.digest('hex');

        if (calculatedSignature !== signature) {
            return res.status(401).send('Invalid signature');
        }

        // Signature is valid, process the payment notification
        const { payment_id, payment_status, price_amount } = req.body;

        const transaction = await Transaction.findOne({ paymentId: payment_id });

        if (!transaction) {
            return res.status(404).send('Transaction not found');
        }

        // Update transaction status
        transaction.status = payment_status;
        await transaction.save();

        // If payment is finished, credit the user's account
        if (payment_status === 'finished') {
            // Check if we have already credited this transaction to prevent double-spending
            if (transaction.status !== 'finished') {
                const user = await User.findById(transaction.userId);
                user.balance += parseFloat(price_amount);
                await user.save();
            }
        }

        res.status(200).send('IPN Handled');

    } catch (error) {
        console.error('IPN Handling Error:', error);
        res.status(500).send('Server Error');
    }
};
