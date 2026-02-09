
const express = require('express');
const router = express.Router();
const utilityController = require('../controllers/utilityController');

router.post('/condense', utilityController.condenseData);

module.exports = router;
