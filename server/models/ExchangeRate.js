const mongoose = require('mongoose');

const ExchangeRateSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    currencyId: { type: String, required: true },
    rate: { type: Number, required: true, min: 0 },   // units of home currency per 1 foreign unit
    asOfDate: { type: String, required: true },        // YYYY-MM-DD
    userId: { type: String, required: true },
    companyId: { type: String, required: true },
}, { timestamps: true });

ExchangeRateSchema.index({ currencyId: 1, asOfDate: -1, companyId: 1, userId: 1 });

module.exports = mongoose.model('ExchangeRate', ExchangeRateSchema);
