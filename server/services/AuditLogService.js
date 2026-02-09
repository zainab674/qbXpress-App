
const BaseService = require('./BaseService');
const AuditLogEntry = require('../models/AuditLogEntry');

class AuditLogService extends BaseService {
    constructor() {
        super(AuditLogEntry);
    }
}

module.exports = new AuditLogService();
