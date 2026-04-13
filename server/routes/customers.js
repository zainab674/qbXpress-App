
const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const importController = require('../controllers/importController');
const requirePermission = require('../middleware/requirePermission');
const multer = require('multer');
const upload = multer();

router.get('/',                     requirePermission('customers', 'read'),   customerController.getAll);
router.get('/:id',                  requirePermission('customers', 'read'),   customerController.getOne);
router.post('/',                    requirePermission('customers', 'write'),  customerController.save);
router.post('/bulk',                requirePermission('customers', 'write'),  customerController.bulkUpdate);
router.post('/bulk-delete',         requirePermission('customers', 'delete'), customerController.bulkDelete);
router.post('/import',              requirePermission('customers', 'write'),  upload.single('file'), importController.importCustomers);
router.patch('/:id/status',         requirePermission('customers', 'write'),  customerController.setStatus);
router.post('/:id/notes',           requirePermission('customers', 'write'),  customerController.addNote);
router.post('/:id/statement',       requirePermission('customers', 'read'),   customerController.sendStatement);
router.delete('/:id',               requirePermission('customers', 'delete'), customerController.delete);

module.exports = router;
