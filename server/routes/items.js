
const express = require('express');
const router = express.Router();
const itemController = require('../controllers/itemController');
const importController = require('../controllers/importController');
const requirePermission = require('../middleware/requirePermission');
const multer = require('multer');
const upload = multer();

router.get('/',                  requirePermission('items', 'read'),   itemController.getAll);
router.get('/barcode/:barcode',  requirePermission('items', 'read'),   itemController.lookupByBarcode);
router.get('/:id/bom-history',         requirePermission('items', 'read'), itemController.getBOMHistory);
router.get('/:id/vendor-purchases',    requirePermission('items', 'read'), itemController.getVendorPurchaseHistory);
router.post('/',                 requirePermission('items', 'write'),  itemController.save);
router.post('/bulk',             requirePermission('items', 'write'),  itemController.bulkUpdate);
router.post('/import',           requirePermission('items', 'write'),  upload.single('file'), importController.importItems);
router.delete('/:id',            requirePermission('items', 'delete'), itemController.delete);

module.exports = router;
