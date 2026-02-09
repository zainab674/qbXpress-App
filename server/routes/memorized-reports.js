
const createRouter = require('./baseRoute');
const MemorizedReportService = require('../services/MemorizedReportService');
module.exports = createRouter(MemorizedReportService);
