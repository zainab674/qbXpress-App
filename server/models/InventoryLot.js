const mongoose = require('mongoose');

const InventoryLotSchema = new mongoose.Schema({
    itemId: { type: String, required: true },
    lotNumber: { type: String, required: true },
    quantityReceived: { type: Number, required: true },
    quantityRemaining: { type: Number, required: true },
    dateReceived: { type: Date, default: Date.now },
    purchaseOrderId: String,
    companyId: { type: String, required: true },
    userId: { type: String, required: true },
}, { timestamps: true });

// Index for FIFO sorting (itemId + dateReceived)
InventoryLotSchema.index({ itemId: 1, dateReceived: 1 });
// Index for quick lookup of available lots
InventoryLotSchema.index({ itemId: 1, quantityRemaining: 1 });

module.exports = mongoose.model('InventoryLot', InventoryLotSchema);
