
const createController = require('./baseController');
const CustomFieldService = require('../services/CustomFieldService');
module.exports = createController(CustomFieldService);
