
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const fs = require('fs');
const path = require('path');
const Account = require('../models/Account');
const Customer = require('../models/Customer');
const Vendor = require('../models/Vendor');
const Transaction = require('../models/Transaction');
const Item = require('../models/Item');

// Create a backup on the server and return data for download
router.get('/create', auth, async (req, res, next) => {
    try {
        const userId = req.user.id;
        const [accounts, customers, vendors, transactions, items] = await Promise.all([
            Account.find({ userId }),
            Customer.find({ userId }),
            Vendor.find({ userId }),
            Transaction.find({ userId }),
            Item.find({ userId })
        ]);

        const backupData = {
            timestamp: new Date().toISOString(),
            userId,
            data: { accounts, customers, vendors, transactions, items }
        };

        const backupsDir = path.join(__dirname, '../backups');
        if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });

        const filename = `backup_${userId}_${Date.now()}.json`;
        const filePath = path.join(backupsDir, filename);

        fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2));

        // Set headers to trigger download in browser
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(JSON.stringify(backupData, null, 2));
    } catch (error) {
        next(error);
    }
});

// List backups
router.get('/list', auth, async (req, res, next) => {
    try {
        const backupsDir = path.join(__dirname, '../backups');
        if (!fs.existsSync(backupsDir)) return res.json([]);

        const files = fs.readdirSync(backupsDir)
            .filter(f => f.startsWith(`backup_${req.user.id}_`))
            .map(f => ({
                filename: f,
                date: new Date(parseInt(f.split('_')[2].split('.')[0])).toISOString()
            }))
            .sort((a, b) => b.date.localeCompare(a.date));

        res.json(files);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
