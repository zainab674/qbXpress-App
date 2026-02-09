
const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const { transactionSchema } = require('../validations/transactionSchema');

router.use(auth);

router.get('/', transactionController.getAll);
router.get('/:id', transactionController.getOne);
router.post('/', validate(transactionSchema), transactionController.save);
router.delete('/:id', transactionController.delete);
router.post('/bulk', transactionController.bulkUpdate);

module.exports = router;
