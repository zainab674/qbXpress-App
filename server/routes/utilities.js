const express = require('express');
const router = express.Router();
const utilityController = require('../controllers/utilityController');

// ── Data File Operations ──────────────────────────────────────────────────────
// Condense: remove historical transactions before a cutoff date
router.post('/condense', utilityController.condenseData);

// ── Index Management ──────────────────────────────────────────────────────────
// Rebuild (ensure) all schema-defined indexes in MongoDB
// POST — triggers ensureIndexes() on every model; idempotent
router.post('/rebuild-indexes', utilityController.rebuildIndexes);

// Analyze index usage statistics across all collections
// GET ?model=Transaction — single model; omit for all models
router.get('/analyze-indexes', utilityController.analyzeIndexes);

// ── Database Diagnostics ──────────────────────────────────────────────────────
// Per-collection document counts, storage sizes, index counts
router.get('/db-stats', utilityController.dbStats);

// Data integrity checks scoped to the authenticated company
router.get('/verify-integrity', utilityController.verifyIntegrity);

// Connection pool health and latency ping
router.get('/connection-status', utilityController.connectionStatus);

// Full company data export (JSON download)
router.get('/export', utilityController.exportCompanyData);

module.exports = router;
