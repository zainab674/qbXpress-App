
const Setting = require('../models/Setting');

const SettingsService = {
    getAll: async (userId, companyId) => {
        const settings = await Setting.find({ userId, companyId });
        return settings.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {});
    },
    saveAll: async (userId, companyId, config) => {
        const entries = Object.entries(config);
        const operations = entries.map(([key, value]) => ({
            updateOne: {
                filter: { userId, companyId, key },
                update: { $set: { value } },
                upsert: true
            }
        }));
        return await Setting.bulkWrite(operations);
    }
};

module.exports = SettingsService;
