
const createController = require('./baseController');
const BudgetService = require('../services/BudgetService');
module.exports = createController(BudgetService);
