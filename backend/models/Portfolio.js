const mongoose = require('mongoose');

const PortfolioSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    assetSymbol: {
        type: String,
        required: true,
        uppercase: true,
        trim: true
    },
    assetType: {
        type: String,
        required: true,
        enum: ['stock', 'crypto', 'forex', 'commodity']
    },
    quantity: {
        type: Number,
        required: true,
        min: 0
    },
    averageBuyPrice: {
        type: Number,
        required: true,
        min: 0
    }
});

// Ensure a user can only have one portfolio entry per asset
PortfolioSchema.index({ userId: 1, assetSymbol: 1 }, { unique: true });

module.exports = mongoose.model('Portfolio', PortfolioSchema);
