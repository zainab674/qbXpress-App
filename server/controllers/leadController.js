const LeadService = require('../services/LeadService');

const leadController = {
    getAll: async (req, res) => {
        try {
            const items = await LeadService.getAll();
            res.json(items);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getOne: async (req, res) => {
        try {
            const item = await LeadService.getOne(req.params.id);
            if (!item) return res.status(404).json({ message: 'Lead not found' });
            res.json(item);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    save: async (req, res) => {
        try {
            const item = await LeadService.save(req.body);
            res.json(item);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    delete: async (req, res) => {
        try {
            await LeadService.delete(req.params.id);
            res.json({ message: 'Deleted' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    bulkUpdate: async (req, res) => {
        try {
            await LeadService.bulkUpdate(req.body.items);
            res.json({ message: 'Bulk update successful' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
};

module.exports = leadController;

