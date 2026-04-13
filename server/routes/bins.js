const express = require('express');
const router = express.Router();
const binController = require('../controllers/binController');
const requirePermission = require('../middleware/requirePermission');

router.get('/',    requirePermission('inventory', 'read'),   binController.list);
router.post('/',   requirePermission('inventory', 'write'),  binController.create);
router.put('/:id', requirePermission('inventory', 'write'),  binController.update);
router.delete('/:id', requirePermission('inventory', 'adjust'), binController.delete);
router.get('/inventory-snapshot', requirePermission('inventory', 'read'),  binController.getInventorySnapshot);
router.post('/transfer',          requirePermission('inventory', 'adjust'), binController.transfer);

module.exports = router;
