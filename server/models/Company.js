const mongoose = require('mongoose');

const CompanySchema = new mongoose.Schema({
    userId: { type: String, required: true },
    name: { type: String, required: true },
    legalName: String,
    address: String,
    city: String,
    state: String,
    zip: String,
    phone: String,
    email: String,
    website: String,
    industry: String,
    taxId: String,
    fiscalYearStart: { type: String, default: 'January' },
    taxForm: String,
    logo: String,
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Company', CompanySchema);
