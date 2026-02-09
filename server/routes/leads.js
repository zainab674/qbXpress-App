
const express = require('express');
const router = express.Router();
const controller = require('../controllers/leadController.js');
router.get('/', controller.getAll);
router.post('/', controller.save);
router.delete('/:id', controller.delete);
router.post('/bulk', controller.bulkUpdate);
module.exports = router;
