
const createController = require('./baseController');
const SalesTaxCodeService = require('../services/SalesTaxCodeService');
module.exports = createController(SalesTaxCodeService);
