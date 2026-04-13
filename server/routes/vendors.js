
const express = require('express');
const router = express.Router();
const vendorController = require('../controllers/vendorController');
const importController = require('../controllers/importController');
const requirePermission = require('../middleware/requirePermission');
const multer = require('multer');
const upload = multer();

router.get('/',                    requirePermission('vendors', 'read'),   vendorController.getAll);
router.post('/',                   requirePermission('vendors', 'write'),  vendorController.save);
router.post('/bulk',               requirePermission('vendors', 'write'),  vendorController.bulkUpdate);
router.post('/bulk-delete',        requirePermission('vendors', 'delete'), vendorController.bulkDelete);
router.post('/import',             requirePermission('vendors', 'write'),  upload.single('file'), importController.importVendors);
router.get('/:id',                 requirePermission('vendors', 'read'),   vendorController.getOne);
router.post('/:id/notes',          requirePermission('vendors', 'write'),  vendorController.addNote);
router.post('/:id/merge',          requirePermission('vendors', 'write'),  vendorController.merge);
router.patch('/:id/status',        requirePermission('vendors', 'write'),  vendorController.setStatus);
router.delete('/:id',              requirePermission('vendors', 'delete'), vendorController.delete);

module.exports = router;
