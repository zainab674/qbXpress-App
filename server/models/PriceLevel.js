const mongoose = require('mongoose');

/**
 * PriceLevel - QB Desktop: custom price levels for customer groups
 * Examples: Retail, Wholesale, Preferred Customer, Employee
 *
 * Types:
 *   Fixed %   - apply X% discount/markup from base price
 *   Per Item  - per-item fixed prices override base price
 *   Formula   - formula-based pricing (cost-plus, etc.)
 */
const PriceLevelSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['Fixed %', 'Per Item', 'Formula'], required: true },
    isActive: { type: Boolean, default: true },

    // Fixed % type: adjust all items by this percentage (negative = discount)
    percentage: Number,

    // Formula type config
    formulaConfig: {
        baseOn: { type: String, enum: ['cost', 'price', 'custom'], default: 'price' },
        adjustmentType: { type: String, enum: ['markup', 'markdown', 'fixed'], default: 'markdown' },
        adjustmentAmount: Number,   // percent or fixed amount
        rounding: {
            type: String,
            enum: ['none', 'nearest_dollar', 'nearest_cent', 'nearest_five_cents', 'nearest_ten_cents'],
            default: 'none'
        }
    },

    // Per Item type: map itemId -> price
    perItemPrices: Object,

    // Structured per-item prices (for querying)
    itemPrices: [{
        itemId: String,
        price: Number
    }],

    currency: { type: String, default: 'USD' },
    description: String,
    userId: { type: String, required: true },
    companyId: { type: String, required: true },
}, { timestamps: true });

PriceLevelSchema.index({ companyId: 1, userId: 1, isActive: 1 });

module.exports = mongoose.model('PriceLevel', PriceLevelSchema);
