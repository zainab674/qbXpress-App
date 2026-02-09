
const Account = require('../models/Account');
const AuditLogEntry = require('../models/AuditLogEntry');
const crypto = require('crypto');

const AccountService = {
    getAll: async (userId, companyId) => {
        return await Account.find({ userId, companyId }).sort({ name: 1 });
    },
    getOne: async (id, userId, companyId) => {
        return await Account.findOne({ id, userId });
    },
    save: async (data, userId, companyId, userRole) => {
        data.userId = userId; data.companyId = companyId;
        const existing = await Account.findOne({ id: data.id, userId, companyId });

        if (!data.id) data.id = crypto.randomUUID();

        const account = await Account.findOneAndUpdate({ id: data.id, userId, companyId }, data, { upsert: true, new: true });

        // Audit Trail
        const auditLog = new AuditLogEntry({
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            userId: userRole || 'Admin',
            actualUserId: userId, companyId: companyId,
            action: existing ? 'MODIFY' : 'CREATE',
            transactionType: 'ACCOUNT',
            transactionId: account.id,
            refNo: account.name,
            newContent: JSON.stringify(account)
        });
        await auditLog.save();

        return account;
    },
    delete: async (id, userId, companyId, userRole) => {
        const account = await Account.findOneAndDelete({ id, userId, companyId });
        if (account) {
            const auditLog = new AuditLogEntry({
                id: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
                userId: userRole || 'Admin',
                actualUserId: userId, companyId: companyId,
                action: 'DELETE',
                transactionType: 'ACCOUNT',
                transactionId: id,
                refNo: account.name,
                priorContent: JSON.stringify(account)
            });
            await auditLog.save();
        }
        return account;
    },
    bulkUpdate: async (items, userId, companyId, userRole) => {
        const operations = [];
        for (const item of items) {
            item.userId = userId; item.companyId = companyId;
            const existing = await Account.findOne({ id: item.id, userId, companyId });

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
                transactionType: 'ACCOUNT',
                transactionId: item.id,
                refNo: item.name,
                newContent: JSON.stringify(item)
            });
            await auditLog.save();
        }
        return await Account.bulkWrite(operations);
    }
};

module.exports = AccountService;

