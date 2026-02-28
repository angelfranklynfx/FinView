const express = require('express');
const {
    buyAsset,
    sellAsset,
    getPortfolio
} = require('../controllers/tradeController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All routes in this file are protected
router.use(protect);

router.post('/buy', buyAsset);
router.post('/sell', sellAsset);
router.get('/portfolio', getPortfolio);

module.exports = router;
