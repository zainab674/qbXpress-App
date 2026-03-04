
const express = require('express');
const router = express.Router();
const itemController = require('../controllers/itemController');
const importController = require('../controllers/importController');
const multer = require('multer');
const upload = multer();

router.get('/', itemController.getAll);
router.post('/', itemController.save);
router.delete('/:id', itemController.delete);
router.post('/bulk', itemController.bulkUpdate);
router.post('/import', upload.single('file'), importController.importItems);

module.exports = router;
