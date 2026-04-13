const mongoose = require('mongoose');

// ── Charge line ────────────────────────────────────────────────────────────────
// Each landed cost document can have multiple charge lines (freight + duty, etc.)
const ChargeLineSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['Freight', 'Duty', 'Insurance', 'Shipping', 'Handling', 'Other'],
        required: true
    },
    description: String,
    amount: { type: Number, required: true, min: 0 },
    // GL account to credit (e.g. Freight Expense, Duty Payable)
    accountId: String,
}, { _id: false });

// ── Allocation line ────────────────────────────────────────────────────────────
// Computed when calculating/posting — one row per receipt line item
const AllocationLineSchema = new mongoose.Schema({
    itemId: { type: String, required: true },
    itemName: String,
    lotId: String,          // InventoryLot _id (if lot-tracked)
    lotNumber: String,
    quantity: Number,       // qty on the receipt line
    receiptValue: Number,   // qty * unit cost on receipt (used for by_value method)
    weight: Number,         // item weight * qty (used for by_weight method)
    // Total landed cost allocated to this line (sum across all charges)
    allocatedAmount: { type: Number, default: 0 },
    // Per-unit landed cost addition
    allocatedUnitCost: { type: Number, default: 0 },
    // Manual override amount (used when distributionMethod === 'manual')
    manualAmount: Number,
}, { _id: false });

// ── LandedCost ─────────────────────────────────────────────────────────────────
const LandedCostSchema = new mongoose.Schema({
    // Human-readable reference number (e.g. LC-00001)
    refNo: { type: String, required: true },

    date: { type: Date, default: Date.now },

    // The item receipt or bill this landed cost is attached to
    receiptId: String,      // transaction id of RECEIVE_ITEM or BILL
    receiptRefNo: String,   // human-readable ref for display
    vendorId: String,
    vendorName: String,

    // Charges: freight, duty, insurance, etc.
    charges: [ChargeLineSchema],

    // How to spread charges across receipt lines
    distributionMethod: {
        type: String,
        enum: ['by_quantity', 'by_value', 'by_weight', 'manual'],
        default: 'by_value'
    },

    // Computed allocation lines (populated on calculate/post)
    allocations: [AllocationLineSchema],

    // Totals
    totalCharges: { type: Number, default: 0 },

    // Workflow status
    status: {
        type: String,
        enum: ['draft', 'posted', 'voided'],
        default: 'draft'
    },

    // When posted, record the date
    postedAt: Date,

    notes: String,

    // Multi-tenant
    companyId: { type: String, required: true },
    userId: { type: String, required: true },
}, { timestamps: true });

// Indexes
LandedCostSchema.index({ companyId: 1, userId: 1, status: 1 });
LandedCostSchema.index({ companyId: 1, userId: 1, receiptId: 1 });
LandedCostSchema.index({ companyId: 1, userId: 1, date: -1 });
LandedCostSchema.index({ companyId: 1, userId: 1, refNo: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('LandedCost', LandedCostSchema);
