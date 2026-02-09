const mongoose = require('mongoose');

const TermSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    stdDueDays: Number,
    isActive: { type: Boolean, default: true },
    stdDiscountDays: Number,
    discountPercentage: Number,
    userId: { type: String, required: true },
    companyId: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Term', TermSchema);
