const mongoose = require('mongoose');

const BankTransactionSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    companyId: { type: String, required: true },
    bankAccountId: { type: String, required: true },
    date: { type: String, required: true },
    description: { type: String, required: true },
    originalDescription: String,
    amount: { type: Number, required: true },
    type: { type: String, enum: ['DEBIT', 'CREDIT'] },
    category: String,
    checksum: { type: String, index: true, sparse: true },
    status: {
        type: String,
        enum: ['FOR_REVIEW', 'CATEGORIZED', 'EXCLUDED', 'MATCHED', 'UNMATCHED', 'ADDED'],
        default: 'FOR_REVIEW'
    },
    potentialMatchId: String,
    entityId: String,
    attachments: [Object]
}, { timestamps: true });

module.exports = mongoose.model('BankTransaction', BankTransactionSchema);
