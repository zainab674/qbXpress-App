
const BaseService = require('./BaseService');
const Budget = require('../models/Budget');

class BudgetService extends BaseService {
    constructor() {
        super(Budget);
    }
}

module.exports = new BudgetService();
