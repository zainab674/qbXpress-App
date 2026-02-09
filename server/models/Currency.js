const mongoose = require('mongoose');

const CurrencySchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    code: { type: String, required: true },
    symbol: String,
    isHome: { type: Boolean, default: false },
    userId: { type: String, required: true },
    companyId: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Currency', CurrencySchema);
