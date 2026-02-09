
const createController = require('./baseController');
const CurrencyService = require('../services/CurrencyService');
module.exports = createController(CurrencyService);
