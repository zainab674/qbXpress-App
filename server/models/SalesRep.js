const mongoose = require('mongoose');

const SalesRepSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    initials: String,
    entityId: String,
    isActive: { type: Boolean, default: true },
    userId: { type: String, required: true },
    companyId: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('SalesRep', SalesRepSchema);
