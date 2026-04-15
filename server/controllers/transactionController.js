
const transactionService = require('../services/transactionService');
const Transaction = require('../models/Transaction');

const transactionController = {
    getAll: async (req, res, next) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10000;
            const skip = (page - 1) * limit;

            const items = await Transaction.find({ userId: req.user.id, companyId: req.companyId })
                .sort({ date: -1 })
                .skip(skip)
                .limit(limit);

            const total = await Transaction.countDocuments({ userId: req.user.id, companyId: req.companyId });

            res.json({
                items,
                total,
                page,
                pages: Math.ceil(total / limit)
            });
        } catch (err) {
            next(err);
        }
    },

    getOne: async (req, res, next) => {
        try {
            const item = await Transaction.findOne({ id: req.params.id, userId: req.user.id, companyId: req.companyId });
            if (!item) return res.status(404).json({ message: 'Transaction not found' });
            res.json(item);
        } catch (err) {
            next(err);
        }
    },

    save: async (req, res, next) => {
        try {
            const userRole = req.user.role || 'Standard';
            const results = await transactionService.saveTransaction(req.body, userRole, req.user.id, req.companyId);
            // Forward any auto-created POs so the frontend can notify the user
            const autoPOs = results[0]?._autoPOsCreated;
            if (autoPOs && autoPOs.length > 0) {
                return res.status(200).json({ results, autoCreatedPOs: autoPOs });
            }
            res.status(200).json(results);
        } catch (err) {
            next(err);
        }
    },

    delete: async (req, res, next) => {
        try {
            const item = await Transaction.findOneAndDelete({ id: req.params.id, userId: req.user.id, companyId: req.companyId });
            if (!item) return res.status(404).json({ message: 'Transaction not found' });
            res.json({ message: 'Deleted successfully' });
        } catch (err) {
            next(err);
        }
    },
    bulkUpdate: async (req, res, next) => {
        try {
            const userRole = req.user.role || 'Standard';
            const results = await transactionService.saveTransaction(req.body.items, userRole, req.user.id, req.companyId);
            res.json(results);
        } catch (err) {
            next(err);
        }
    },

    nextRefNo: async (req, res, next) => {
        try {
            const { type } = req.query;
            const prefixMap = {
                PURCHASE_ORDER: 'PO',
                INVOICE: 'INV',
                SALES_ORDER: 'SO',
                ESTIMATE: 'EST',
                BILL: 'BILL',
                CHECK: 'CHK',
                DEPOSIT: 'DEP',
                SALES_RECEIPT: 'SR',
                CREDIT_MEMO: 'CM',
                PAYMENT: 'PMT',
                VENDOR_CREDIT: 'VC',
                BILL_PAYMENT: 'BP',
                RECEIVE_ITEM: 'RECV',
                INVENTORY_ADJ: 'ADJ',
                ASSEMBLY_BUILD: 'BUILD',
                WORK_ORDER: 'WO',
                TRANSFER: 'XFER',
                CC_CHARGE: 'CC',
                TAX_PAYMENT: 'TAX',
                TAX_ADJUSTMENT: 'TAXADJ',
                JOURNAL_ENTRY: 'JE',
            };
            if (!type || !(type in prefixMap)) return res.status(400).json({ message: 'Missing or unsupported type' });
            const prefix = prefixMap[type];

            const last = await Transaction.findOne(
                { userId: req.user.id, companyId: req.companyId, type },
                { refNo: 1 },
                { sort: { createdAt: -1 } }
            );

            let next = 1;
            if (last?.refNo) {
                const match = last.refNo.match(/(\d+)$/);
                if (match) next = parseInt(match[1], 10) + 1;
            }

            res.json({ refNo: `${prefix}-${String(next).padStart(5, '0')}` });
        } catch (err) {
            next(err);
        }
    },

    // ── Allocation: assign products from an MO to an SO or target MO ─────────
    assignAllocation: async (req, res, next) => {
        try {
            const { id } = req.params;
            const { targetTransactionId, targetType, itemId, lineItemId, quantity } = req.body;

            if (!targetTransactionId) return res.status(400).json({ message: 'targetTransactionId is required' });
            if (!targetType || !['DELIVERY_ORDER', 'WORK_ORDER'].includes(targetType)) {
                return res.status(400).json({ message: 'targetType must be DELIVERY_ORDER or WORK_ORDER' });
            }
            if (!quantity || quantity <= 0) return res.status(400).json({ message: 'quantity must be > 0' });

            const mo = await Transaction.findOne({ id, userId: req.user.id, companyId: req.companyId });
            if (!mo) return res.status(404).json({ message: 'Manufacturing Order not found' });

            const target = await Transaction.findOne({ id: targetTransactionId, userId: req.user.id, companyId: req.companyId });
            if (!target) return res.status(404).json({ message: 'Target order not found' });

            const crypto = require('crypto');
            const allocationId = crypto.randomUUID();
            const allocation = {
                allocationId,
                targetTransactionId,
                targetType,
                itemId: itemId || (mo.items && mo.items[0] ? mo.items[0].itemId : null),
                lineItemId: lineItemId || null,
                quantity,
                assignedAt: new Date().toISOString(),
                assignedBy: req.user.id,
                labelsPrinted: false,
            };

            await Transaction.updateOne(
                { id, userId: req.user.id, companyId: req.companyId },
                { $push: { allocations: allocation } }
            );

            res.json({ allocationId, allocation });
        } catch (err) {
            next(err);
        }
    },

    // ── PO Approval Workflow ──────────────────────────────────────────────────
    submitForApproval: async (req, res, next) => {
        try {
            const { id } = req.params;
            const tx = await Transaction.findOne({ id, userId: req.user.id, companyId: req.companyId });
            if (!tx) return res.status(404).json({ message: 'Transaction not found' });
            if (tx.type !== 'PURCHASE_ORDER') return res.status(400).json({ message: 'Only Purchase Orders require approval' });
            if (!['DRAFT', 'REJECTED'].includes(tx.approvalStatus)) {
                return res.status(400).json({ message: `Cannot submit from status: ${tx.approvalStatus}` });
            }
            await Transaction.updateOne(
                { id, userId: req.user.id, companyId: req.companyId },
                { $set: { approvalStatus: 'PENDING_APPROVAL', approvalNotes: null, rejectedBy: null, rejectedAt: null } }
            );
            res.json({ approvalStatus: 'PENDING_APPROVAL' });
        } catch (err) { next(err); }
    },

    approvePO: async (req, res, next) => {
        try {
            const { id } = req.params;
            const { notes } = req.body;
            const tx = await Transaction.findOne({ id, userId: req.user.id, companyId: req.companyId });
            if (!tx) return res.status(404).json({ message: 'Transaction not found' });
            if (tx.approvalStatus !== 'PENDING_APPROVAL') {
                return res.status(400).json({ message: 'PO is not pending approval' });
            }
            await Transaction.updateOne(
                { id, userId: req.user.id, companyId: req.companyId },
                { $set: { approvalStatus: 'APPROVED', approvedBy: req.user.id, approvedAt: new Date().toISOString(), approvalNotes: notes || null } }
            );
            res.json({ approvalStatus: 'APPROVED' });
        } catch (err) { next(err); }
    },

    rejectPO: async (req, res, next) => {
        try {
            const { id } = req.params;
            const { notes } = req.body;
            const tx = await Transaction.findOne({ id, userId: req.user.id, companyId: req.companyId });
            if (!tx) return res.status(404).json({ message: 'Transaction not found' });
            if (tx.approvalStatus !== 'PENDING_APPROVAL') {
                return res.status(400).json({ message: 'PO is not pending approval' });
            }
            await Transaction.updateOne(
                { id, userId: req.user.id, companyId: req.companyId },
                { $set: { approvalStatus: 'REJECTED', rejectedBy: req.user.id, rejectedAt: new Date().toISOString(), approvalNotes: notes || null } }
            );
            res.json({ approvalStatus: 'REJECTED' });
        } catch (err) { next(err); }
    },

    // ── SO Fulfillment ────────────────────────────────────────────────────────
    updateFulfillment: async (req, res, next) => {
        try {
            const { id } = req.params;
            // lineUpdates: [{ lineId, fulfilledQty }]
            const { lineUpdates } = req.body;
            if (!Array.isArray(lineUpdates) || lineUpdates.length === 0) {
                return res.status(400).json({ message: 'lineUpdates array required' });
            }
            const tx = await Transaction.findOne({ id, userId: req.user.id, companyId: req.companyId });
            if (!tx) return res.status(404).json({ message: 'Transaction not found' });
            if (tx.type !== 'SALES_ORDER') return res.status(400).json({ message: 'Only Sales Orders support fulfillment updates' });

            const updatedItems = tx.items.map(item => {
                const upd = lineUpdates.find(u => u.lineId === item.id);
                if (upd) return { ...item.toObject(), fulfilledQty: Math.min(upd.fulfilledQty, item.quantity) };
                return item.toObject();
            });

            const totalQty = updatedItems.reduce((s, i) => s + (i.quantity || 0), 0);
            const fulfilledQty = updatedItems.reduce((s, i) => s + (i.fulfilledQty || 0), 0);
            let fulfillmentStatus = 'UNFULFILLED';
            if (fulfilledQty >= totalQty && totalQty > 0) fulfillmentStatus = 'FULFILLED';
            else if (fulfilledQty > 0) fulfillmentStatus = 'PARTIALLY_FULFILLED';

            await Transaction.updateOne(
                { id, userId: req.user.id, companyId: req.companyId },
                { $set: { items: updatedItems, fulfillmentStatus } }
            );
            res.json({ fulfillmentStatus, items: updatedItems });
        } catch (err) { next(err); }
    },

    // ── Allocation: remove an existing allocation ─────────────────────────────
    unassignAllocation: async (req, res, next) => {
        try {
            const { id, allocationId } = req.params;

            const mo = await Transaction.findOne({ id, userId: req.user.id, companyId: req.companyId });
            if (!mo) return res.status(404).json({ message: 'Manufacturing Order not found' });

            const exists = (mo.allocations || []).some(a => a.allocationId === allocationId);
            if (!exists) return res.status(404).json({ message: 'Allocation not found' });

            await Transaction.updateOne(
                { id, userId: req.user.id, companyId: req.companyId },
                { $pull: { allocations: { allocationId } } }
            );

            res.json({ success: true, allocationId });
        } catch (err) {
            next(err);
        }
    },

    // ── Shipping Module Summary ───────────────────────────────────────────────
    shippingSummary: async (req, res, next) => {
        try {
            const { startDate, endDate } = req.query;
            const baseFilter = { userId: req.user.id, companyId: req.companyId };
            if (startDate || endDate) {
                baseFilter.date = {};
                if (startDate) baseFilter.date.$gte = startDate;
                if (endDate) baseFilter.date.$lte = endDate;
            }

            // Source transactions that have a shipping bill linked
            const sourceTxsWithShipping = await Transaction.find(
                { ...baseFilter, shippingBillId: { $exists: true, $ne: null } },
                { shippingBillId: 1, shipVia: 1, shippingCost: 1, refNo: 1, type: 1, date: 1 }
            );

            const shippingBillIds = sourceTxsWithShipping.map(t => t.shippingBillId).filter(Boolean);

            const inboundBills = shippingBillIds.length
                ? await Transaction.find({ ...baseFilter, id: { $in: shippingBillIds } })
                : [];

            // Outbound: invoices / SOs with a shipping charge to the customer
            const outboundFilter = { ...baseFilter, type: { $in: ['INVOICE', 'SALES_ORDER'] }, shippingCost: { $exists: true, $gt: 0 } };
            if (startDate || endDate) outboundFilter.date = baseFilter.date;
            const outboundTxs = await Transaction.find(outboundFilter);

            const totalPaidToCarriers = inboundBills.reduce((s, b) => s + (b.total || 0), 0);
            const totalChargedToCustomers = outboundTxs.reduce((s, i) => s + (i.shippingCost || 0), 0);

            res.json({
                inboundBills,
                outboundTxs,
                summary: {
                    totalPaidToCarriers,
                    totalChargedToCustomers,
                    netShippingCost: totalPaidToCarriers - totalChargedToCustomers,
                },
            });
        } catch (err) {
            next(err);
        }
    },

    uploadAttachment: async (req, res, next) => {
        try {
            if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
            const tx = await Transaction.findOne({ id: req.params.id, userId: req.user.id, companyId: req.companyId });
            if (!tx) return res.status(404).json({ message: 'Transaction not found' });

            const fs = require('fs');
            const dir = 'uploads/attachments';
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

            const fileName = `${Date.now()}-${req.file.originalname}`;
            const filePath = `${dir}/${fileName}`;
            fs.writeFileSync(filePath, req.file.buffer);

            const attachment = {
                id: Date.now().toString(),
                name: req.file.originalname,
                url: `/uploads/attachments/${fileName}`,
                size: req.file.size,
                type: req.file.mimetype,
                uploadDate: new Date().toLocaleDateString()
            };

            tx.attachments = [...(tx.attachments || []), attachment];
            await tx.save();

            res.json({ message: 'Attachment uploaded successfully', attachment });
        } catch (err) {
            next(err);
        }
    },

    deleteAttachment: async (req, res, next) => {
        try {
            const { fileName } = req.body;
            const tx = await Transaction.findOne({ id: req.params.id, userId: req.user.id, companyId: req.companyId });
            if (!tx) return res.status(404).json({ message: 'Transaction not found' });

            const index = (tx.attachments || []).findIndex(a => a.url && a.url.endsWith(fileName));
            if (index === -1) return res.status(404).json({ message: 'Attachment not found' });

            const attachment = tx.attachments[index];
            const fs = require('fs');
            const path = require('path');
            const filePath = path.join(process.cwd(), attachment.url.replace(/^\//, ''));
            if (fs.existsSync(filePath)) {
                try { fs.unlinkSync(filePath); } catch (e) { console.error('Failed to delete file:', e); }
            }

            tx.attachments.splice(index, 1);
            await tx.save();

            res.json({ message: 'Attachment deleted successfully' });
        } catch (err) {
            next(err);
        }
    },
};

module.exports = transactionController;
