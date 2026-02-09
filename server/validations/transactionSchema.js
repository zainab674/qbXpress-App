
const { z } = require('zod');

const transactionItemSchema = z.object({
    id: z.string().optional(),
    description: z.string().optional().default(''),
    quantity: z.number().optional().default(1),
    rate: z.number().optional().default(0),
    amount: z.number().default(0),
    accountId: z.string().optional(),
    entityId: z.string().optional(),
    tax: z.boolean().optional(),
    classId: z.string().optional(),
    customerId: z.string().optional(),
    isBillable: z.boolean().optional(),
}).passthrough();

const singleTransactionSchema = z.object({
    type: z.enum(['INVOICE', 'ESTIMATE', 'BILL', 'PURCHASE_ORDER', 'SALES_RECEIPT', 'PAYMENT', 'BILL_PAYMENT', 'CHECK', 'DEPOSIT', 'CREDIT_MEMO', 'VENDOR_CREDIT', 'RECEIVE_ITEM', 'INVENTORY_ADJ', 'ASSEMBLY_BUILD', 'TRANSFER', 'CC_CHARGE', 'JOURNAL_ENTRY', 'PAYCHECK', 'TAX_PAYMENT', 'TAX_ADJUSTMENT']),
    refNo: z.string().optional(),
    date: z.string().min(1, 'Date is required'),
    entityId: z.string().optional(),
    bankAccountId: z.string().optional(),
    total: z.number().default(0),
    status: z.string().optional(),
    items: z.array(transactionItemSchema).optional().default([]),
    memo: z.string().optional(),
    dueDate: z.string().optional(),
    itemReceiptId: z.string().optional(),
    purchaseOrderId: z.string().optional(),
    salesRepId: z.string().optional(),
    shipVia: z.string().optional(),
    trackingNo: z.string().optional(),
    shipDate: z.string().optional(),
    fob: z.string().optional(),
    vendorMessage: z.string().optional(),
    appliedCreditIds: z.array(z.string()).optional(),
    transferFromId: z.string().optional(),
    transferToId: z.string().optional(),
    depositToId: z.string().optional(),
    paymentMethod: z.string().optional(),
    checkNo: z.string().optional(),
    userId: z.string().optional(),
    companyId: z.string().optional(),
    id: z.string().optional(),
}).passthrough();

const transactionSchema = z.object({
    body: z.union([singleTransactionSchema, z.array(singleTransactionSchema)])
});

module.exports = { transactionSchema };
