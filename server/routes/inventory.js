const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/lots/:itemId', inventoryController.getAvailableLots);

module.exports = router;
