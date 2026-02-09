const mongoose = require('mongoose');

const BankTransactionSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    companyId: { type: String, required: true },
    bankAccountId: { type: String, required: true },
    date: { type: String, required: true },
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ['MATCHED', 'UNMATCHED', 'ADDED'], default: 'UNMATCHED' },
    potentialMatchId: String
}, { timestamps: true });

module.exports = mongoose.model('BankTransaction', BankTransactionSchema);
