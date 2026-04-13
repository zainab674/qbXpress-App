
const Item = require('../models/Item');
const Account = require('../models/Account');
const AuditLogEntry = require('../models/AuditLogEntry');
const crypto = require('crypto');

const ItemService = {
    getAll: async (userId, companyId) => {
        const items = await Item.find({ userId, companyId }).sort({ name: 1 }).lean();
        const itemMap = Object.fromEntries(items.map(i => [i.id, i]));

        // Recursively compute BOM cost for assembly items from their components
        const computeBOMCost = (id, visited = new Set()) => {
            if (visited.has(id)) return 0; // circular reference guard
            const item = itemMap[id];
            if (!item) return 0;
            if (item.type === 'Inventory Assembly' && item.assemblyItems?.length) {
                const v2 = new Set(visited).add(id);
                return item.assemblyItems.reduce((sum, comp) => {
                    return sum + (comp.quantity || 0) * computeBOMCost(comp.itemId, v2);
                }, 0);
            }
            return item.averageCost || item.cost || 0;
        };

        return items.map(item => {
            if (item.type === 'Inventory Assembly' && item.assemblyItems?.length) {
                item.bomCost = computeBOMCost(item.id);
            }
            return item;
        });
    },
    getOne: async (id, userId, companyId) => {
        return await Item.findOne({ id, userId });
    },
    save: async (data, userId, companyId, userRole) => {
        data.userId = userId; data.companyId = companyId;
        const existing = await Item.findOne({ id: data.id, userId, companyId });

        if (!data.id) data.id = crypto.randomUUID();

        // ── Input validation ──────────────────────────────────────────────────
        if (data.type === 'Discount') {
            if (data.discountType && !['Percent', 'Fixed'].includes(data.discountType)) {
                throw Object.assign(new Error('discountType must be Percent or Fixed'), { status: 400 });
            }
            if (data.discountType === 'Percent' || !data.discountType) {
                if (data.discountRate != null && (isNaN(data.discountRate) || data.discountRate < 0 || data.discountRate > 100)) {
                    throw Object.assign(new Error('discountRate must be 0–100'), { status: 400 });
                }
            }
            if (data.discountType === 'Fixed') {
                if (data.discountAmount != null && (isNaN(data.discountAmount) || data.discountAmount < 0)) {
                    throw Object.assign(new Error('discountAmount must be >= 0'), { status: 400 });
                }
            }
        }

        if (data.minimumOrderQty != null && (isNaN(data.minimumOrderQty) || data.minimumOrderQty < 0)) {
            throw Object.assign(new Error('minimumOrderQty must be >= 0'), { status: 400 });
        }

        // Sanitize vendors array — each entry must have a non-empty vendorId
        if (Array.isArray(data.vendors)) {
            data.vendors = data.vendors
                .filter(v => v && typeof v.vendorId === 'string' && v.vendorId.trim())
                .map(v => ({
                    vendorId: v.vendorId.trim(),
                    vendorSKU: v.vendorSKU || undefined,
                    price: v.price != null && !isNaN(v.price) && v.price >= 0 ? Number(v.price) : undefined,
                    leadTimeDays: v.leadTimeDays != null && !isNaN(v.leadTimeDays) && v.leadTimeDays >= 0 ? Math.round(v.leadTimeDays) : undefined,
                    minimumOrderQty: v.minimumOrderQty != null && !isNaN(v.minimumOrderQty) && v.minimumOrderQty >= 0 ? Number(v.minimumOrderQty) : undefined,
                    isPreferred: !!v.isPreferred,
                }));
            // Enforce only one preferred vendor
            const preferredCount = data.vendors.filter(v => v.isPreferred).length;
            if (preferredCount > 1) {
                throw Object.assign(new Error('Only one vendor may be marked as preferred'), { status: 400 });
            }
        }

        // Sanitize priceLevelPrices — strip invalid entries
        if (Array.isArray(data.priceLevelPrices)) {
            data.priceLevelPrices = data.priceLevelPrices
                .filter(p => p && typeof p.priceLevelId === 'string' && p.priceLevelId.trim() && !isNaN(p.price) && p.price >= 0)
                .map(p => ({ priceLevelId: p.priceLevelId.trim(), price: Number(p.price) }));
        }

        // ── Protect derived transaction-managed fields for existing items ─────
        // onPurchaseOrder and onSalesOrder are maintained exclusively by
        // purchase order / sales order transactions — never accept client values.
        // onHand for existing items is managed by Receive Inventory and Inventory
        // Adjustment — reject attempts to set it directly via item save.
        if (existing) {
            data.onPurchaseOrder = existing.onPurchaseOrder;
            data.onSalesOrder    = existing.onSalesOrder;
            // Only allow onHand change through item save when the item was JUST
            // created (no existing record). For existing items, lock it.
            data.onHand = existing.onHand;
            data.totalValue = existing.totalValue;
            data.averageCost = existing.averageCost;
        }

        // ── BOM Revision History ──────────────────────────────────────────────
        // Capture a revision whenever assemblyItems changes on an Inventory Assembly.
        if (data.type === 'Inventory Assembly' && data.assemblyItems) {
            const oldComponents = existing?.assemblyItems || [];
            const newComponents = data.assemblyItems || [];

            // Detect a meaningful change: different length, or any component differs
            const changed = oldComponents.length !== newComponents.length ||
                newComponents.some((nc, i) => {
                    const oc = oldComponents[i];
                    return !oc ||
                        oc.itemId !== nc.itemId ||
                        oc.quantity !== nc.quantity ||
                        (oc.scrapPercent || 0) !== (nc.scrapPercent || 0) ||
                        (oc.yieldPercent || 100) !== (nc.yieldPercent || 100);
                });

            if (changed && existing) {
                // Preserve existing revision history then append a new snapshot of the OLD bom
                const prevRevisions = existing.bomRevisions || [];
                const nextRevNo = (prevRevisions.length > 0 ? prevRevisions[prevRevisions.length - 1].revisionNo : 0) + 1;

                // Auto-generate a human-readable change note
                const added   = newComponents.filter(nc => !oldComponents.find(oc => oc.itemId === nc.itemId));
                const removed = oldComponents.filter(oc => !newComponents.find(nc => nc.itemId === oc.itemId));
                const qtyChanged = newComponents.filter(nc => {
                    const oc = oldComponents.find(o => o.itemId === nc.itemId);
                    return oc && oc.quantity !== nc.quantity;
                });
                const parts = [];
                if (added.length)      parts.push(`${added.length} component(s) added`);
                if (removed.length)    parts.push(`${removed.length} component(s) removed`);
                if (qtyChanged.length) parts.push(`${qtyChanged.length} qty change(s)`);
                const note = parts.length ? parts.join('; ') : 'BOM updated';

                data.bomRevisions = [
                    ...prevRevisions,
                    {
                        revisionNo: nextRevNo,
                        date: new Date(),
                        changedBy: userRole || userId || 'Unknown',
                        note,
                        assemblyItems: oldComponents.map(c => ({ ...c })),
                    }
                ];
            } else if (!existing) {
                // First save — record rev 0 as the initial BOM
                data.bomRevisions = [{
                    revisionNo: 0,
                    date: new Date(),
                    changedBy: userRole || userId || 'Unknown',
                    note: 'Initial BOM created',
                    assemblyItems: newComponents.map(c => ({ ...c })),
                }];
            } else {
                // No BOM change — preserve existing revisions
                data.bomRevisions = existing.bomRevisions || [];
            }
        }

        const item = await Item.findOneAndUpdate({ id: data.id, userId, companyId }, data, { upsert: true, new: true });

        // Update Account Balance if onHand or cost changed manually
        if (item.type === 'Inventory Part' || item.type === 'Inventory Assembly') {
            const oldQty = existing ? (existing.onHand || 0) : 0;
            const newQty = item.onHand || 0;
            const oldCost = existing ? (existing.cost || 0) : 0;
            const newCost = item.cost || 0;

            const oldValue = oldQty * oldCost;
            const newValue = newQty * newCost;
            const diff = newValue - oldValue;

            if (diff !== 0 && item.assetAccountId) {
                await Account.findOneAndUpdate(
                    { id: item.assetAccountId, userId, companyId },
                    { $inc: { balance: diff } }
                );
            }
        }

        // Audit Trail
        const auditLog = new AuditLogEntry({
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            userId: userRole || 'Admin',
            actualUserId: userId, companyId: companyId,
            action: existing ? 'MODIFY' : 'CREATE',
            transactionType: 'ITEM',
            transactionId: item.id,
            refNo: item.name,
            newContent: JSON.stringify(item)
        });
        await auditLog.save();

        return item;
    },
    delete: async (id, userId, companyId, userRole) => {
        const item = await Item.findOneAndDelete({ id, userId, companyId });
        if (item) {
            const auditLog = new AuditLogEntry({
                id: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
                userId: userRole || 'Admin',
                actualUserId: userId, companyId: companyId,
                action: 'DELETE',
                transactionType: 'ITEM',
                transactionId: id,
                refNo: item.name,
                priorContent: JSON.stringify(item)
            });
            await auditLog.save();
        }
        return item;
    },
    bulkUpdate: async (items, userId, companyId, userRole) => {
        const operations = [];
        for (const it of items) {
            it.userId = userId;
            const existing = await Item.findOne({ id: it.id, userId, companyId });

            operations.push({
                updateOne: {
                    filter: { id: it.id, userId },
                    update: it,
                    upsert: true
                }
            });

            const auditLog = new AuditLogEntry({
                id: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
                userId: userRole || 'Admin',
                actualUserId: userId, companyId: companyId,
                action: existing ? 'MODIFY' : 'CREATE',
                transactionType: 'ITEM',
                transactionId: it.id,
                refNo: it.name,
                newContent: JSON.stringify(it)
            });
            await auditLog.save();

            // Update Account Balance for bulk updates
            if (it.type === 'Inventory Part' || it.type === 'Inventory Assembly') {
                const oldQty = existing ? (existing.onHand || 0) : 0;
                const newQty = it.onHand || 0;
                const oldCost = existing ? (existing.cost || 0) : 0;
                const newCost = it.cost || 0;

                const oldValue = oldQty * oldCost;
                const newValue = newQty * newCost;
                const diff = newValue - oldValue;

                if (diff !== 0 && it.assetAccountId) {
                    await Account.findOneAndUpdate(
                        { id: it.assetAccountId, userId, companyId },
                        { $inc: { balance: diff } }
                    );
                }
            }
        }
        return await Item.bulkWrite(operations);
    }
};

module.exports = ItemService;

