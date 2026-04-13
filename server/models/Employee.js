const mongoose = require('mongoose');

const EmployeeSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    companyId: { type: String, required: true },
    name: { type: String, required: true },
    firstName: String,
    lastName: String,
    ssn: String,
    phone: String,
    email: String,
    address: String,
    hiredDate: String,
    isActive: { type: Boolean, default: true },
    hourlyRate: Number,
    type: String,
    notes: [Object],
    payPeriod: String,
    salary: Number,
    federalTax: Object,
    stateTax: Object,
    sickLeave: Object,
    vacation: Object,
}, { timestamps: true });

// ── Indexes ──────────────────────────────────────────────────────────────────
EmployeeSchema.index({ companyId: 1, userId: 1, isActive: 1 });
EmployeeSchema.index({ companyId: 1, userId: 1, name: 1 });

module.exports = mongoose.model('Employee', EmployeeSchema);

