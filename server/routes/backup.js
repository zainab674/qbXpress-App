
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const companyAuth = require('../middleware/companyAuth');
const fs = require('fs');
const path = require('path');
const Account = require('../models/Account');
const Customer = require('../models/Customer');
const Vendor = require('../models/Vendor');
const Transaction = require('../models/Transaction');
const Item = require('../models/Item');
const Employee = require('../models/Employee');

// POST /api/backup/create — scoped to the authenticated company
router.post('/create', auth, companyAuth, async (req, res, next) => {
    try {
        const { userId } = req.user;
        const { companyId } = req;
        const scope = { userId, companyId };

        const [accounts, customers, vendors, transactions, items, employees] = await Promise.all([
            Account.find(scope).lean(),
            Customer.find(scope).lean(),
            Vendor.find(scope).lean(),
            Transaction.find(scope).lean(),
            Item.find(scope).lean(),
            Employee.find(scope).lean(),
        ]);

        const backupData = {
            version: '2.0',
            timestamp: new Date().toISOString(),
            userId,
            companyId,
            data: { accounts, customers, vendors, transactions, items, employees },
        };

        const backupsDir = path.join(__dirname, '../backups');
        if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });

        const filename = `backup_${companyId}_${Date.now()}.json`;
        const filePath = path.join(backupsDir, filename);
        fs.writeFileSync(filePath, JSON.stringify(backupData));

        res.json({ filename, timestamp: backupData.timestamp, recordCounts: {
            accounts: accounts.length, customers: customers.length, vendors: vendors.length,
            transactions: transactions.length, items: items.length, employees: employees.length,
        }});
    } catch (err) {
        next(err);
    }
});

// GET /api/backup/download/:filename — stream backup file to client
router.get('/download/:filename', auth, companyAuth, async (req, res, next) => {
    try {
        const { companyId } = req;
        const { filename } = req.params;
        // Prevent path traversal
        if (!/^backup_[\w-]+_\d+\.json$/.test(filename)) {
            return res.status(400).json({ message: 'Invalid filename' });
        }
        // Ensure the file belongs to this company
        if (!filename.startsWith(`backup_${companyId}_`)) {
            return res.status(403).json({ message: 'Access denied' });
        }
        const filePath = path.join(__dirname, '../backups', filename);
        if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'Backup not found' });

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        fs.createReadStream(filePath).pipe(res);
    } catch (err) {
        next(err);
    }
});

// GET /api/backup/list — list backups for this company
router.get('/list', auth, companyAuth, async (req, res, next) => {
    try {
        const { companyId } = req;
        const backupsDir = path.join(__dirname, '../backups');
        if (!fs.existsSync(backupsDir)) return res.json([]);

        const files = fs.readdirSync(backupsDir)
            .filter(f => f.startsWith(`backup_${companyId}_`) && f.endsWith('.json'))
            .map(f => {
                const ts = parseInt(f.split('_').pop().replace('.json', ''));
                return { filename: f, date: new Date(ts).toISOString(), size: fs.statSync(path.join(backupsDir, f)).size };
            })
            .sort((a, b) => b.date.localeCompare(a.date));

        res.json(files);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
