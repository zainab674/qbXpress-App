const express = require('express');
const router = express.Router();
const RecurringTemplate = require('../models/RecurringTemplate');
const baseController = require('../controllers/baseController');

// Using baseController for standard CRUD
router.get('/', async (req, res, next) => {
    try {
        const items = await RecurringTemplate.find({ userId: req.user.id, companyId: req.companyId });
        res.json(items);
    } catch (err) {
        next(err);
    }
});

router.post('/', async (req, res, next) => {
    try {
        const templateData = {
            ...req.body,
            userId: req.user.id,
            companyId: req.companyId
        };

        const existing = await RecurringTemplate.findOne({ id: templateData.id, userId: req.user.id, companyId: req.companyId });
        if (existing) {
            const updated = await RecurringTemplate.findOneAndUpdate(
                { id: templateData.id, userId: req.user.id, companyId: req.companyId },
                templateData,
                { new: true }
            );
            return res.json(updated);
        }

        const newTemplate = new RecurringTemplate(templateData);
        await newTemplate.save();
        res.status(201).json(newTemplate);
    } catch (err) {
        next(err);
    }
});

router.delete('/:id', async (req, res, next) => {
    try {
        await RecurringTemplate.findOneAndDelete({ id: req.params.id, userId: req.user.id, companyId: req.companyId });
        res.status(204).end();
    } catch (err) {
        next(err);
    }
});

module.exports = router;
