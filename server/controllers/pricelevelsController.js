
const createController = require('./baseController');
const PriceLevelService = require('../services/PriceLevelService');
module.exports = createController(PriceLevelService);
