const mongoose = require('mongoose');

/**
 * InventoryCount - QB Desktop: Physical Inventory Worksheet
 * Represents a physical count session. Each line item is a count record
 * for an item (or item + lot/serial). The session can be printed as the
 * QB "Physical Inventory Worksheet" and completed to post adjustments.
 */
const CountLineSchema = new mongoose.Schema({
    itemId: { type: String, required: true },
    itemName: String,
    sku: String,
    description: String,
    warehouseId: String,
    binLocation: String,
    lotNumber: String,
    serialNumber: String,
    unitOfMeasure: String,

    // QB shows these columns on the worksheet
    qtyOnHand: { type: Number, default: 0 },    // system qty at time of count
    qtyCounted: Number,                           // physically counted (null = not yet counted)
    variance: Number,                             // qtyCounted - qtyOnHand (auto-calc)
    varianceValue: Number,                        // variance * averageCost

    adjustmentAccountId: String,
    notes: String,
}, { _id: false });

const InventoryCountSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    countNumber: String,   // e.g. "IC-0001"
    name: String,          // optional description
    status: {
        type: String,
        enum: ['draft', 'in-progress', 'completed', 'cancelled'],
        default: 'draft'
    },

    // Date of count (printed on worksheet)
    countDate: { type: Date, default: Date.now },
    completedDate: Date,
    completedBy: String,

    // Scope
    warehouseId: String,   // null = all warehouses
    category: String,      // null = all categories

    // Line items — one per item (or per lot/serial for tracked items)
    lines: [CountLineSchema],

    // After completion, reference to the INVENTORY_ADJ transaction posted
    adjustmentTransactionId: String,

    // Totals
    totalVarianceValue: { type: Number, default: 0 },
    totalLinesCounted: { type: Number, default: 0 },

    notes: String,
    companyId: { type: String, required: true },
    userId: { type: String, required: true },
}, { timestamps: true });

InventoryCountSchema.index({ companyId: 1, userId: 1, status: 1 });
InventoryCountSchema.index({ companyId: 1, userId: 1, countDate: -1 });

module.exports = mongoose.model('InventoryCount', InventoryCountSchema);
