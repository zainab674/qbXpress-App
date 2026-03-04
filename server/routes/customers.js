
const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const importController = require('../controllers/importController');
const multer = require('multer');
const upload = multer();

router.get('/', customerController.getAll);
router.post('/', customerController.save);
router.delete('/:id', customerController.delete);
router.post('/bulk', customerController.bulkUpdate);
router.post('/bulk-delete', customerController.bulkDelete);
router.post('/import', upload.single('file'), importController.importCustomers);

module.exports = router;
