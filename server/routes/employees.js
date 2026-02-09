
const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
router.get('/', employeeController.getAll);
router.post('/', employeeController.save);
router.delete('/:id', employeeController.delete);
router.post('/bulk', employeeController.bulkUpdate);
module.exports = router;
