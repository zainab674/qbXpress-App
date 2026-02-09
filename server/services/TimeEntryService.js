
const BaseService = require('./BaseService');
const TimeEntry = require('../models/TimeEntry');

class TimeEntryService extends BaseService {
    constructor() {
        super(TimeEntry);
    }
}

module.exports = new TimeEntryService();
