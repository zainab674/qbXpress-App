const mongoose = require('mongoose');

const FixedAssetSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    assetNumber: String,
    purchaseDate: String,
    purchaseCost: Number,
    vendorId: String,
    description: String,
    assetAccountId: { type: String, required: true },
    accumulatedDepreciationAccountId: String,
    depreciationExpenseAccountId: String,
    depreciationMethod: { type: String, enum: ['Straight Line', 'Double Declining', 'Sum of Years Digits'] },
    usefulLifeYears: Number,
    salvageValue: Number,
    isActive: { type: Boolean, default: true },

    // Disposal
    disposalDate: String,
    disposalAmount: Number,
    disposalType: { type: String, enum: ['Sale', 'Scrapped', 'Donation'] },

    // Depreciation tracking (updated by post-depreciation endpoint)
    accumulatedDepreciation: { type: Number, default: 0 },
    lastDepreciationDate: String,

    userId: { type: String, required: true },
    companyId: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('FixedAsset', FixedAssetSchema);
