/**
 * Centralized index initialization.
 *
 * Called once after the MongoDB connection is established (see app.js).
 * Mongoose model indexes are defined on each schema; this module calls
 * ensureIndexes() on every model so that all indexes are guaranteed to
 * exist in the running database, even if the collection was created before
 * a new index was added in code.
 *
 * Safe to run on every startup — MongoDB ignores no-op ensureIndex calls.
 */

const mongoose = require('mongoose');

// ── All models that need index maintenance ────────────────────────────────────
const MODELS = [
    'Transaction',
    'Customer',
    'Vendor',
    'Employee',
    'Account',
    'Item',
    'AuditLogEntry',
    'InventoryLot',
    'SerialNumber',
    'TimeEntry',
    'BankTransaction',
    'BankRule',
    'Budget',
    'MemorizedReport',
    'ScheduledReport',
    'Lead',
    'FixedAsset',
    'RecurringTemplate',
    'LandedCost',
    'InventoryCount',
    'UOMSet',
    'PriceLevel',
    'Warehouse',
    'Bin',
    'Currency',
    'TransferLog',
    'AppStore',
];

/**
 * Ensure all indexes defined on Mongoose schemas exist in MongoDB.
 * Logs timing and any individual model failures (non-fatal).
 */
async function ensureAllIndexes() {
    const start = Date.now();
    const results = { success: [], failed: [] };

    for (const modelName of MODELS) {
        try {
            // Only process models that are actually registered
            if (!mongoose.modelNames().includes(modelName)) continue;
            await mongoose.model(modelName).ensureIndexes();
            results.success.push(modelName);
        } catch (err) {
            // Log but do not crash — a missing index hurts performance, not correctness
            console.error(`[DB] ensureIndexes failed for ${modelName}:`, err.message);
            results.failed.push({ model: modelName, error: err.message });
        }
    }

    const elapsed = Date.now() - start;
    console.log(`[DB] ensureIndexes: ${results.success.length} models OK, ${results.failed.length} failed — ${elapsed}ms`);
    if (results.failed.length) {
        console.warn('[DB] Failed models:', results.failed.map(f => f.model).join(', '));
    }
    return results;
}

/**
 * Analyze index usage for a model.
 * Returns MongoDB $indexStats output + collection stats.
 * Used by the /api/utilities/analyze-indexes admin endpoint.
 */
async function analyzeIndexUsage(modelName) {
    if (!mongoose.modelNames().includes(modelName)) {
        throw new Error(`Unknown model: ${modelName}`);
    }
    const model = mongoose.model(modelName);
    const [indexStats, collStats] = await Promise.all([
        model.aggregate([{ $indexStats: {} }]),
        model.collection.stats(),
    ]);

    return {
        model: modelName,
        collection: model.collection.collectionName,
        documentCount: collStats.count,
        storageSize: collStats.storageSize,
        avgObjSize: collStats.avgObjSize,
        indexes: indexStats.map(s => ({
            name: s.name,
            key: s.key,
            accesses: s.accesses.ops,
            since: s.accesses.since,
        })),
    };
}

/**
 * Get index stats for all registered models in one call.
 */
async function analyzeAllIndexes() {
    const stats = [];
    for (const modelName of MODELS) {
        if (!mongoose.modelNames().includes(modelName)) continue;
        try {
            stats.push(await analyzeIndexUsage(modelName));
        } catch (err) {
            stats.push({ model: modelName, error: err.message });
        }
    }
    return stats;
}

module.exports = { ensureAllIndexes, analyzeIndexUsage, analyzeAllIndexes, MODELS };
