const createController = (Service) => ({
    getAll: async (req, res, next) => {
        try {
            if (req.query.page || req.query.limit) {
                const page = parseInt(req.query.page) || 1;
                const limit = parseInt(req.query.limit) || 50;
                const items = await Service.getPaginated(req.user.id, req.companyId, page, limit);
                res.json(items);
            } else {
                const items = await Service.getAll(req.user.id, req.companyId);
                res.json(items);
            }
        } catch (err) {
            next(err);
        }
    },
    getOne: async (req, res, next) => {
        try {
            const item = await Service.getOne(req.params.id, req.user.id, req.companyId);
            if (!item) return res.status(404).json({ message: 'Not found' });
            res.json(item);
        } catch (err) {
            next(err);
        }
    },
    save: async (req, res, next) => {
        try {
            const item = await Service.save(req.body, req.user.id, req.companyId);
            res.json(item);
        } catch (err) {
            next(err);
        }
    },
    delete: async (req, res, next) => {
        try {
            const item = await Service.delete(req.params.id, req.user.id, req.companyId);
            if (!item) return res.status(404).json({ message: 'Not found' });
            res.json({ message: 'Deleted successfully' });
        } catch (err) {
            next(err);
        }
    },
    bulkUpdate: async (req, res, next) => {
        try {
            await Service.bulkUpdate(req.body.items, req.user.id, req.companyId);
            res.json({ message: 'Bulk update successful' });
        } catch (err) {
            next(err);
        }
    },
    bulkDelete: async (req, res, next) => {
        try {
            await Service.bulkDelete(req.body.ids, req.user.id, req.companyId);
            res.json({ message: 'Bulk delete successful' });
        } catch (err) {
            next(err);
        }
    }
});

module.exports = createController;
