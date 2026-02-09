
const createRouter = require('./baseRoute');
const PriceLevelService = require('../services/PriceLevelService');
module.exports = createRouter(PriceLevelService);
