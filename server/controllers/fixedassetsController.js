
const createController = require('./baseController');
const FixedAssetService = require('../services/FixedAssetService');
module.exports = createController(FixedAssetService);
