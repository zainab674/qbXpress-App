const createRouter = require('./baseRoute');
const service = require('../services/bankFeedService');

module.exports = createRouter(service);
