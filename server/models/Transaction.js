const mongoose = require('mongoose');

const TransactionItemSchema = new mongoose.Schema({
    id: String,
    itemId: String,
    description: String,
    quantity: Number,
    rate: Number,
    amount: Number,
    tax: Boolean,
    customerId: String,
    isBillable: Boolean,
    classId: String,
    exchangeRate: Number,
    userId: String,
    accountId: String,
    creditCategoryId: String,
    receivedQuantity: { type: Number, default: 0 },
    isClosed: { type: Boolean, default: false },
    estimatedQty: Number,
    estimatedAmount: Number,
    progressPercent: Number,
    // Warehouse/bin per line item (for Pick/Pack/Ship and multi-warehouse receiving)
    warehouseId: String,
    binId: String,
    lotNumber: String,
    pickedQty: Number,
    packedQty: Number,
    fulfilledQty: { type: Number, default: 0 },  // qty actually shipped/fulfilled
    isShippingLine: Boolean,                       // Shipping module: auto-injected carrier charge line
});

const TransactionSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    type: { type: String, required: true },
    userId: { type: String, required: true },
    companyId: { type: String, required: true },
    refNo: String,
    date: { type: String, required: true },
    dueDate: String,
    entityId: String,
    customerId: String,
    vendorId: String,
    employeeId: String,
    items: [TransactionItemSchema],
    total: { type: Number, required: true },
    status: String,
    bankAccountId: String,
    depositToId: String,
    transferFromId: String,
    transferToId: String,
    paymentMethod: String,
    appliedCreditIds: [String],
    purchaseOrderId: String,
    customerInvoiceNo: String,
    expectedDate: String,
    vendorMessage: String,
    itemReceiptId: String,
    lotNumber: String,
    classId: String,
    salesRepId: String,
    shipVia: String,
    memo: String,
    exchangeRate: Number,
    homeAmount: Number,
    isChangeOrder: Boolean,
    subtotal: Number,
    taxAmount: Number,
    trackingNo: String,
    shipDate: String,
    fob: String,
    email: String,
    cc: String,
    bcc: String,
    paymentOptions: [String],
    memoOnStatement: String,
    attachments: [Object],
    deposit: Number,
    taxItemId: String,
    terms: String,
    BillAddr: Object,
    ShipAddr: Object,
    shippingDetails: {
        shipmentCost: Number,
        innerPackDimensions: { length: Number, width: Number, height: Number, unit: String },
        outerBoxDimensions: { length: Number, width: Number, height: Number, unit: String },
        masterCartonDimensions: { length: Number, width: Number, height: Number, unit: String }
    },
    discountAmount: Number,
    discountPercentage: Number,
    isDiscountPercentage: Boolean,
    lateFee: Number,
    tip: Number,
    internalNotes: String,
    location: String,
    taxRate: Number,
    estimateId: String,
    progressType: String,
    progressPercent: Number,
    // Bidirectional document links — all transaction IDs related to this document
    linkedDocumentIds: [String],
    // Backorder tracking
    backorderStatus: { type: String, enum: ['NONE', 'PARTIAL', 'FULL'], default: 'NONE' },
    // Warehouse / site tracking (Enterprise inventory)
    shipToWarehouseId: String,       // PO: which warehouse receives the shipment
    fulfillmentWarehouseId: String,  // SO: which warehouse fulfills the order
    fulfillmentBinId: String,        // SO: which bin within the warehouse
    // Shipment fields (SHIPMENT transaction type)
    carrier: String,
    shippedLines: [Object],          // per-line pick/pack/ship detail
    // Standard cost variance GL posting (ASSEMBLY_BUILD with Standard valuation)
    varianceAmount: Number,           // actual - standard (positive = unfavorable)
    varianceAccountId: String,        // account that absorbed the variance
    // ── Work Order (QB Enterprise manufacturing) ──────────────────────────────
    workOrderStatus: { type: String, enum: ['OPEN', 'IN_PROGRESS', 'PARTIAL_COMPLETE', 'COMPLETE', 'CANCELLED'] },
    quantityPlanned: Number,          // WO: total units planned to build
    quantityCompleted: { type: Number, default: 0 }, // WO: cumulative units built so far
    // Output lot / serial assignment — captured on ASSEMBLY_BUILD and WO
    outputLotNumber: String,          // Lot number to assign to finished assembly
    outputLotExpirationDate: String,  // Expiry date for output lot
    outputLotManufacturingDate: String, // Manufacturing/production date for output lot
    linkedWorkOrderId: String,        // ASSEMBLY_BUILD: WO this build fulfills
    // ── Shipping Module ───────────────────────────────────────────────────────
    shipViaId: String,                    // ShipViaEntry.id
    shippingCost: Number,                 // inbound: carrier charge; outbound: amount charged to customer
    shippingBillId: String,               // ID of auto-generated carrier BILL (inbound)
    shippingInvoiceLineId: String,        // ID of injected shipping line item (outbound invoice/SO)
    outboundCarrierCost: Number,          // outbound: what we pay the carrier for delivery
    outboundShippingBillId: String,       // ID of auto-generated carrier BILL (outbound)
    // ── SO Fulfillment Status ────────────────────────────────────────────────
    fulfillmentStatus: { type: String, enum: ['UNFULFILLED', 'PARTIALLY_FULFILLED', 'FULFILLED'], default: 'UNFULFILLED' },
    // ── Progress Invoicing Milestones ─────────────────────────────────────────
    milestones: [{
        id: String,
        name: String,
        amount: Number,
        dueDate: String,
        billedInvoiceId: String,     // set when invoiced
        status: { type: String, enum: ['PENDING', 'BILLED', 'PAID'], default: 'PENDING' },
    }],
    // ── PO Approval Workflow ──────────────────────────────────────────────────
    approvalStatus: { type: String, enum: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'], default: 'DRAFT' },
    approvedBy: String,           // userId who approved
    approvedAt: String,           // ISO date of approval
    rejectedBy: String,           // userId who rejected
    rejectedAt: String,           // ISO date of rejection
    approvalNotes: String,        // notes from approver/rejecter
    // ── Allocation (MRP Reception Report) ────────────────────────────────────
    // Tracks products/components assigned from this MO to SOs or other MOs
    allocations: [{
        allocationId: { type: String, required: true },   // unique UUID per allocation
        targetTransactionId: { type: String, required: true }, // SO or target MO id
        targetType: { type: String, enum: ['DELIVERY_ORDER', 'WORK_ORDER'] }, // destination type
        itemId: String,                                    // product / component being reserved
        lineItemId: String,                                // target SO/MO line item id
        quantity: { type: Number, required: true },        // qty reserved
        assignedAt: String,                                // ISO date of assignment
        assignedBy: String,                                // userId who assigned
        labelsPrinted: { type: Boolean, default: false },  // whether PDF labels were generated
    }],
}, { timestamps: true });

