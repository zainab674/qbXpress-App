
const VendorService = require('../services/VendorService');

const vendorController = {
    getAll: async (req, res, next) => {
        try {
            const items = await VendorService.getAll(req.user.id, req.companyId);
            res.json(items);
        } catch (err) {
            next(err);
        }
    },
    getOne: async (req, res, next) => {
        try {
            const item = await VendorService.getOne(req.params.id, req.user.id, req.companyId);
            if (!item) return res.status(404).json({ message: 'Vendor not found' });
            res.json(item);
        } catch (err) {
            next(err);
        }
    },
    setStatus: async (req, res, next) => {
        try {
            const { isActive } = req.body;
            if (typeof isActive !== 'boolean') return res.status(400).json({ message: 'isActive must be boolean' });
            const item = await VendorService.setStatus(req.params.id, isActive, req.user.id, req.companyId, req.user.role);
            if (!item) return res.status(404).json({ message: 'Vendor not found' });
            res.json(item);
        } catch (err) {
            next(err);
        }
    },
    merge: async (req, res, next) => {
        try {
            const { targetId } = req.body;
            if (!targetId) return res.status(400).json({ message: 'targetId is required' });
            const result = await VendorService.merge(req.params.id, targetId, req.user.id, req.companyId, req.user.role);
            res.json(result);
        } catch (err) {
            next(err);
        }
    },
    save: async (req, res, next) => {
        try {
            const item = await VendorService.save(req.body, req.user.id, req.companyId, req.user.role);
            res.json(item);
        } catch (err) {
            next(err);
        }
    },
    addNote: async (req, res, next) => {
        try {
            const { text, author } = req.body;
            if (!text?.trim()) return res.status(400).json({ message: 'Note text is required' });
            const item = await VendorService.addNote(req.params.id, text.trim(), author || req.user.role || 'Admin', req.user.id, req.companyId);
            if (!item) return res.status(404).json({ message: 'Vendor not found' });
            res.json(item);
        } catch (err) {
            next(err);
        }
    },
    delete: async (req, res, next) => {
        try {
            await VendorService.delete(req.params.id, req.user.id, req.companyId, req.user.role);
            res.json({ message: 'Deleted' });
        } catch (err) {
            next(err);
        }
    },
    bulkUpdate: async (req, res, next) => {
        try {
            await VendorService.bulkUpdate(req.body.items, req.user.id, req.companyId, req.user.role);
            res.json({ message: 'Bulk update successful' });
        } catch (err) {
            next(err);
        }
    },
    bulkDelete: async (req, res, next) => {
        try {
            await VendorService.bulkDelete(req.body.ids, req.user.id, req.companyId, req.user.role);
            res.json({ message: 'Bulk deletion successful' });
        } catch (err) {
            next(err);
        }
    }
};

module.exports = vendorController;

