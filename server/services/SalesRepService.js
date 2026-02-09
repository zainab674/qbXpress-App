
const BaseService = require('./BaseService');
const SalesRep = require('../models/SalesRep');

class SalesRepService extends BaseService {
    constructor() {
        super(SalesRep);
    }
}

module.exports = new SalesRepService();
