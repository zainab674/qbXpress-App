
const createRouter = require('./baseRoute');
const BudgetService = require('../services/BudgetService');
module.exports = createRouter(BudgetService);
