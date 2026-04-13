const mongoose = require('mongoose');

const AuditLogEntrySchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    timestamp: { type: String, required: true },
    userId: String,
    companyId: String,
    actualuserId: String,
    companyId: String,
    action: { type: String, enum: ['CREATE', 'MODIFY', 'DELETE', 'VOID'], required: true },
    transactionType: String,
    transactionId: String,
    refNo: String,
    amount: Number,
    priorContent: String,
    newContent: String,
}, { timestamps: true });

// ── Indexes ──────────────────────────────────────────────────────────────────
AuditLogEntrySchema.index({ companyId: 1, userId: 1, timestamp: -1 });
AuditLogEntrySchema.index({ companyId: 1, userId: 1, action: 1, timestamp: -1 });
AuditLogEntrySchema.index({ companyId: 1, userId: 1, transactionId: 1 }, { sparse: true });

module.exports = mongoose.model('AuditLogEntry', AuditLogEntrySchema);

