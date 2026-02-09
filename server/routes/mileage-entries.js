
const createRouter = require('./baseRoute');
const MileageEntryService = require('../services/MileageEntryService');
module.exports = createRouter(MileageEntryService);
