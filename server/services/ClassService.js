
const BaseService = require('./BaseService');
const QBClass = require('../models/QBClass');

class ClassService extends BaseService {
    constructor() {
        super(QBClass);
    }
}

module.exports = new ClassService();
