const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    companyId: { type: String, required: true },
    name: { type: String, required: true },
    type: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    description: String,
    purchaseDescription: String,
    salesPrice: Number,
    cost: Number,
    incomeAccountId: String,
    cogsAccountId: String,
    assetAccountId: String,
    onHand: { type: Number, default: 0 },
    reorderPoint: Number,
    taxCode: String,
    customFieldValues: Object,
    parentId: String,
    taxRate: Number,
    unitOfMeasure: String,
    preferredVendorId: String,
    vendorId: String,
    sku: String,
    category: String,
    imageUrl: String,
    isSalesItem: Boolean,
    isPurchaseItem: Boolean,
    weight: Number,
    dimensions: {
        length: Number,
        width: Number,
        height: Number,
        unit: String
    },
    assemblyItems: [Object],
    buildPoint: Number,
}, { timestamps: true });

module.exports = mongoose.model('Item', ItemSchema);
