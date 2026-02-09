
const createController = require('./baseController');
const MileageEntryService = require('../services/MileageEntryService');
module.exports = createController(MileageEntryService);
