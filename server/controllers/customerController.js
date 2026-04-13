const CustomerService = require('../services/CustomerService');

const customerController = {
    getAll: async (req, res, next) => {
        try {
            const items = await CustomerService.getAll(req.user.id, req.companyId);
            res.json(items);
        } catch (err) {
            next(err);
        }
    },
    getOne: async (req, res, next) => {
        try {
            const item = await CustomerService.getOne(req.params.id, req.user.id, req.companyId);
            if (!item) return res.status(404).json({ message: 'Customer not found' });
            res.json(item);
        } catch (err) {
            next(err);
        }
    },
    save: async (req, res, next) => {
        try {
            const item = await CustomerService.save(req.body, req.user.id, req.companyId, req.user.role);
            res.json(item);
        } catch (err) {
            next(err);
        }
    },
    delete: async (req, res, next) => {
        try {
            await CustomerService.delete(req.params.id, req.user.id, req.companyId, req.user.role);
            res.json({ message: 'Deleted' });
        } catch (err) {
            next(err);
        }
    },
    bulkUpdate: async (req, res, next) => {
        try {
            await CustomerService.bulkUpdate(req.body.items, req.user.id, req.companyId, req.user.role);
            res.json({ message: 'Bulk update successful' });
        } catch (err) {
            next(err);
        }
    },
    bulkDelete: async (req, res, next) => {
        try {
            await CustomerService.bulkDelete(req.body.ids, req.user.id, req.companyId, req.user.role);
            res.json({ message: 'Bulk deletion successful' });
        } catch (err) {
            next(err);
        }
    },
    // PATCH /:id/status  — toggle isActive
    setStatus: async (req, res, next) => {
        try {
            const { isActive } = req.body;
            if (typeof isActive !== 'boolean') {
                return res.status(400).json({ message: 'isActive (boolean) is required' });
            }
            const item = await CustomerService.setStatus(req.params.id, isActive, req.user.id, req.companyId, req.user.role);
            if (!item) return res.status(404).json({ message: 'Customer not found' });
            res.json(item);
        } catch (err) {
            next(err);
        }
    },
    // POST /:id/notes  — append a note
    addNote: async (req, res, next) => {
        try {
            const { text, author } = req.body;
            if (!text) return res.status(400).json({ message: 'Note text is required' });
            const item = await CustomerService.addNote(req.params.id, { text, author: author || req.user.role || 'Admin' }, req.user.id, req.companyId);
            if (!item) return res.status(404).json({ message: 'Customer not found' });
            res.json(item);
        } catch (err) {
            next(err);
        }
    },
    // POST /:id/statement  — generate and return a statement payload
    sendStatement: async (req, res, next) => {
        try {
            const statement = await CustomerService.buildStatement(req.params.id, req.user.id, req.companyId);
            if (!statement) return res.status(404).json({ message: 'Customer not found' });
            res.json(statement);
        } catch (err) {
            next(err);
        }
    },
};

module.exports = customerController;
