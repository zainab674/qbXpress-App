const mongoose = require('mongoose');

const LeadSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    companyName: String,
    phone: String,
    email: String,
    address: String,
    status: String,
    notes: String,
    userId: { type: String, required: true },
    companyId: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Lead', LeadSchema);
