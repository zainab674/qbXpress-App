const mongoose = require('mongoose');

const MemorizedReportSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    baseType: { type: String, required: true },
    dateCreated: String,
    userId: { type: String, required: true },
    companyId: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('MemorizedReport', MemorizedReportSchema);
