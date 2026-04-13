
const ItemService = require('../services/ItemService');
const Item = require('../models/Item');

const itemController = {
    getAll: async (req, res, next) => {
        try {
            const items = await ItemService.getAll(req.user.id, req.companyId);
            res.json(items);
        } catch (err) {
            next(err);
        }
    },
    getOne: async (req, res, next) => {
        try {
            const item = await ItemService.getOne(req.params.id, req.user.id);
            if (!item) return res.status(404).json({ message: 'Item not found' });
            res.json(item);
        } catch (err) {
            next(err);
        }
    },
    save: async (req, res, next) => {
        try {
            const item = await ItemService.save(req.body, req.user.id, req.companyId, req.user.role);
            res.json(item);
        } catch (err) {
            next(err);
        }
    },
    delete: async (req, res, next) => {
        try {
            await ItemService.delete(req.params.id, req.user.id, req.companyId, req.user.role);
            res.json({ message: 'Deleted' });
        } catch (err) {
            next(err);
        }
    },
    lookupByBarcode: async (req, res, next) => {
        try {
            const item = await Item.findOne({
                barcode: req.params.barcode,
                userId: req.user.id,
                companyId: req.companyId,
            }).lean();
            if (!item) return res.status(404).json({ message: 'No item found for this barcode' });
            res.json(item);
        } catch (err) {
            next(err);
        }
    },
    bulkUpdate: async (req, res, next) => {
        try {
            await ItemService.bulkUpdate(req.body.items, req.user.id, req.companyId, req.user.role);
            res.json({ message: 'Bulk update successful' });
        } catch (err) {
            next(err);
        }
    },
    // GET /items/:id/vendor-purchases?vendorId=&fromDate=&toDate=&limit=
    // Returns purchase transactions (PO, Bill, Item Receipt) that include this item,
    // grouped by vendor so buyers can see price history and lead times.
    getVendorPurchaseHistory: async (req, res, next) => {
        try {
            const Transaction = require('../models/Transaction');
            const { vendorId, fromDate, toDate, limit = 100 } = req.query;

            const item = await Item.findOne({ id: req.params.id, userId: req.user.id, companyId: req.companyId }).lean();
            if (!item) return res.status(404).json({ message: 'Item not found' });

            const query = {
                userId: req.user.id,
                companyId: req.companyId,
                type: { $in: ['Purchase Order', 'Bill', 'Item Receipt'] },
                'items.itemId': req.params.id,
            };
            if (vendorId) query.vendorId = vendorId;
            if (fromDate) query.date = { ...(query.date || {}), $gte: fromDate };
            if (toDate)   query.date = { ...(query.date || {}), $lte: toDate };

            const transactions = await Transaction.find(query)
                .sort({ date: -1 })
                .limit(Math.min(parseInt(limit) || 100, 500))
                .lean();

            // Build per-vendor summary
            const byVendor = {};
            transactions.forEach(txn => {
                const vId = txn.vendorId || 'Unknown';
                if (!byVendor[vId]) byVendor[vId] = { vendorId: vId, purchases: [] };

                const lines = (txn.items || []).filter(l => l.itemId === req.params.id);
                lines.forEach(line => {
                    byVendor[vId].purchases.push({
                        transactionId: txn.id,
                        type: txn.type,
                        date: txn.date,
                        refNo: txn.refNo,
                        quantity: line.quantity,
                        unitPrice: line.rate,
                        totalAmount: line.amount,
                    });
                });
            });

            // Last-purchase price per vendor (most recent line)
            const vendorSummaries = Object.values(byVendor).map(v => {
                const sorted = v.purchases.slice().sort((a, b) => b.date.localeCompare(a.date));
                return {
                    ...v,
                    lastPurchaseDate: sorted[0]?.date || null,
                    lastUnitPrice: sorted[0]?.unitPrice || null,
                    totalQtyPurchased: v.purchases.reduce((s, p) => s + (p.quantity || 0), 0),
                };
            });

            res.json({
                itemId: item.id,
                itemName: item.name,
                preferredVendorId: item.preferredVendorId,
                vendors: vendorSummaries,
            });
        } catch (err) { next(err); }
    },

    getBOMHistory: async (req, res, next) => {
        try {
            const item = await Item.findOne({ id: req.params.id, userId: req.user.id, companyId: req.companyId }).lean();
            if (!item) return res.status(404).json({ message: 'Item not found' });
            if (item.type !== 'Inventory Assembly') {
                return res.status(400).json({ message: 'BOM history is only available for Inventory Assembly items' });
            }
            // Return revisions newest-first plus the current BOM as "Current"
            const revisions = (item.bomRevisions || []).slice().reverse();
            res.json({
                itemId: item.id,
                itemName: item.name,
                currentBOM: item.assemblyItems || [],
                revisions,
            });
        } catch (err) {
            next(err);
        }
    }
};

module.exports = itemController;

