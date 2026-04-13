/**
 * TransferLog — QB Enterprise parity: persistent record of every warehouse/bin transfer.
 *
 * Created by warehouseController.transfer after a successful commit.
 * Exposed via GET /warehouses/transfer-history.
 */

const mongoose = require('mongoose');

const TransferLogSchema = new mongoose.Schema({
    id:              { type: String, required: true, unique: true },
    transferNumber:  { type: String, required: true }, // e.g. "TO-00001"
    date:            { type: Date,   default: Date.now },

    itemId:          { type: String, required: true },
    itemName:        String,   // denormalised for fast display
    sku:             String,

    fromWarehouseId: { type: String },
    fromWarehouseName: String,
    fromBinId:       String,
    fromBinName:     String,

    toWarehouseId:   { type: String, required: true },
    toWarehouseName: String,
    toBinId:         String,
    toBinName:       String,

    quantity:        { type: Number, required: true },
    lotNumber:       String,    // optional: transfer was for a specific lot
    unitCost:        Number,    // average cost at transfer time
    totalValue:      Number,    // quantity × unitCost

    memo:            String,
    transferredBy:   String,    // userId of the person who initiated

    companyId:       { type: String, required: true },
    userId:          { type: String, required: true },
}, { timestamps: true });

TransferLogSchema.index({ companyId: 1, userId: 1, date: -1 });
TransferLogSchema.index({ companyId: 1, userId: 1, itemId: 1, date: -1 });
TransferLogSchema.index({ companyId: 1, userId: 1, fromWarehouseId: 1, date: -1 });
TransferLogSchema.index({ companyId: 1, userId: 1, toWarehouseId:   1, date: -1 });

module.exports = mongoose.model('TransferLog', TransferLogSchema);
