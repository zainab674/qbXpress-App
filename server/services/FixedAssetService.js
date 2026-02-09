
const BaseService = require('./BaseService');
const FixedAsset = require('../models/FixedAsset');

class FixedAssetService extends BaseService {
    constructor() {
        super(FixedAsset);
    }
}

module.exports = new FixedAssetService();
