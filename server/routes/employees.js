
const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const importController = require('../controllers/importController');
const requirePermission = require('../middleware/requirePermission');
const multer = require('multer');
const upload = multer();

router.get('/',              requirePermission('employees', 'read'),   employeeController.getAll);
router.post('/',             requirePermission('employees', 'write'),  employeeController.save);
router.post('/bulk',         requirePermission('employees', 'write'),  employeeController.bulkUpdate);
router.post('/import',       requirePermission('employees', 'write'),  upload.single('file'), importController.importEmployees);
router.delete('/:id',        requirePermission('employees', 'delete'), employeeController.delete);

module.exports = router;
