const mongoose = require('mongoose');

const RecurringTemplateSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    companyId: { type: String, required: true },
    templateName: { type: String, required: true },
    type: { type: String, enum: ['Scheduled', 'Reminder', 'Unscheduled'], default: 'Scheduled' },
    entityId: { type: String, required: true },
    createDaysInAdvance: { type: Number, default: 0 },
    autoSendEmail: { type: Boolean, default: false },
    includeUnbilledCharges: { type: Boolean, default: false },
    markAsPrintLater: { type: Boolean, default: false },
    interval: { type: String, enum: ['Daily', 'Weekly', 'Monthly', 'Yearly'], default: 'Monthly' },
    every: { type: Number, default: 1 },
    repeatsOn: mongoose.Schema.Types.Mixed,
    startDate: { type: String, required: true },
    endType: { type: String, enum: ['Never', 'After', 'OnDate'], default: 'Never' },
    endAfterOccurrences: Number,
    endDate: String,
    lastProcessedDate: String,
    nextScheduledDate: String,
    isAuthorized: { type: Boolean, default: false },
    authorizationDate: String,
    transactionData: {
        type: { type: String },
        entityId: String,
        items: Array,
        total: Number,
        memo: String,
        paymentMethod: String,
        classId: String,
        salesRepId: String,
        taxAmount: Number,
        taxItemId: String,
    }
}, { timestamps: true });

module.exports = mongoose.model('RecurringTemplate', RecurringTemplateSchema);
