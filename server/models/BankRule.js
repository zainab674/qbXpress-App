const mongoose = require('mongoose');

const BankRuleSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    companyId: { type: String, required: true },
    descriptionContains: { type: String, required: true },
    suggestedCategoryId: { type: String, required: true },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('BankRule', BankRuleSchema);
