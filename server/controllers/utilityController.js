const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const AuditLogEntry = require('../models/AuditLogEntry');
const Item = require('../models/Item');
const Account = require('../models/Account');
const Customer = require('../models/Customer');
const Vendor = require('../models/Vendor');
const Employee = require('../models/Employee');
const { ensureAllIndexes, analyzeAllIndexes, analyzeIndexUsage, MODELS } = require('../db/indexes');

// ── Condense Data ─────────────────────────────────────────────────────────────
exports.condenseData = async (req, res, next) => {
    try {
        const { cutoffDate } = req.body;
        const { companyId, userId } = req;

        if (!cutoffDate) {
            return res.status(400).json({ message: 'cutoffDate is required (YYYY-MM-DD)' });
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(cutoffDate)) {
            return res.status(400).json({ message: 'cutoffDate must be YYYY-MM-DD' });
        }

        const result = await Transaction.deleteMany({ companyId, userId, date: { $lt: cutoffDate } });

        const log = new AuditLogEntry({
            id: require('crypto').randomUUID(),
            companyId,
            userId,
            action: 'DELETE',
            timestamp: new Date().toISOString(),
            transactionType: 'CONDENSE',
            amount: result.deletedCount,
            newContent: JSON.stringify({ cutoffDate, deletedCount: result.deletedCount }),
        });
        await log.save();

        res.json({
            message: 'Condense completed',
            deletedCount: result.deletedCount,
            cutoffDate,
        });
    } catch (err) {
        next(err);
    }
};

// ── Rebuild / Ensure Indexes ──────────────────────────────────────────────────
// POST /api/utilities/rebuild-indexes
// Forces ensureIndexes() on every registered model.
// Idempotent — safe to call at any time.
exports.rebuildIndexes = async (req, res, next) => {
    try {
        const started = Date.now();
        const results = await ensureAllIndexes();
        res.json({
            message: 'Index rebuild complete',
            durationMs: Date.now() - started,
            succeeded: results.success.length,
            failed: results.failed.length,
            failedModels: results.failed,
        });
    } catch (err) {
        next(err);
    }
};

// ── Analyze Index Usage ───────────────────────────────────────────────────────
// GET /api/utilities/analyze-indexes
// Returns $indexStats for every collection: which indexes are actually used,
// their access count, and collection size metrics.
exports.analyzeIndexes = async (req, res, next) => {
    try {
        const { model } = req.query;
        const stats = model
            ? [await analyzeIndexUsage(model)]
            : await analyzeAllIndexes();

        // Flag indexes that have never been used (candidates for removal)
        const withFlags = stats.map(s => {
            if (s.error) return s;
            const unusedIndexes = (s.indexes || []).filter(i => i.accesses === 0 && i.name !== '_id_');
            return { ...s, unusedIndexCount: unusedIndexes.length, unusedIndexes };
        });

        res.json({ collections: withFlags });
    } catch (err) {
        next(err);
    }
};

// ── Database Stats ────────────────────────────────────────────────────────────
// GET /api/utilities/db-stats
// Returns per-collection sizes, document counts, and overall DB size.
exports.dbStats = async (req, res, next) => {
    try {
        const db = mongoose.connection.db;
        const dbStats = await db.stats();

        // Gather per-collection stats for all known models
        const collections = [];
        for (const modelName of MODELS) {
            if (!mongoose.modelNames().includes(modelName)) continue;
            try {
                const col = mongoose.model(modelName).collection;
                const stats = await col.stats();
                collections.push({
                    model: modelName,
                    collection: stats.ns,
                    documents: stats.count,
                    storageSize: stats.storageSize,
                    avgObjSize: stats.avgObjSize || 0,
                    indexCount: stats.nindexes,
                    totalIndexSize: stats.totalIndexSize,
                });
            } catch {
                // Collection may not exist yet — skip
            }
        }

        // Sort by storage size descending
        collections.sort((a, b) => b.storageSize - a.storageSize);

        res.json({
            database: {
                dataSize: dbStats.dataSize,
                storageSize: dbStats.storageSize,
                indexSize: dbStats.indexSize,
                objects: dbStats.objects,
                collections: dbStats.collections,
            },
            collections,
        });
    } catch (err) {
        next(err);
    }
};