// ── Indexes ──────────────────────────────────────────────────────────────────
// Primary list queries (type + date range are the hottest path)
TransactionSchema.index({ companyId: 1, userId: 1, type: 1, date: -1 });
// Status filtering (open invoices, unpaid bills, etc.)
TransactionSchema.index({ companyId: 1, userId: 1, status: 1, date: -1 });
// Entity / customer / vendor look-ups
TransactionSchema.index({ companyId: 1, userId: 1, customerId: 1, date: -1 });
TransactionSchema.index({ companyId: 1, userId: 1, vendorId: 1, date: -1 });
TransactionSchema.index({ companyId: 1, userId: 1, entityId: 1 });
// Linked-document traversal (SO→PO→IR→Bill chain)
TransactionSchema.index({ companyId: 1, userId: 1, linkedDocumentIds: 1 });
TransactionSchema.index({ companyId: 1, userId: 1, estimateId: 1 });
TransactionSchema.index({ companyId: 1, userId: 1, purchaseOrderId: 1 });
TransactionSchema.index({ companyId: 1, userId: 1, itemReceiptId: 1 });
// Work-order look-up
TransactionSchema.index({ companyId: 1, userId: 1, linkedWorkOrderId: 1 });
// Bank reconciliation (account + date)
TransactionSchema.index({ companyId: 1, userId: 1, bankAccountId: 1, date: -1 });
// General date-range scans (reports without type filter)
TransactionSchema.index({ companyId: 1, userId: 1, date: -1 });
// refNo lookups (search by reference number)
TransactionSchema.index({ companyId: 1, userId: 1, refNo: 1 }, { sparse: true });
// Shipping module: find source transactions that have a shipping bill
TransactionSchema.index({ companyId: 1, userId: 1, shippingBillId: 1 }, { sparse: true });

module.exports = mongoose.model('Transaction', TransactionSchema);
