
const Employee = require('../models/Employee');
const AuditLogEntry = require('../models/AuditLogEntry');
const crypto = require('crypto');

const EmployeeService = {
    getAll: async (userId, companyId) => {
        return await Employee.find({ userId, companyId }).sort({ name: 1 });
    },
    getOne: async (id, userId, companyId) => {
        return await Employee.findOne({ id, userId });
    },
    save: async (data, userId, companyId, userRole) => {
        data.userId = userId; data.companyId = companyId;
        const existing = await Employee.findOne({ id: data.id, userId, companyId });

        if (!data.id) data.id = crypto.randomUUID();

        const employee = await Employee.findOneAndUpdate({ id: data.id, userId, companyId }, data, { upsert: true, new: true });

        // Audit Trail
        const auditLog = new AuditLogEntry({
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            userId: userRole || 'Admin',
            actualUserId: userId, companyId: companyId,
            action: existing ? 'MODIFY' : 'CREATE',
            transactionType: 'EMPLOYEE',
            transactionId: employee.id,
            refNo: employee.name,
            newContent: JSON.stringify(employee)
        });
        await auditLog.save();

        return employee;
    },
    delete: async (id, userId, companyId, userRole) => {
        const employee = await Employee.findOneAndDelete({ id, userId, companyId });
        if (employee) {
            const auditLog = new AuditLogEntry({
                id: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
                userId: userRole || 'Admin',
                actualUserId: userId, companyId: companyId,
                action: 'DELETE',
                transactionType: 'EMPLOYEE',
                transactionId: id,
                refNo: employee.name,
                priorContent: JSON.stringify(employee)
            });
            await auditLog.save();
        }
        return employee;
    },
    bulkUpdate: async (items, userId, companyId, userRole) => {
        const operations = [];
        for (const item of items) {
            item.userId = userId; item.companyId = companyId;
            const existing = await Employee.findOne({ id: item.id, userId, companyId });

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
                transactionType: 'EMPLOYEE',
                transactionId: item.id,
                refNo: item.name,
                newContent: JSON.stringify(item)
            });
            await auditLog.save();
        }
        return await Employee.bulkWrite(operations);
    }
};

module.exports = EmployeeService;

