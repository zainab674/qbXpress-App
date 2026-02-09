const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    companyId: { type: String, required: true },
    name: { type: String, required: true },
    companyName: String,
    email: String,
    phone: String,
    balance: { type: Number, default: 0 },
    address: String,
    isActive: { type: Boolean, default: true },
    currencyId: String,
    jobs: [Object],
    notes: [Object],
    contacts: [Object],
    customFieldValues: Object,
    customerType: String,
    taxItemId: String,
}, { timestamps: true, strict: false });

module.exports = mongoose.model('Customer', CustomerSchema);

