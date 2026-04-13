const UOMSet = require('../models/UOMSet');

// GET /api/uom-sets
exports.list = async (req, res, next) => {
    try {
        const sets = await UOMSet.find({ userId: req.user.id, companyId: req.companyId })
            .sort({ name: 1 });
        // Return plain objects with id instead of _id
        res.json(sets.map(s => ({ ...s.toObject(), id: s._id.toString() })));
    } catch (err) {
        next(err);
    }
};

// POST /api/uom-sets
exports.create = async (req, res, next) => {
    try {
        const { name, baseUnit, relatedUnits = [], defaultPurchaseUnit = '', defaultSalesUnit = '', isActive = true } = req.body;
        if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });
        if (!baseUnit || !baseUnit.name) return res.status(400).json({ error: 'baseUnit.name is required' });

        const set = new UOMSet({
            userId: req.user.id,
            companyId: req.companyId,
            name: name.trim(),
            baseUnit,
            relatedUnits,
            defaultPurchaseUnit,
            defaultSalesUnit,
            isActive,
        });
        await set.save();
        res.status(201).json({ ...set.toObject(), id: set._id.toString() });
    } catch (err) {
        next(err);
    }
};

// PUT /api/uom-sets/:id
exports.update = async (req, res, next) => {
    try {
        const { name, baseUnit, relatedUnits, defaultPurchaseUnit, defaultSalesUnit, isActive } = req.body;
        const set = await UOMSet.findOne({ _id: req.params.id, userId: req.user.id, companyId: req.companyId });
        if (!set) return res.status(404).json({ error: 'UOM Set not found' });

        if (name !== undefined) set.name = name.trim();
        if (baseUnit !== undefined) set.baseUnit = baseUnit;
        if (relatedUnits !== undefined) set.relatedUnits = relatedUnits;
        if (defaultPurchaseUnit !== undefined) set.defaultPurchaseUnit = defaultPurchaseUnit;
        if (defaultSalesUnit !== undefined) set.defaultSalesUnit = defaultSalesUnit;
        if (isActive !== undefined) set.isActive = isActive;

        await set.save();
        res.json({ ...set.toObject(), id: set._id.toString() });
    } catch (err) {
        next(err);
    }
};

// DELETE /api/uom-sets/:id
exports.remove = async (req, res, next) => {
    try {
        const set = await UOMSet.findOneAndDelete({ _id: req.params.id, userId: req.user.id, companyId: req.companyId });
        if (!set) return res.status(404).json({ error: 'UOM Set not found' });
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
};
