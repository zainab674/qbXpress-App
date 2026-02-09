const mongoose = require('mongoose');

const AccountSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    companyId: { type: String, required: true },
    name: { type: String, required: true },
    number: String,
    type: { type: String, required: true },
    balance: { type: Number, default: 0 },
    description: String,
    parentId: String,
    isActive: { type: Boolean, default: true },
    currencyId: String,
    bankAccountNumber: String,
    routingNumber: String,
    taxLineMapping: String,
    openingBalance: Number,
    openingBalanceDate: String,
}, { timestamps: true });

module.exports = mongoose.model('Account', AccountSchema);

