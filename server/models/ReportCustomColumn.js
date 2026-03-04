const mongoose = require('mongoose');

const ReportCustomColumnSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    reportType: { type: String, required: true },
    columnName: { type: String, required: true },
    formula: { type: String, required: true },
    userId: { type: String, required: true },
    companyId: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('ReportCustomColumn', ReportCustomColumnSchema);
