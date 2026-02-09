
const Company = require('../models/Company');
const crypto = require('crypto');

const companyController = {
    getAll: async (req, res, next) => {
        try {
            const companies = await Company.find({ userId: req.user.id, isActive: true });
            res.json(companies);
        } catch (err) {
            next(err);
        }
    },

    create: async (req, res, next) => {
        try {
            const company = new Company({
                ...req.body,
                userId: req.user.id
            });
            await company.save();
            res.status(201).json(company);
        } catch (err) {
            next(err);
        }
    },

    getOne: async (req, res, next) => {
        try {
            const company = await Company.findOne({ _id: req.params.id, userId: req.user.id });
            if (!company) return res.status(404).json({ message: 'Company not found' });
            res.json(company);
        } catch (err) {
            next(err);
        }
    },

    update: async (req, res, next) => {
        try {
            const company = await Company.findOneAndUpdate(
                { _id: req.params.id, userId: req.user.id },
                req.body,
                { new: true }
            );
            if (!company) return res.status(404).json({ message: 'Company not found' });
            res.json(company);
        } catch (err) {
            next(err);
        }
    }
};

module.exports = companyController;
