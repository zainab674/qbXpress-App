const mongoose = require('mongoose');

const MileageEntrySchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    date: { type: String, required: true },
    vehicle: { type: String, required: true },
    odometerStart: Number,
    odometerEnd: Number,
    totalMiles: { type: Number, required: true },
    customerId: String,
    itemId: String,
    isBillable: { type: Boolean, default: false },
    notes: String,
    status: { type: String, enum: ['PENDING', 'INVOICED', 'PAID'], default: 'PENDING' },
    userId: { type: String, required: true },
    companyId: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('MileageEntry', MileageEntrySchema);
