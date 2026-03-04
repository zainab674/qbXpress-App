const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const importController = require('../controllers/importController');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const { transactionSchema } = require('../validations/transactionSchema');
const multer = require('multer');
const upload = multer();

router.use(auth);

router.get('/', transactionController.getAll);
router.get('/:id', transactionController.getOne);
router.post('/', validate(transactionSchema), transactionController.save);
router.delete('/:id', transactionController.delete);
router.post('/bulk', transactionController.bulkUpdate);
router.post('/import', upload.single('file'), importController.importTransactions);

module.exports = router;
