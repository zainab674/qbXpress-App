const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const importController = require('../controllers/importController');
const auth = require('../middleware/auth');
const requirePermission = require('../middleware/requirePermission');
const validate = require('../middleware/validate');
const { transactionSchema } = require('../validations/transactionSchema');
const multer = require('multer');
const upload = multer();

router.use(auth);

router.get('/', requirePermission('transactions', 'read'), transactionController.getAll);
router.get('/next-ref-no', requirePermission('transactions', 'read'), transactionController.nextRefNo);
router.get('/:id', requirePermission('transactions', 'read'), transactionController.getOne);
router.post('/', requirePermission('transactions', 'write'), validate(transactionSchema), transactionController.save);
router.delete('/:id', requirePermission('transactions', 'delete'), transactionController.delete);
router.post('/bulk', requirePermission('transactions', 'write'), transactionController.bulkUpdate);
router.post('/import', requirePermission('transactions', 'write'), upload.single('file'), importController.importTransactions);

// ── PO Approval Workflow ──────────────────────────────────────────────────────
router.post('/:id/submit-for-approval', requirePermission('transactions', 'write'), transactionController.submitForApproval);
router.post('/:id/approve', requirePermission('transactions', 'write'), transactionController.approvePO);
router.post('/:id/reject', requirePermission('transactions', 'write'), transactionController.rejectPO);

// ── SO Fulfillment ────────────────────────────────────────────────────────────
router.patch('/:id/fulfillment', requirePermission('transactions', 'write'), transactionController.updateFulfillment);

// ── Allocation: assign / unassign products from an MO to an SO or target MO ─
router.post('/:id/allocations', requirePermission('transactions', 'write'), transactionController.assignAllocation);
router.delete('/:id/allocations/:allocationId', requirePermission('transactions', 'write'), transactionController.unassignAllocation);

module.exports = router;
