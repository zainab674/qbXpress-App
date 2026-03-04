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
            const item = await CustomerService.getOne(req.params.id, req.user.id);
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
    }
};

module.exports = customerController;

