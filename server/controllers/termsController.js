
const createController = require('./baseController');
const TermService = require('../services/TermService');
module.exports = createController(TermService);
