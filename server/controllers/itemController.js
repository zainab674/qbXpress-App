
const ItemService = require('../services/ItemService');

const itemController = {
    getAll: async (req, res, next) => {
        try {
            const items = await ItemService.getAll(req.user.id, req.companyId);
            res.json(items);
        } catch (err) {
            next(err);
        }
    },
    getOne: async (req, res, next) => {
        try {
            const item = await ItemService.getOne(req.params.id, req.user.id);
            if (!item) return res.status(404).json({ message: 'Item not found' });
            res.json(item);
        } catch (err) {
            next(err);
        }
    },
    save: async (req, res, next) => {
        try {
            const item = await ItemService.save(req.body, req.user.id, req.companyId, req.user.role);
            res.json(item);
        } catch (err) {
            next(err);
        }
    },
    delete: async (req, res, next) => {
        try {
            await ItemService.delete(req.params.id, req.user.id, req.companyId, req.user.role);
            res.json({ message: 'Deleted' });
        } catch (err) {
            next(err);
        }
    },
    bulkUpdate: async (req, res, next) => {
        try {
            await ItemService.bulkUpdate(req.body.items, req.user.id, req.companyId, req.user.role);
            res.json({ message: 'Bulk update successful' });
        } catch (err) {
            next(err);
        }
    }
};

module.exports = itemController;

