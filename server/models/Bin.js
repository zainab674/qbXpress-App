const mongoose = require('mongoose');

const BinSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },   // e.g. "A-01-03" or "Shelf A Row 1"
    code: { type: String },                   // short label for barcodes / display
    warehouseId: { type: String, required: true },

    // Physical location within the warehouse
    zone: String,       // e.g. "Cold Storage", "Receiving", "Bulk"
    aisle: String,      // e.g. "A", "B", "12"
    shelf: String,      // e.g. "1", "2", "top", "bottom"
    position: String,   // e.g. "L", "R", "01"

    // Constraints
    capacity: Number,   // max units (0 = unlimited)
    isActive: { type: Boolean, default: true },
    notes: String,

    // Multi-tenant
    companyId: { type: String, required: true },
    userId: { type: String, required: true },
}, { timestamps: true });

BinSchema.index({ warehouseId: 1, companyId: 1, userId: 1 });
BinSchema.index({ companyId: 1, userId: 1 });

module.exports = mongoose.model('Bin', BinSchema);
