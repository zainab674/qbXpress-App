
const transactionService = require('../services/transactionService');
const Transaction = require('../models/Transaction');

const transactionController = {
    getAll: async (req, res, next) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10000;
            const skip = (page - 1) * limit;

            const items = await Transaction.find({ userId: req.user.id, companyId: req.companyId })
                .sort({ date: -1 })
                .skip(skip)
                .limit(limit);

            const total = await Transaction.countDocuments({ userId: req.user.id, companyId: req.companyId });

            res.json({
                items,
                total,
                page,
                pages: Math.ceil(total / limit)
            });
        } catch (err) {
            next(err);
        }
    },

    getOne: async (req, res, next) => {
        try {
            const item = await Transaction.findOne({ id: req.params.id, userId: req.user.id, companyId: req.companyId });
            if (!item) return res.status(404).json({ message: 'Transaction not found' });
            res.json(item);
        } catch (err) {
            next(err);
        }
    },

    save: async (req, res, next) => {
        try {
            const userRole = req.headers['x-user-role'] || 'Admin';
            const results = await transactionService.saveTransaction(req.body, userRole, req.user.id, req.companyId);
            res.status(200).json(results);
        } catch (err) {
            next(err);
        }
    },

    delete: async (req, res, next) => {
        try {
            const item = await Transaction.findOneAndDelete({ id: req.params.id, userId: req.user.id, companyId: req.companyId });
            if (!item) return res.status(404).json({ message: 'Transaction not found' });
            res.json({ message: 'Deleted successfully' });
        } catch (err) {
            next(err);
        }
    },
    bulkUpdate: async (req, res, next) => {
        try {
            const userRole = req.headers['x-user-role'] || 'Admin';
            const results = await transactionService.saveTransaction(req.body.items, userRole, req.user.id, req.companyId);
            res.json(results);
        } catch (err) {
            next(err);
        }
    }
};

module.exports = transactionController;
