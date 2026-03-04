
const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const importController = require('../controllers/importController');
const multer = require('multer');
const upload = multer();

router.get('/', employeeController.getAll);
router.post('/', employeeController.save);
router.delete('/:id', employeeController.delete);
router.post('/bulk', employeeController.bulkUpdate);
router.post('/import', upload.single('file'), importController.importEmployees);

module.exports = router;
