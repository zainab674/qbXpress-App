const mongoose = require('mongoose');

const BudgetSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    year: { type: Number, required: true },
    accountId: { type: String, required: true },
    monthlyAmounts: [Number], // 12 values
    userId: { type: String, required: true },
    companyId: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Budget', BudgetSchema);
