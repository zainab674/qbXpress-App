
const createRouter = require('./baseRoute');
const SalesTaxCodeService = require('../services/SalesTaxCodeService');
module.exports = createRouter(SalesTaxCodeService);
