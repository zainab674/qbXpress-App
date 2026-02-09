const mongoose = require('mongoose');

const TransactionItemSchema = new mongoose.Schema({
    id: String,
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
    expectedDate: String,
    vendorMessage: String,
    itemReceiptId: String,
    classId: String,
    salesRepId: String,
    shipVia: String,
    memo: String,
    exchangeRate: Number,
    homeAmount: Number,
    isChangeOrder: Boolean,
}, { timestamps: true });

module.exports = mongoose.model('Transaction', TransactionSchema);
