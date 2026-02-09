const BankTransaction = require('../models/BankTransaction');
const BaseService = require('./BaseService');

class BankFeedService extends BaseService {
    constructor() {
        super(BankTransaction);
    }

    async getAll(userId, companyId) {
        // Sort by date descending
        return await super.getAll(userId, companyId, { date: -1 });
    }
}

module.exports = new BankFeedService();
