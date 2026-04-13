const mongoose = require('mongoose');

const ScheduledReportSchema = new mongoose.Schema({
    id:               { type: String, required: true, unique: true },
    userId:           { type: String, required: true },
    companyId:        { type: String, required: true },
    name:             { type: String, required: true },
    reportType:       { type: String, required: true },
    params:           { type: Object, default: {} },       // fromDate, toDate, filters, etc.
    cronExpression:   { type: String, required: true },    // e.g. "0 8 * * 1"
    recipientEmails:  [{ type: String }],
    format:           { type: String, enum: ['Excel', 'PDF'], default: 'Excel' },
    isActive:         { type: Boolean, default: true },
    lastRunAt:        { type: Date },
    nextRunAt:        { type: Date },
}, { timestamps: true });

ScheduledReportSchema.index({ userId: 1, companyId: 1 });

module.exports = mongoose.model('ScheduledReport', ScheduledReportSchema);
