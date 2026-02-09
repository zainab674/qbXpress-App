
const createController = require('./baseController');
const TimeEntryService = require('../services/TimeEntryService');
module.exports = createController(TimeEntryService);
