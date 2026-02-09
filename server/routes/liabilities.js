
const createRouter = require('./baseRoute');
const PayrollLiabilityService = require('../services/PayrollLiabilityService');
module.exports = createRouter(PayrollLiabilityService);
