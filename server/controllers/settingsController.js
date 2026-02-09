
const SettingsService = require('../services/SettingsService');

const settingsController = {
    getAll: async (req, res) => {
        try {
            const config = await SettingsService.getAll(req.user.id, req.companyId);
            res.json(config);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    save: async (req, res) => {
        try {
            await SettingsService.saveAll(req.user.id, req.companyId, req.body);
            res.json({ message: 'Settings updated' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
};

module.exports = settingsController;
