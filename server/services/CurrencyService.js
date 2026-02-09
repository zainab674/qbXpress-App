
const BaseService = require('./BaseService');
const Currency = require('../models/Currency');

class CurrencyService extends BaseService {
    constructor() {
        super(Currency);
    }
}

module.exports = new CurrencyService();
