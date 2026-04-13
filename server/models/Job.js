const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    companyId: { type: String, required: true },

    name: { type: String, required: true },
    description: String,
    jobNumber: String,

    // Parent customer / sub-customer
    customerId: { type: String, required: true },

    status: {
        type: String,
        enum: ['Pending', 'Awarded', 'In Progress', 'Closed', 'Not Awarded'],
        default: 'Pending'
    },
    jobType: String,   // e.g. 'Remodel', 'New Construction'

    // Dates
    startDate: String,        // YYYY-MM-DD
    projectedEndDate: String, // YYYY-MM-DD
    actualEndDate: String,    // YYYY-MM-DD

    // Budgets (for estimate vs actuals reports)
    estimatedRevenue: Number,
    estimatedCost: Number,

    // Notes / custom fields
    notes: String,
    customFieldValues: Object,

    isActive: { type: Boolean, default: true },
}, { timestamps: true });

JobSchema.index({ customerId: 1, companyId: 1, userId: 1 });
JobSchema.index({ status: 1, companyId: 1, userId: 1 });

module.exports = mongoose.model('Job', JobSchema);
