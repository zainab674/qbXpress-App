
const express = require('express');
const router = express.Router();
const vendorController = require('../controllers/vendorController');
const importController = require('../controllers/importController');
const multer = require('multer');
const upload = multer();

router.get('/', vendorController.getAll);
router.post('/', vendorController.save);
router.delete('/:id', vendorController.delete);
router.post('/bulk', vendorController.bulkUpdate);
router.post('/bulk-delete', vendorController.bulkDelete);
router.post('/import', upload.single('file'), importController.importVendors);

module.exports = router;
