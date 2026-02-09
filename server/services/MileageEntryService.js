
const BaseService = require('./BaseService');
const MileageEntry = require('../models/MileageEntry');

class MileageEntryService extends BaseService {
    constructor() {
        super(MileageEntry);
    }
}

module.exports = new MileageEntryService();
