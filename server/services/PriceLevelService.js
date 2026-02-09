
const BaseService = require('./BaseService');
const PriceLevel = require('../models/PriceLevel');

class PriceLevelService extends BaseService {
    constructor() {
        super(PriceLevel);
    }
}

module.exports = new PriceLevelService();
