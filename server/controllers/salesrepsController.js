
const createController = require('./baseController');
const SalesRepService = require('../services/SalesRepService');
module.exports = createController(SalesRepService);
