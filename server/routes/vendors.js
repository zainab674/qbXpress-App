
const express = require('express');
const router = express.Router();
const vendorController = require('../controllers/vendorController');

router.get('/', vendorController.getAll);
router.post('/', vendorController.save);
router.delete('/:id', vendorController.delete);
router.post('/bulk', vendorController.bulkUpdate);

module.exports = router;
