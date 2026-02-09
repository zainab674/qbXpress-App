
const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/', companyController.getAll);
router.post('/', companyController.create);
router.get('/:id', companyController.getOne);
router.put('/:id', companyController.update);

module.exports = router;
