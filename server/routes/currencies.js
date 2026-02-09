
const createRouter = require('./baseRoute');
const CurrencyService = require('../services/CurrencyService');
module.exports = createRouter(CurrencyService);
