
const express = require('express');
const router = express.Router();
const itemController = require('../controllers/itemController');
router.get('/', itemController.getAll);
router.post('/', itemController.save);
router.delete('/:id', itemController.delete);
router.post('/bulk', itemController.bulkUpdate);
module.exports = router;
