const mongoose = require('mongoose');

const TimeEntrySchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    employeeId: { type: String, required: true },
    customerId: { type: String, required: true },
    itemId: { type: String, required: true },
    date: { type: String, required: true },
    hours: { type: Number, required: true },
    isBillable: { type: Boolean, default: false },
    status: { type: String, enum: ['PENDING', 'INVOICED', 'PAID'], default: 'PENDING' },
    description: String,
}, { timestamps: true });

module.exports = mongoose.model('TimeEntry', TimeEntrySchema);
