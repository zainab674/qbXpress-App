const mongoose = require('mongoose');

const PayrollLiabilitySchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    type: { type: String, enum: ['Federal', 'Social Security', 'Medicare', 'State'], required: true },
    amount: { type: Number, required: true },
    dueDate: String,
    vendorId: String,
    paycheckId: String,
    status: { type: String, enum: ['OPEN', 'PAID'], default: 'OPEN' },
    userId: { type: String, required: true },
    companyId: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('PayrollLiability', PayrollLiabilitySchema);
