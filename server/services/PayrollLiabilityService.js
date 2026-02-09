
const BaseService = require('./BaseService');
const PayrollLiability = require('../models/PayrollLiability');

class PayrollLiabilityService extends BaseService {
    constructor() {
        super(PayrollLiability);
    }
}

module.exports = new PayrollLiabilityService();
