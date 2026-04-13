
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
    },

    // Toggle isActive
    setStatus: async (id, isActive, userId, companyId, userRole) => {
        const customer = await Customer.findOneAndUpdate(
            { id, userId, companyId },
            { isActive },
            { new: true }
        );
        if (customer) {
            await new AuditLogEntry({
                id: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
                userId: userRole || 'Admin',
                actualUserId: userId, companyId,
                action: 'MODIFY',
                transactionType: 'CUSTOMER',
                transactionId: id,
                refNo: customer.name,
                newContent: JSON.stringify({ isActive })
            }).save();
        }
        return customer;
    },

    // Append a note to a customer's notes array
    addNote: async (id, noteData, userId, companyId) => {
        const note = {
            id: crypto.randomUUID(),
            text: noteData.text,
            author: noteData.author,
            date: new Date().toISOString().slice(0, 10),
            isPinned: false
        };
        return await Customer.findOneAndUpdate(
            { id, userId, companyId },
            { $push: { notes: note } },
            { new: true }
        );
    },

    // Build a statement object (open invoices + balance summary)
    buildStatement: async (id, userId, companyId) => {
        const customer = await Customer.findOne({ id, userId, companyId });
        if (!customer) return null;

        const openTransactions = await Transaction.find({
            $or: [{ customerId: id }, { entityId: id }],
            userId, companyId,
            type: 'INVOICE',
            status: { $in: ['OPEN', 'OVERDUE'] }
        }).sort({ date: 1 });

        const now = new Date();
        const buckets = { current: 0, days31_60: 0, days61_90: 0, over90: 0 };
        openTransactions.forEach(tx => {
            const ageDays = Math.floor((now - new Date(tx.date)) / 86400000);
            if (ageDays <= 30)       buckets.current   += tx.total;
            else if (ageDays <= 60)  buckets.days31_60 += tx.total;
            else if (ageDays <= 90)  buckets.days61_90 += tx.total;
            else                     buckets.over90    += tx.total;
        });

        return {
            customer: { id: customer.id, name: customer.name, email: customer.email, address: customer.address },
            statementDate: now.toISOString().slice(0, 10),
            openTransactions,
            agingBuckets: buckets,
            totalDue: openTransactions.reduce((s, t) => s + t.total, 0)
        };
    }
};

module.exports = CustomerService;

