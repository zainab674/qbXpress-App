const express = require('express');
const router = express.Router();
const lc = require('../controllers/landedCostController');
const auth = require('../middleware/auth');

router.use(auth);

// GET    /landed-costs               - List all landed costs (filter: ?receiptId=&status=)
// POST   /landed-costs               - Create a new draft landed cost
// POST   /landed-costs/calculate     - Preview allocation without saving
// GET    /landed-costs/:id           - Get single landed cost
// PUT    /landed-costs/:id           - Update a draft
// POST   /landed-costs/:id/post      - Post (apply to lots + item costs)
// POST   /landed-costs/:id/void      - Void a posted landed cost (reverse)
// DELETE /landed-costs/:id           - Delete a draft

router.get('/', lc.getLandedCosts);
router.post('/', lc.createLandedCost);
router.post('/calculate', lc.calculateAllocations);
router.get('/:id', lc.getLandedCost);
router.put('/:id', lc.updateLandedCost);
router.post('/:id/post', lc.postLandedCost);
router.post('/:id/void', lc.voidLandedCost);
router.delete('/:id', lc.deleteLandedCost);

module.exports = router;
