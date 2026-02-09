
const BaseService = require('./BaseService');
const Term = require('../models/Term');

class TermService extends BaseService {
    constructor() {
        super(Term);
    }
}

module.exports = new TermService();
