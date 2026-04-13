const mongoose = require('mongoose');

const InventoryLotSchema = new mongoose.Schema({
    itemId: { type: String, required: true },
    lotNumber: { type: String, required: true },

    // Quantities
    quantityReceived: { type: Number, required: true },
    quantityRemaining: { type: Number, required: true },
    quantityOnHold: { type: Number, default: 0 }, // QC hold or reserved

    // Dates
    dateReceived: { type: Date, default: Date.now },
    expirationDate: Date,          // QB: expiration tracking for perishables
    manufacturingDate: Date,        // QB: manufacturing/production date
    bestBeforeDate: Date,

    // Cost tracking (for lot-level cost accuracy)
    unitCost: { type: Number, default: 0 },   // cost per unit when received
    totalCost: { type: Number, default: 0 },  // unitCost * quantityReceived

    // Status: available, on-hold (QC), expired, quarantine
    lotStatus: {
        type: String,
        enum: ['available', 'on-hold', 'expired', 'quarantine', 'consumed'],
        default: 'available'
    },

    // Source tracking
    purchaseOrderId: String,
    billId: String,
    receiptId: String,
    vendorName: String,
    vendorLotNumber: String, // vendor's own lot reference

    // Location
    warehouseId: { type: String, default: 'DEFAULT' },
    binId: String,        // reference to Bin.id (structured bin record)
    binLocation: String,  // free-text fallback / legacy bin label

    // Notes
    notes: String,
    country: String,       // country of origin

    // QC audit trail: each quarantine/release action is recorded here
    qcHistory: [{
        action: { type: String, enum: ['quarantined', 'put-on-hold', 'released'] },
        date: { type: Date, default: Date.now },
        by: String,
        reason: String,
        notes: String,
    }],

    // Multi-tenant
    companyId: { type: String, required: true },
    userId: { type: String, required: true },
}, { timestamps: true });

// FIFO sorting
InventoryLotSchema.index({ itemId: 1, dateReceived: 1 });
// Quick lookup of available lots
InventoryLotSchema.index({ itemId: 1, quantityRemaining: 1 });
// Warehouse-scoped FIFO
InventoryLotSchema.index({ itemId: 1, warehouseId: 1, dateReceived: 1 });
// FEFO sorting (First Expiry, First Out) — QB Enterprise perishables picking
InventoryLotSchema.index({ itemId: 1, expirationDate: 1, dateReceived: 1 });
// Warehouse-scoped FEFO
InventoryLotSchema.index({ itemId: 1, warehouseId: 1, expirationDate: 1, dateReceived: 1 });
// Status filter
InventoryLotSchema.index({ companyId: 1, userId: 1, lotStatus: 1 });
// Expiration date monitoring
InventoryLotSchema.index({ companyId: 1, userId: 1, expirationDate: 1 });
// Lot number lookup
InventoryLotSchema.index({ companyId: 1, userId: 1, lotNumber: 1 });
// Bin-level lookup
InventoryLotSchema.index({ itemId: 1, warehouseId: 1, binId: 1, dateReceived: 1 });

module.exports = mongoose.model('InventoryLot', InventoryLotSchema);
