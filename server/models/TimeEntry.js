const mongoose = require('mongoose');

const TimeEntrySchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    userId: { type: String, index: true },
    companyId: { type: String, index: true },
    employeeId: { type: String, required: true },
    customerId: String,
    itemId: String,
    date: { type: String, required: true },
    hours: { type: Number, required: true },
    rate: { type: Number, default: 0 },
    isBillable: { type: Boolean, default: false },
    status: { type: String, enum: ['PENDING', 'INVOICED', 'PAID'], default: 'PENDING' },
    description: String,
}, { timestamps: true });

// ── Indexes ──────────────────────────────────────────────────────────────────
TimeEntrySchema.index({ companyId: 1, userId: 1, date: -1 });
TimeEntrySchema.index({ companyId: 1, userId: 1, employeeId: 1, date: -1 });
TimeEntrySchema.index({ companyId: 1, userId: 1, status: 1 });

module.exports = mongoose.model('TimeEntry', TimeEntrySchema);
