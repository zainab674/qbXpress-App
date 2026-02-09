const mongoose = require('mongoose');

const SalesTaxCodeSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    code: { type: String, required: true },
    description: String,
    isTaxable: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    userId: { type: String, required: true },
    companyId: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('SalesTaxCode', SalesTaxCodeSchema);
