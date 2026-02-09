
const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');

router.get('/', customerController.getAll);
router.post('/', customerController.save);
router.delete('/:id', customerController.delete);
router.post('/bulk', customerController.bulkUpdate);

module.exports = router;
