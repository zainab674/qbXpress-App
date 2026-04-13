const mongoose = require('mongoose');

const WarehouseSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    code: { type: String },
    address: String,
    isDefault: { type: Boolean, default: false },
    companyId: { type: String, required: true },
    userId: { type: String, required: true },
}, { timestamps: true });

WarehouseSchema.index({ companyId: 1, userId: 1 });

module.exports = mongoose.model('Warehouse', WarehouseSchema);
