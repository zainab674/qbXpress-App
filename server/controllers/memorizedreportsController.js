
const createController = require('./baseController');
const MemorizedReportService = require('../services/MemorizedReportService');
module.exports = createController(MemorizedReportService);
