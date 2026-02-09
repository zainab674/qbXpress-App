
const createController = require('./baseController');
const AuditLogService = require('../services/AuditLogService');
module.exports = createController(AuditLogService);
