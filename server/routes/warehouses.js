const express = require('express');
const router = express.Router();
const warehouseController = require('../controllers/warehouseController');
const requirePermission = require('../middleware/requirePermission');

router.get('/',    requirePermission('inventory', 'read'),   warehouseController.list);
router.post('/',   requirePermission('inventory', 'write'),  warehouseController.create);
router.put('/:id', requirePermission('inventory', 'write'),  warehouseController.update);
router.delete('/:id', requirePermission('inventory', 'adjust'), warehouseController.delete);

router.get('/inventory-snapshot',    requirePermission('inventory', 'read'),  warehouseController.getInventorySnapshot);
router.get('/cross-warehouse-report', requirePermission('inventory', 'read'), warehouseController.getCrossWarehouseReport);
router.post('/transfer',             requirePermission('inventory', 'adjust'), warehouseController.transfer);
router.get('/transfer-history',      requirePermission('inventory', 'read'),  warehouseController.getTransferHistory);

module.exports = router;
