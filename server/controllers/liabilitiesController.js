
const createController = require('./baseController');
const PayrollLiabilityService = require('../services/PayrollLiabilityService');
module.exports = createController(PayrollLiabilityService);
