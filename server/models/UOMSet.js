const mongoose = require('mongoose');

// One row in the "related units" table
// conversionFactor = how many base units equal 1 of this unit
// e.g. base=Each(1), Box conversionFactor=12  => 1 Box = 12 Each
const RelatedUnitSchema = new mongoose.Schema({
    name: { type: String, required: true },
    abbreviation: { type: String, default: '' },
    conversionFactor: { type: Number, required: true, min: 0.000001 },
}, { _id: false });

const UOMSetSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    companyId: { type: String, required: true },

    // Display name shown in lists and item forms
    name: { type: String, required: true },

    // The base/smallest unit (conversionFactor = 1 implicitly)
    baseUnit: {
        name: { type: String, required: true },
        abbreviation: { type: String, default: '' },
    },

    // All larger units with their conversion factors relative to the base unit
    relatedUnits: [RelatedUnitSchema],

    // Which unit is shown by default when purchasing
    defaultPurchaseUnit: { type: String, default: '' },

    // Which unit is shown by default on sales (invoices, estimates, SOs)
    defaultSalesUnit: { type: String, default: '' },

    isActive: { type: Boolean, default: true },
}, { timestamps: true });

UOMSetSchema.index({ companyId: 1, userId: 1, isActive: 1 });
UOMSetSchema.index({ companyId: 1, userId: 1, name: 1 });

module.exports = mongoose.model('UOMSet', UOMSetSchema);
