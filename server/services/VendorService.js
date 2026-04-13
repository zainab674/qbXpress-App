
const Vendor = require('../models/Vendor');
const Transaction = require('../models/Transaction');
const AuditLogEntry = require('../models/AuditLogEntry');
const crypto = require('crypto');

const VendorService = {
    getAll: async (userId, companyId) => {
        return await Vendor.find({ userId, companyId }).sort({ name: 1 });
    },
    getOne: async (id, userId, companyId) => {
        return await Vendor.findOne({ id, userId, companyId });
    },
    save: async (data, userId, companyId, userRole) => {
        data.userId = userId; data.companyId = companyId;
        const existing = await Vendor.findOne({ id: data.id, userId, companyId });

        if (!data.id) data.id = crypto.randomUUID();

        if (!existing) {
            data.MetaData = { ...data.MetaData, CreateTime: new Date().toISOString() };
        }

        const vendor = await Vendor.findOneAndUpdate({ id: data.id, userId, companyId }, data, { upsert: true, new: true });

        // Audit Trail
        const auditLog = new AuditLogEntry({
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            userId: userRole || 'Admin',
            actualUserId: userId, companyId: companyId,
            action: existing ? 'MODIFY' : 'CREATE',
            transactionType: 'VENDOR',
            transactionId: vendor.id,
            refNo: vendor.name,
            newContent: JSON.stringify(vendor)
        });
        await auditLog.save();

        return vendor;
    },
    addNote: async (id, text, author, userId, companyId) => {
        const note = { id: crypto.randomUUID(), text, author, date: new Date().toISOString(), isPinned: false };
        return await Vendor.findOneAndUpdate(
            { id, userId, companyId },
            { $push: { notes: note } },
            { new: true }
        );
    },
    setStatus: async (id, isActive, userId, companyId, userRole) => {
        const vendor = await Vendor.findOneAndUpdate(
            { id, userId, companyId },
            { isActive },
            { new: true }
        );
        if (vendor) {
            const auditLog = new AuditLogEntry({
                id: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
                userId: userRole || 'Admin',
                actualUserId: userId, companyId,
                action: 'MODIFY',
                transactionType: 'VENDOR',
                transactionId: id,
                refNo: vendor.name,
                newContent: JSON.stringify({ isActive })
            });
            await auditLog.save();
        }
        return vendor;
    },
    merge: async (sourceId, targetId, userId, companyId, userRole) => {
        const source = await Vendor.findOne({ id: sourceId, userId, companyId });
        const target = await Vendor.findOne({ id: targetId, userId, companyId });
        if (!source || !target) throw new Error('One or both vendors not found');

        // Re-point all transactions from source to target
        await Transaction.updateMany(
            { vendorId: sourceId, userId, companyId },
            { vendorId: targetId, entityId: targetId }
        );
        await Transaction.updateMany(
            { entityId: sourceId, userId, companyId },
            { entityId: targetId }
        );

        // Merge balance into target
        const newBalance = (target.balance || 0) + (source.balance || 0);
        const merged = await Vendor.findOneAndUpdate(
            { id: targetId, userId, companyId },
            { balance: newBalance },
            { new: true }
        );

        // Delete source
        await Vendor.deleteOne({ id: sourceId, userId, companyId });

        const auditLog = new AuditLogEntry({
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            userId: userRole || 'Admin',
            actualUserId: userId, companyId,
            action: 'MODIFY',
            transactionType: 'VENDOR',
            transactionId: targetId,
            refNo: `Merged ${source.name} into ${target.name}`,
            newContent: JSON.stringify(merged),
            priorContent: JSON.stringify(source)
        });
        await auditLog.save();

        return merged;
    },
    delete: async (id, userId, companyId, userRole) => {
        const vendor = await Vendor.findOneAndDelete({ id, userId, companyId });
        if (vendor) {
            // Cascade delete transactions linked by either vendorId or entityId
            await Transaction.deleteMany({ $or: [{ vendorId: id }, { entityId: id }], userId, companyId });

            const auditLog = new AuditLogEntry({
                id: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
                userId: userRole || 'Admin',
                actualUserId: userId, companyId: companyId,
                action: 'DELETE',
                transactionType: 'VENDOR',
                transactionId: id,
                refNo: vendor.name,
                priorContent: JSON.stringify(vendor)
            });
            await auditLog.save();
        }
        return vendor;
    },
    bulkUpdate: async (items, userId, companyId, userRole) => {
        const operations = [];
        const auditEntries = [];

        for (const item of items) {
            item.userId = userId; item.companyId = companyId;
            const existing = await Vendor.findOne({ id: item.id, userId, companyId });
            operations.push({
                updateOne: {
                    filter: { id: item.id, userId, companyId },
                    update: { $set: item },
                    upsert: true
                }
            });
            auditEntries.push({
                action: existing ? 'MODIFY' : 'CREATE',
                item
            });
        }

        // Write to DB first — only create audit logs if bulkWrite succeeds
        const result = await Vendor.bulkWrite(operations);

        for (const entry of auditEntries) {
            const auditLog = new AuditLogEntry({
                id: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
                userId: userRole || 'Admin',
                actualUserId: userId, companyId,
                action: entry.action,
                transactionType: 'VENDOR',
                transactionId: entry.item.id,
                refNo: entry.item.name,
                newContent: JSON.stringify(entry.item)
            });
            await auditLog.save();
        }

        return result;
    },
    bulkDelete: async (ids, userId, companyId, userRole) => {
        const results = [];
        for (const id of ids) {
            const vendor = await Vendor.findOneAndDelete({ id, userId, companyId });
            if (vendor) {
                // Cascade delete transactions linked by either vendorId or entityId
                await Transaction.deleteMany({ $or: [{ vendorId: id }, { entityId: id }], userId, companyId });

                const auditLog = new AuditLogEntry({
                    id: crypto.randomUUID(),
                    timestamp: new Date().toISOString(),
                    userId: userRole || 'Admin',
                    actualUserId: userId, companyId: companyId,
                    action: 'DELETE',
                    transactionType: 'VENDOR',
                    transactionId: id,
                    refNo: vendor.name,
                    priorContent: JSON.stringify(vendor)
                });
                await auditLog.save();
                results.push(vendor);
            }
        }
        return results;
    }
};

module.exports = VendorService;

