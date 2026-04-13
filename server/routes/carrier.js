const express = require('express');
const router = express.Router();
const carrierController = require('../controllers/carrierController');

// GET /api/carrier/status — which carriers have credentials configured
router.get('/status', carrierController.getStatus);

// POST /api/carrier/rates — get live shipping rates
router.post('/rates', carrierController.getRates);

// GET /api/carrier/track/:carrier/:trackingNumber — live tracking lookup
router.get('/track/:carrier/:trackingNumber', carrierController.trackShipment);

// GET /api/carrier/validate/:carrier/:trackingNumber — validate format only (no external call)
router.get('/validate/:carrier/:trackingNumber', carrierController.validateTracking);

module.exports = router;
