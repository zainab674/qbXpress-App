
const createRouter = require('./baseRoute');
const AuditLogService = require('../services/AuditLogService');
module.exports = createRouter(AuditLogService);
