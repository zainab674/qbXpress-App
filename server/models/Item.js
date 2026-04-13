const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    companyId: { type: String, required: true },
    name: { type: String, required: true },
    // QB types: Inventory Part, Inventory Assembly, Non-inventory Part, Service,
    // Other Charge, Subtotal, Group, Discount, Payment
    type: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    description: String,
    purchaseDescription: String,

    // Pricing
    salesPrice: Number,
    cost: Number,
    // Average cost is auto-maintained on every receipt (QB default valuation method)
    averageCost: { type: Number, default: 0 },
    // Total inventory value = averageCost * onHand
    totalValue: { type: Number, default: 0 },

    // Valuation method: Average (QB default), FIFO, Standard
    valuationMethod: { type: String, enum: ['Average', 'FIFO', 'Standard'], default: 'Average' },

    // Accounts
    incomeAccountId: String,
    cogsAccountId: String,
    assetAccountId: String,
    expenseAccountId: String,

    // Quantities
    onHand: { type: Number, default: 0 },
    onPurchaseOrder: { type: Number, default: 0 },
    onSalesOrder: { type: Number, default: 0 },
    reorderPoint: Number,
    reorderQty: Number,       // QB: preferred reorder quantity
    maxStock: Number,          // QB: max stock level

    // QB Enterprise: Default warehouse for sales-order picking and receiving
    preferredWarehouseId: String,

    // QB Enterprise: Per-warehouse on-hand quantities (denormalized from InventoryLot for quick lookups)
    // Recomputed by warehouseQtySync helper after every receive / sell / transfer / adjustment.
    warehouseQuantities: [{
        warehouseId: { type: String, required: true },
        onHand: { type: Number, default: 0 },
        value:  { type: Number, default: 0 },  // onHand × weighted-avg unit cost
    }],

    // QB Enterprise: Per-site reorder rules — override the global reorderPoint/reorderQty/maxStock
    warehouseReorderPoints: [{
        warehouseId:  { type: String, required: true },
        reorderPoint: { type: Number, default: 0 },
        reorderQty:   { type: Number, default: 0 },  // preferred reorder qty for this site
        maxStock:     { type: Number, default: 0 },  // max stock level for this site
    }],

    // Tax
    taxCode: String,
    taxRate: Number,
    isTaxable: { type: Boolean, default: false },

    // Tracking
    trackLots: { type: Boolean, default: false },          // Enable lot/batch tracking
    trackSerialNumbers: { type: Boolean, default: false }, // Enable serial number tracking
    // QB Enterprise: lot picking method — FIFO (oldest first) or FEFO (soonest expiry first)
    lotPickingMethod: { type: String, enum: ['FIFO', 'FEFO'], default: 'FIFO' },

    // Classification
    sku: String,
    barcode: String,
    category: String,
    subcategory: String,
    manufacturer: String,
    manufacturerPartNumber: String,
    imageUrl: String,
    unitOfMeasure: String,
    // UOM Set (QB Enterprise: named set with base + related units + conversion factors)
    uomSetId: String,            // references UOMSet._id
    defaultPurchaseUOM: String,  // unit name from the set used when purchasing
    defaultSalesUOM: String,     // unit name from the set used when selling
    // Legacy simple UOM fields (kept for backward compatibility)
    purchaseUOM: String,
    salesUOM: String,
    uomConversionFactor: { type: Number, default: 1 }, // purchaseUOM qty * factor = salesUOM qty

    // Discount item specifics (type === 'Discount')
    discountType: { type: String, enum: ['Percent', 'Fixed'], default: 'Percent' },
    discountAmount: Number,   // fixed-dollar discount amount

    // Vendor
    preferredVendorId: String,
    vendorId: String,
    vendorSKU: String,
    vendorLeadTimeDays: Number,
    minimumOrderQty: Number,

    // QB Enterprise: multiple vendors per item (different prices, SKUs, lead times)
    vendors: [{
        vendorId: { type: String, required: true },
        vendorSKU: String,
        price: Number,
        leadTimeDays: Number,
        minimumOrderQty: Number,
        isPreferred: { type: Boolean, default: false },
    }],

    // Physical
    weight: Number,
    weightUnit: { type: String, default: 'lb' },
    dimensions: {
        length: Number,
        width: Number,
        height: Number,
        unit: { type: String, default: 'in' }
    },

    // Flags
    isSalesItem: { type: Boolean, default: true },
    isPurchaseItem: { type: Boolean, default: true },
    isDropShip: { type: Boolean, default: false },
    isSubItem: { type: Boolean, default: false },
    parentId: String,

    // Price levels (custom pricing tiers per customer price level)
    // [ { priceLevelId, price } ]
    priceLevelPrices: [{ priceLevelId: String, price: Number }],

    // QB Enterprise: substitute / alternate items (shown when this item is OOS)
    substituteItems: [{
        itemId: { type: String, required: true },
        reason: String,   // e.g. "Same spec, alt brand", "Upgrade", "Cross-sell"
    }],

    // Group item components (QB: Group type — list of items sold as a bundle)
    groupItems: [{
        itemId: { type: String, required: true },
        quantity: { type: Number, default: 1 },
    }],
    printItemsInGroup: { type: Boolean, default: false },

    // Custom fields
    customFieldValues: Object,

    // Assembly
    assemblyItems: [{
        itemId: String,
        quantity: Number,
        unitCost: Number,
        description: String,
        // QB Enterprise: extra material that gets scrapped during manufacturing (%)
        // effectiveQty = quantity * (1 + scrapPercent/100)
        scrapPercent: { type: Number, default: 0, min: 0, max: 100 },
        // Yield: % of input that becomes usable output (100 = no loss)
        // effectiveQty = quantity / (yieldPercent/100)
        yieldPercent: { type: Number, default: 100, min: 1, max: 100 },
    }],
    buildPoint: Number,

    // Standard cost (for Standard valuation method)
    standardCost: Number,
    // Cumulative cost variance from all assembly builds (actual - standard)
    standardCostVariance: { type: Number, default: 0 },
    // Last computed actual cost per unit from most recent build
    lastActualCost: Number,

    // BOM Revision History — snapshot of assemblyItems on every save that changes the BOM
    bomRevisions: [{
        revisionNo: { type: Number, required: true },
        date: { type: Date, required: true },
        changedBy: String,          // userId / role of the person who saved
        note: String,               // auto-generated summary of what changed
        assemblyItems: [{
            itemId: String,
            quantity: Number,
            unitCost: Number,
            description: String,
            scrapPercent: Number,
            yieldPercent: Number,
        }],
    }],

    // Substitute / alternate items — shown when this item is out of stock
    substituteItemIds: [{ type: String }],

    // Fixed Asset tracking (QB Enterprise: Fixed Asset Manager parity)
    purchaseDate: String,                      // Date the asset was acquired (YYYY-MM-DD)
    purchaseCost: Number,                      // Original acquisition cost (overrides cost for FA)
    assetDescription: String,                  // Full asset description / tag
    assetTag: String,                          // Physical asset tag / barcode
    serialNumber: String,                      // Manufacturer serial number
    location: String,                          // Physical location of the asset
    depreciationMethod: {                      // QB: Straight-line, MACRS, etc.
        type: String,
        enum: ['Straight-Line', 'MACRS', 'Double-Declining', 'Sum-of-Years-Digits', 'Units-of-Production', 'None'],
        default: 'Straight-Line',
    },
    usefulLifeYears: Number,                   // Estimated useful life in years
    salvageValue: { type: Number, default: 0 },// Residual / scrap value at end of life
    accumulatedDepreciation: { type: Number, default: 0 }, // Total depreciation posted to date
    disposalDate: String,                      // Date disposed / sold (YYYY-MM-DD)
    disposalAmount: Number,                    // Proceeds received on disposal

    // Notes
    notes: String,
}, { timestamps: true });

// Indexes
ItemSchema.index({ companyId: 1, userId: 1, isActive: 1 });
ItemSchema.index({ companyId: 1, userId: 1, type: 1 });
ItemSchema.index({ companyId: 1, userId: 1, sku: 1 });
ItemSchema.index({ companyId: 1, userId: 1, barcode: 1 }, { sparse: true }); // fast barcode scan lookup
ItemSchema.index({ companyId: 1, userId: 1, category: 1 });

module.exports = mongoose.model('Item', ItemSchema);
