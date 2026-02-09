
const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountController');
router.get('/', accountController.getAll);
router.post('/', accountController.save);
router.delete('/:id', accountController.delete);
router.post('/bulk', accountController.bulkUpdate);
module.exports = router;
