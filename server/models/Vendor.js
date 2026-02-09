const mongoose = require('mongoose');

const VendorSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    companyId: { type: String, required: true },
    name: { type: String, required: true },
    companyName: String,
    phone: String,
    email: String,
    balance: { type: Number, default: 0 },
    address: String,
    isActive: { type: Boolean, default: true },
    currencyId: String,
    contacts: [Object],
    preFillAccounts: [String],
    customFieldValues: Object,
    notes: [Object],
    eligibleFor1099: Boolean,
    vendorType: String,
    vendorAccountNo: String,
}, { timestamps: true, strict: false });

module.exports = mongoose.model('Vendor', VendorSchema);

