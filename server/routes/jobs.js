const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const requirePermission = require('../middleware/requirePermission');

router.get('/',         requirePermission('customers', 'read'),   jobController.list);
router.get('/:id',      requirePermission('customers', 'read'),   jobController.getOne);
router.post('/',        requirePermission('customers', 'write'),  jobController.save);
router.put('/:id',      requirePermission('customers', 'write'),  jobController.save);
router.post('/:id/close', requirePermission('customers', 'write'), jobController.close);
router.delete('/:id',   requirePermission('customers', 'delete'), jobController.delete);

module.exports = router;
