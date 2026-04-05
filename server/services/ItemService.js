
const Item = require('../models/Item');
const AuditLogEntry = require('../models/AuditLogEntry');
const crypto = require('crypto');

const ItemService = {
    getAll: async (userId, companyId) => {
        return await Item.find({ userId, companyId }).sort({ name: 1 });
    },
    getOne: async (id, userId, companyId) => {
        return await Item.findOne({ id, userId });
    },
    save: async (data, userId, companyId, userRole) => {
        data.userId = userId; data.companyId = companyId;
        const existing = await Item.findOne({ id: data.id, userId, companyId });

        if (!data.id) data.id = crypto.randomUUID();

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

