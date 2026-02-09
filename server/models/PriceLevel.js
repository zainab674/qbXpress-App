const mongoose = require('mongoose');

const PriceLevelSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['Fixed %', 'Per Item', 'Formula'], required: true },
    percentage: Number,
    formulaConfig: {
        baseOn: String,
        adjustmentType: String,
        adjustmentAmount: Number,
        rounding: String
    },
    isActive: { type: Boolean, default: true },
    perItemPrices: Object,
    userId: { type: String, required: true },
    companyId: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('PriceLevel', PriceLevelSchema);
