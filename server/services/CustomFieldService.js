
const BaseService = require('./BaseService');
const CustomFieldDefinition = require('../models/CustomFieldDefinition');

class CustomFieldService extends BaseService {
    constructor() {
        super(CustomFieldDefinition);
    }
}

module.exports = new CustomFieldService();
