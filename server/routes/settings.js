
const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');

router.get('/', settingsController.getAll);
router.post('/', settingsController.save);

module.exports = router;
