const User = require('../models/User');
const Portfolio = require('../models/Portfolio');

// @desc    Buy an asset
// @route   POST /api/trade/buy
// @access  Private
exports.buyAsset = async (req, res, next) => {
    const { assetSymbol, assetType, quantity, price } = req.body;
    const userId = req.user.id;

    if (!assetSymbol || !assetType || !quantity || !price) {
        return res.status(400).json({ success: false, error: 'Please provide all required trade details' });
    }

    const cost = quantity * price;

    try {
        const user = await User.findById(userId);

        if (user.balance < cost) {
            return res.status(400).json({ success: false, error: 'Insufficient funds' });
        }

        // Deduct cost from balance
        user.balance -= cost;

        let portfolioItem = await Portfolio.findOne({ userId, assetSymbol });

        if (portfolioItem) {
            // User already owns this asset, update existing entry
            const newQuantity = portfolioItem.quantity + quantity;
            const newAveragePrice = ((portfolioItem.averageBuyPrice * portfolioItem.quantity) + cost) / newQuantity;
            
            portfolioItem.quantity = newQuantity;
            portfolioItem.averageBuyPrice = newAveragePrice;
        } else {
            // User does not own this asset, create new entry
            portfolioItem = new Portfolio({
                userId,
                assetSymbol,
                assetType,
                quantity,
                averageBuyPrice: price
            });
        }

        await user.save();
        await portfolioItem.save();

        res.status(200).json({ success: true, data: portfolioItem });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Sell an asset
// @route   POST /api/trade/sell
// @access  Private
exports.sellAsset = async (req, res, next) => {
    const { assetSymbol, quantity, price } = req.body;
    const userId = req.user.id;

    if (!assetSymbol || !quantity || !price) {
        return res.status(400).json({ success: false, error: 'Please provide all required trade details' });
    }

    const proceeds = quantity * price;

    try {
        const user = await User.findById(userId);
        const portfolioItem = await Portfolio.findOne({ userId, assetSymbol });

        if (!portfolioItem || portfolioItem.quantity < quantity) {
            return res.status(400).json({ success: false, error: 'Insufficient assets to sell' });
        }

        // Add proceeds to balance
        user.balance += proceeds;

        // Decrease quantity
        portfolioItem.quantity -= quantity;

        await user.save();

        if (portfolioItem.quantity > 0) {
            await portfolioItem.save();
        } else {
            // If quantity is zero, remove the item from portfolio
            await portfolioItem.remove();
        }

        res.status(200).json({ success: true, data: {} });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Get user portfolio
// @route   GET /api/trade/portfolio
// @access  Private
exports.getPortfolio = async (req, res, next) => {
    try {
        const portfolio = await Portfolio.find({ userId: req.user.id });
        res.status(200).json({ success: true, data: portfolio });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};