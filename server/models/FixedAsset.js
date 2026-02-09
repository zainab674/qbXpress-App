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
    userId: { type: String, required: true },
    companyId: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('FixedAsset', FixedAssetSchema);