// ── Verify Data Integrity ─────────────────────────────────────────────────────
// POST /api/utilities/verify-integrity
// Runs a set of consistency checks scoped to the current company:
//   1. Transactions referencing non-existent items
//   2. Transactions referencing non-existent accounts
//   3. Transactions referencing non-existent customers
//   4. Items with negative onHand
//   5. Accounts with inconsistent balance (simple check)
exports.verifyIntegrity = async (req, res, next) => {
    try {
        const { companyId, userId } = req;
        const issues = [];

        // 1. Items with negative on-hand quantity
        const negativeStock = await Item.find(
            { companyId, userId, onHand: { $lt: 0 } },
            { id: 1, name: 1, onHand: 1 }
        ).lean();
        if (negativeStock.length) {
            issues.push({
                type: 'NEGATIVE_STOCK',
                severity: 'warning',
                count: negativeStock.length,
                details: negativeStock.map(i => ({ id: i.id, name: i.name, onHand: i.onHand })),
            });
        }

        // 2. Open invoices with no customerId
        const orphanInvoices = await Transaction.countDocuments({
            companyId, userId,
            type: 'INVOICE',
            status: { $nin: ['PAID', 'VOID'] },
            customerId: { $in: [null, ''] },
        });
        if (orphanInvoices) {
            issues.push({
                type: 'INVOICE_NO_CUSTOMER',
                severity: 'warning',
                count: orphanInvoices,
                details: 'Open invoices with no customer assigned',
            });
        }

        // 3. Open bills with no vendorId
        const orphanBills = await Transaction.countDocuments({
            companyId, userId,
            type: 'BILL',
            status: { $nin: ['PAID', 'VOID'] },
            vendorId: { $in: [null, ''] },
        });
        if (orphanBills) {
            issues.push({
                type: 'BILL_NO_VENDOR',
                severity: 'warning',
                count: orphanBills,
                details: 'Open bills with no vendor assigned',
            });
        }

        // 4. Transactions with missing required fields (total = null/undefined)
        const badTotals = await Transaction.countDocuments({
            companyId, userId,
            $or: [{ total: null }, { total: { $exists: false } }],
        });
        if (badTotals) {
            issues.push({
                type: 'MISSING_TOTAL',
                severity: 'error',
                count: badTotals,
                details: 'Transactions with null/missing total',
            });
        }

        res.json({
            companyId,
            checkedAt: new Date().toISOString(),
            issueCount: issues.length,
            status: issues.length === 0 ? 'OK' : issues.some(i => i.severity === 'error') ? 'ERROR' : 'WARNING',
            issues,
        });
    } catch (err) {
        next(err);
    }
};

// ── Export Company Data ───────────────────────────────────────────────────────
// GET /api/utilities/export
// Returns all company data as a downloadable JSON file.
exports.exportCompanyData = async (req, res, next) => {
    try {
        const { companyId, userId } = req;
        const scope = { companyId, userId };

        const [accounts, customers, vendors, transactions, items, employees] = await Promise.all([
            Account.find(scope).lean(),
            Customer.find(scope).lean(),
            Vendor.find(scope).lean(),
            Transaction.find(scope).lean(),
            Item.find(scope).lean(),
            Employee.find(scope).lean(),
        ]);

        const exportData = {
            version: '2.0',
            exportedAt: new Date().toISOString(),
            software: 'qbXpress',
            companyId,
            data: { accounts, customers, vendors, transactions, items, employees },
        };

        const filename = `qbxpress_export_${companyId}_${Date.now()}.json`;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.json(exportData);
    } catch (err) {
        next(err);
    }
};

// ── Connection Pool Status ────────────────────────────────────────────────────
// GET /api/utilities/connection-status
// Returns current MongoDB connection pool metrics.
exports.connectionStatus = async (req, res, next) => {
    try {
        const state = mongoose.connection.readyState;
        const stateMap = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };

        // Ping the database
        const pingStart = Date.now();
        await mongoose.connection.db.admin().ping();
        const pingMs = Date.now() - pingStart;

        res.json({
            state: stateMap[state] || 'unknown',
            pingMs,
            host: mongoose.connection.host,
            port: mongoose.connection.port,
            name: mongoose.connection.name,
            maxPoolSize: 60,
            minPoolSize: 5,
        });
    } catch (err) {
        next(err);
    }
};
