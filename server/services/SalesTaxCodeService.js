
const BaseService = require('./BaseService');
const SalesTaxCode = require('../models/SalesTaxCode');

class SalesTaxCodeService extends BaseService {
    constructor() {
        super(SalesTaxCode);
    }
}

module.exports = new SalesTaxCodeService();
