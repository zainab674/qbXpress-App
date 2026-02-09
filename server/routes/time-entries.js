
const createRouter = require('./baseRoute');
const TimeEntryService = require('../services/TimeEntryService');
module.exports = createRouter(TimeEntryService);
