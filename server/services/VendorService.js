
const Vendor = require('../models/Vendor');
const AuditLogEntry = require('../models/AuditLogEntry');
const crypto = require('crypto');

const VendorService = {
    getAll: async (userId, companyId) => {
        return await Vendor.find({ userId, companyId }).sort({ name: 1 });
    },
    getOne: async (id, userId, companyId) => {
        return await Vendor.findOne({ id, userId });
    },
    save: async (data, userId, companyId, userRole) => {
        data.userId = userId; data.companyId = companyId;
        const existing = await Vendor.findOne({ id: data.id, userId, companyId });

        if (!data.id) data.id = crypto.randomUUID();

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
    delete: async (id, userId, companyId, userRole) => {
        const vendor = await Vendor.findOneAndDelete({ id, userId, companyId });
        if (vendor) {
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
        for (const item of items) {
            item.userId = userId; item.companyId = companyId;
            const existing = await Vendor.findOne({ id: item.id, userId, companyId });

            operations.push({
                updateOne: {
                    filter: { id: item.id, userId, companyId },
                    update: item,
                    upsert: true
                }
            });

            const auditLog = new AuditLogEntry({
                id: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
                userId: userRole || 'Admin',
                actualUserId: userId, companyId: companyId,
                action: existing ? 'MODIFY' : 'CREATE',
                transactionType: 'VENDOR',
                transactionId: item.id,
                refNo: item.name,
                newContent: JSON.stringify(item)
            });
            await auditLog.save();
        }
        return await Vendor.bulkWrite(operations);
    }
};

module.exports = VendorService;

