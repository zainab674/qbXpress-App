const mongoose = require('mongoose');

/**
 * SerialNumber - tracks individual serialized items (QB: serial number tracking)
 * Each record = one physical unit with a unique serial number.
 */
const SerialNumberSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    itemId: { type: String, required: true },
    serialNumber: { type: String, required: true },

    // Status lifecycle: in-stock → sold/transferred/returned/scrapped
    status: {
        type: String,
        enum: ['in-stock', 'sold', 'returned', 'transferred', 'scrapped', 'on-hold'],
        default: 'in-stock'
    },

    // Cost
    unitCost: { type: Number, default: 0 },

    // Dates
    dateReceived: { type: Date, default: Date.now },
    dateSold: Date,
    warrantyExpiry: Date,
    expirationDate: Date,
    manufacturingDate: Date,

    // Source
    purchaseOrderId: String,
    billId: String,
    receiptId: String,
    vendorName: String,
    vendorSerialNumber: String,

    // Sale reference
    invoiceId: String,
    customerId: String,
    customerName: String,

    // Location
    warehouseId: { type: String, default: 'DEFAULT' },
    binLocation: String,
    lotNumber: String,          // optional link to a lot

    // Notes
    notes: String,

    // Multi-tenant
    companyId: { type: String, required: true },
    userId: { type: String, required: true },
}, { timestamps: true });

SerialNumberSchema.index({ itemId: 1, status: 1 });
SerialNumberSchema.index({ companyId: 1, userId: 1, serialNumber: 1 });
SerialNumberSchema.index({ companyId: 1, userId: 1, status: 1 });
SerialNumberSchema.index({ companyId: 1, userId: 1, itemId: 1, status: 1 });
SerialNumberSchema.index({ companyId: 1, userId: 1, warrantyExpiry: 1 });

module.exports = mongoose.model('SerialNumber', SerialNumberSchema);
