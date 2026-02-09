
const BaseService = require('./BaseService');
const MemorizedReport = require('../models/MemorizedReport');

class MemorizedReportService extends BaseService {
    constructor() {
        super(MemorizedReport);
    }
}

module.exports = new MemorizedReportService();
