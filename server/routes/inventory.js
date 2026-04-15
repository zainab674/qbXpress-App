const express = require('express');
const router = express.Router();
const inv = require('../controllers/inventoryController');
const auth = require('../middleware/auth');
const requirePermission = require('../middleware/requirePermission');

router.use(auth);

// ── Lots ─────────────────────────────────────────────────────────────────────
// GET  /inventory/lots/:itemId                   - FIFO-ordered available lots for item
// PUT  /inventory/lots/:lotId                    - Update lot metadata (expiry, status, notes)
// POST /inventory/lots/refresh-statuses          - Mark expired lots automatically
// GET  /inventory/lots/trace/forward/:lotNumber  - Forward trace: customers who got lot X
// GET  /inventory/lots/trace/backward/:lotNumber - Backward trace: vendor who supplied lot X
// GET  /inventory/lots/details/:lotNumber        - Full lot details by lot number
// GET  /inventory/lots/qc                        - QC dashboard: on-hold / quarantine lots
// POST /inventory/lots/:lotId/quarantine         - Put lot into quarantine/on-hold
// POST /inventory/lots/:lotId/release            - Release lot from quarantine with QC sign-off
//
// NOTE: specific /lots/* routes must come BEFORE the wildcard /lots/:itemId
router.get('/lots/qc',                          requirePermission('inventory', 'read'),   inv.getLotsForQC);
router.get('/lots/expiring-soon',               requirePermission('inventory', 'read'),   inv.getExpiringLots);
router.get('/lots/trace/forward/:lotNumber',    requirePermission('inventory', 'read'),   inv.getLotForwardTrace);
router.get('/lots/trace/backward/:lotNumber',   requirePermission('inventory', 'read'),   inv.getLotBackwardTrace);
router.get('/lots/details/:lotNumber',          requirePermission('inventory', 'read'),   inv.getLotDetails);
router.post('/lots/refresh-statuses',           requirePermission('inventory', 'adjust'), inv.refreshLotStatuses);
router.post('/lots/:lotId/quarantine',          requirePermission('inventory', 'adjust'), inv.quarantineLot);
router.post('/lots/:lotId/release',             requirePermission('inventory', 'adjust'), inv.releaseLot);
router.get('/lots/:itemId',                     requirePermission('inventory', 'read'),   inv.getAvailableLots);
router.post('/lots/:itemId/assign',             requirePermission('inventory', 'adjust'), inv.assignLot);
router.post('/lots/:itemId/reconcile-untracked', requirePermission('inventory', 'adjust'), inv.reconcileUntrackedLot);
router.put('/lots/:lotId',                      requirePermission('inventory', 'write'),  inv.updateLot);
router.delete('/lots/:lotId',                   requirePermission('inventory', 'adjust'), inv.deleteLot);

// ── Serial Numbers ────────────────────────────────────────────────────────────
// GET  /inventory/serials/history/:serialNumber - Full where-used trail for a serial
// GET  /inventory/serials/:itemId               - List serials for an item
// POST /inventory/serials/:itemId/batch         - Batch receive serial numbers
// POST /inventory/serials/:itemId               - Receive a single serial number
// PUT  /inventory/serials/:snId                 - Update serial number record
router.get('/serials/history/:serialNumber',  requirePermission('inventory', 'read'),   inv.getSerialHistory);
router.post('/serials/:itemId/batch',         requirePermission('inventory', 'write'),  inv.batchCreateSerials);
router.get('/serials/:itemId',                requirePermission('inventory', 'read'),   inv.getSerialNumbers);
router.post('/serials/:itemId',               requirePermission('inventory', 'write'),  inv.createSerialNumber);
router.put('/serials/:snId',                  requirePermission('inventory', 'write'),  inv.updateSerialNumber);

// ── BOM ───────────────────────────────────────────────────────────────────────
// GET  /inventory/bom/:itemId/cost-rollup  - Full multi-level BOM with rolled-up cost
// PUT  /inventory/bom/:itemId              - Set/replace BOM for an assembly
// GET  /inventory/bom/:itemId/shortage     - Check component availability
// GET  /inventory/pending-builds           - QB: assemblies below build point
router.get('/bom/:itemId/cost-rollup',  requirePermission('inventory', 'read'),   inv.getBOMCostRollup);
router.put('/bom/:itemId',              requirePermission('inventory', 'write'),  inv.updateBOM);
router.get('/bom/:itemId/shortage',     requirePermission('inventory', 'read'),   inv.getBOMShortage);
router.get('/pending-builds',           requirePermission('inventory', 'read'),   inv.getPendingBuilds);

// ── Valuation ─────────────────────────────────────────────────────────────────
// GET  /inventory/valuation/summary    - QB: Inventory Valuation Summary
// GET  /inventory/valuation/detail     - QB: Inventory Valuation Detail (lot-level)
// GET  /inventory/stock-status         - QB: Stock Status by Item
router.get('/valuation/summary',  requirePermission('inventory', 'read'), inv.getValuationSummary);
router.get('/valuation/detail',   requirePermission('inventory', 'read'), inv.getValuationDetail);
router.get('/stock-status',       requirePermission('inventory', 'read'), inv.getStockStatus);

// ── Price Levels ──────────────────────────────────────────────────────────────
// GET    /inventory/price-levels
// POST   /inventory/price-levels
// PUT    /inventory/price-levels/:id
// DELETE /inventory/price-levels/:id
// GET    /inventory/price-levels/calculate?itemId=&priceLevelId=&quantity=
router.get('/price-levels',              requirePermission('inventory', 'read'),   inv.getPriceLevels);
router.post('/price-levels',             requirePermission('inventory', 'write'),  inv.createPriceLevel);
router.put('/price-levels/:id',          requirePermission('inventory', 'write'),  inv.updatePriceLevel);
router.delete('/price-levels/:id',       requirePermission('inventory', 'adjust'), inv.deletePriceLevel);
router.get('/price-levels/calculate',    requirePermission('inventory', 'read'),   inv.calculatePrice);

// ── Physical Inventory Count ───────────────────────────────────────────────────
// GET    /inventory/counts              - List all count sessions
// POST   /inventory/counts              - Create new count worksheet
// GET    /inventory/counts/:id          - Get count with all lines
// PUT    /inventory/counts/:id/lines    - Update counted quantities
// POST   /inventory/counts/:id/complete - Post adjustments and complete count
router.get('/counts',               requirePermission('inventory', 'read'),   inv.getInventoryCounts);
router.post('/counts',              requirePermission('inventory', 'adjust'), inv.createInventoryCount);
router.get('/counts/:id',           requirePermission('inventory', 'read'),   inv.getInventoryCount);
router.put('/counts/:id/lines',     requirePermission('inventory', 'adjust'), inv.updateCountLines);
router.post('/counts/:id/complete', requirePermission('inventory', 'adjust'), inv.completeInventoryCount);

module.exports = router;
