const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const usersController = require('../controllers/usersController');

// All user management endpoints require authentication + Admin role
router.use(auth, requireRole('Admin'));

router.get('/',          usersController.list);
router.post('/',         usersController.create);
router.put('/:id',       usersController.update);
router.put('/:id/password', usersController.resetPassword);
router.delete('/:id',    usersController.remove);

module.exports = router;
