
const Customer = require('../models/Customer');
const Transaction = require('../models/Transaction');
const AuditLogEntry = require('../models/AuditLogEntry');
const crypto = require('crypto');

const CustomerService = {
    getAll: async (userId, companyId) => {
        return await Customer.find({ userId, companyId }).sort({ name: 1 });
    },
    getOne: async (id, userId, companyId) => {
        return await Customer.findOne({ id, userId });
    },
    save: async (data, userId, companyId, userRole) => {
        data.userId = userId; data.companyId = companyId;
        const existing = await Customer.findOne({ id: data.id, userId, companyId });

        if (!data.id) data.id = crypto.randomUUID();

        const customer = await Customer.findOneAndUpdate({ id: data.id, userId, companyId }, data, { upsert: true, new: true });

        // Audit Trail
        const auditLog = new AuditLogEntry({
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            userId: userRole || 'Admin',
            actualUserId: userId, companyId: companyId,
            action: existing ? 'MODIFY' : 'CREATE',
            transactionType: 'CUSTOMER',
            transactionId: customer.id,
            refNo: customer.name,
            newContent: JSON.stringify(customer)
        });
        await auditLog.save();

        return customer;
    },
    delete: async (id, userId, companyId, userRole) => {
        const customer = await Customer.findOneAndDelete({ id, userId, companyId });
        if (customer) {
            // Cascade delete transactions
            await Transaction.deleteMany({
                $or: [{ customerId: id }, { entityId: id }],
                userId,
                companyId
            });

            const auditLog = new AuditLogEntry({
                id: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
                userId: userRole || 'Admin',
                actualUserId: userId, companyId: companyId,
                action: 'DELETE',
                transactionType: 'CUSTOMER',
                transactionId: id,
                refNo: customer.name,
                priorContent: JSON.stringify(customer)
            });
            await auditLog.save();
        }
        return customer;
    },
    bulkUpdate: async (items, userId, companyId, userRole) => {
        const operations = [];
        for (const item of items) {
            item.userId = userId; item.companyId = companyId;
            const existing = await Customer.findOne({ id: item.id, userId, companyId });

            operations.push({
                updateOne: {
                    filter: { id: item.id, userId, companyId },
                    update: item,
                    upsert: true
                }
            });

            // Audit Trail for each item in bulk
            const auditLog = new AuditLogEntry({
                id: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
                userId: userRole || 'Admin',
                actualUserId: userId, companyId: companyId,
                action: existing ? 'MODIFY' : 'CREATE',
                transactionType: 'CUSTOMER',
                transactionId: item.id,
                refNo: item.name,
                newContent: JSON.stringify(item)
            });
            await auditLog.save();
        }
        return await Customer.bulkWrite(operations);
    },
    bulkDelete: async (ids, userId, companyId, userRole) => {
        const results = [];
        for (const id of ids) {
            const customer = await Customer.findOneAndDelete({ id, userId, companyId });
            if (customer) {
                // Cascade delete transactions
                await Transaction.deleteMany({
                    $or: [{ customerId: id }, { entityId: id }],
                    userId,
                    companyId
                });

                const auditLog = new AuditLogEntry({
                    id: crypto.randomUUID(),
                    timestamp: new Date().toISOString(),
                    userId: userRole || 'Admin',
                    actualUserId: userId, companyId: companyId,
                    action: 'DELETE',
                    transactionType: 'CUSTOMER',
                    transactionId: id,
                    refNo: customer.name,
                    priorContent: JSON.stringify(customer)
                });
                await auditLog.save();
                results.push(customer);
            }
        }
        return results;
    }
};

module.exports = CustomerService;

