const mongoose = require('mongoose');
const LandedCost = require('../models/LandedCost');
const InventoryLot = require('../models/InventoryLot');
const Item = require('../models/Item');

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Generate next ref number: LC-00001, LC-00002, … */
async function nextRefNo(companyId, userId) {
    const last = await LandedCost.findOne(
        { companyId, userId },
        { refNo: 1 },
        { sort: { createdAt: -1 } }
    );
    if (!last?.refNo) return 'LC-00001';
    const num = parseInt(last.refNo.replace('LC-', ''), 10) || 0;
    return 'LC-' + String(num + 1).padStart(5, '0');
}

/**
 * Compute allocation amounts for each line given charges and distribution method.
 * lines: [{ itemId, itemName, lotId, lotNumber, quantity, receiptValue, weight, manualAmount }]
 * charges: [{ type, amount }]
 * distributionMethod: 'by_quantity' | 'by_value' | 'by_weight' | 'manual'
 */
function computeAllocations(lines, charges, distributionMethod) {
    const totalCharges = charges.reduce((s, c) => s + (c.amount || 0), 0);

    // Denominators for distribution
    const totalQty = lines.reduce((s, l) => s + (l.quantity || 0), 0);
    const totalValue = lines.reduce((s, l) => s + (l.receiptValue || 0), 0);
    const totalWeight = lines.reduce((s, l) => s + (l.weight || 0), 0);

    return lines.map(line => {
        let allocatedAmount = 0;

        if (distributionMethod === 'manual') {
            allocatedAmount = line.manualAmount || 0;
        } else if (distributionMethod === 'by_quantity') {
            const denom = totalQty || 1;
            allocatedAmount = totalCharges * ((line.quantity || 0) / denom);
        } else if (distributionMethod === 'by_value') {
            const denom = totalValue || 1;
            allocatedAmount = totalCharges * ((line.receiptValue || 0) / denom);
        } else if (distributionMethod === 'by_weight') {
            const denom = totalWeight || 1;
            allocatedAmount = totalCharges * ((line.weight || 0) / denom);
        }

        const allocatedUnitCost = line.quantity > 0 ? allocatedAmount / line.quantity : 0;

        return {
            ...line,
            allocatedAmount: Math.round(allocatedAmount * 10000) / 10000,
            allocatedUnitCost: Math.round(allocatedUnitCost * 10000) / 10000,
        };
    });
}

// ── Controllers ───────────────────────────────────────────────────────────────

/** GET /landed-costs  — list all (optionally filter by receiptId) */
const getLandedCosts = async (req, res, next) => {
    try {
        const { receiptId, status } = req.query;
        const query = { companyId: req.companyId, userId: req.user.id };
        if (receiptId) query.receiptId = receiptId;
        if (status) query.status = status;

        const docs = await LandedCost.find(query).sort({ date: -1 });
        res.json(docs);
    } catch (err) { next(err); }
};

/** GET /landed-costs/:id */
const getLandedCost = async (req, res, next) => {
    try {
        const doc = await LandedCost.findOne({
            _id: req.params.id,
            companyId: req.companyId,
            userId: req.user.id
        });
        if (!doc) return res.status(404).json({ message: 'Landed cost not found' });
        res.json(doc);
    } catch (err) { next(err); }
};

/** POST /landed-costs  — create a new draft */
const createLandedCost = async (req, res, next) => {
    try {
        const {
            date, receiptId, receiptRefNo, vendorId, vendorName,
            charges = [], distributionMethod = 'by_value',
            allocations = [], notes
        } = req.body;

        if (!charges.length) {
            return res.status(400).json({ message: 'At least one charge line is required' });
        }
        if (charges.some(c => !c.type || c.amount == null || c.amount < 0)) {
            return res.status(400).json({ message: 'Each charge requires a valid type and non-negative amount' });
        }

        const refNo = await nextRefNo(req.companyId, req.user.id);
        const totalCharges = charges.reduce((s, c) => s + (c.amount || 0), 0);
        const computedAllocations = allocations.length
            ? computeAllocations(allocations, charges, distributionMethod)
            : [];

        const doc = await LandedCost.create({
            refNo,
            date: date || new Date(),
            receiptId, receiptRefNo, vendorId, vendorName,
            charges,
            distributionMethod,
            allocations: computedAllocations,
            totalCharges,
            status: 'draft',
            notes,
            companyId: req.companyId,
            userId: req.user.id,
        });

        res.status(201).json(doc);
    } catch (err) { next(err); }
};

/** PUT /landed-costs/:id  — update a draft (charges, method, allocations, notes) */
const updateLandedCost = async (req, res, next) => {
    try {
        const doc = await LandedCost.findOne({
            _id: req.params.id,
            companyId: req.companyId,
            userId: req.user.id
        });
        if (!doc) return res.status(404).json({ message: 'Landed cost not found' });
        if (doc.status !== 'draft') {
            return res.status(400).json({ message: 'Only draft landed costs can be edited' });
        }

        const {
            date, receiptId, receiptRefNo, vendorId, vendorName,
            charges, distributionMethod, allocations, notes
        } = req.body;

        if (date != null) doc.date = date;
        if (receiptId != null) doc.receiptId = receiptId;
        if (receiptRefNo != null) doc.receiptRefNo = receiptRefNo;
        if (vendorId != null) doc.vendorId = vendorId;
        if (vendorName != null) doc.vendorName = vendorName;
        if (charges != null) {
            if (charges.some(c => !c.type || c.amount == null || c.amount < 0)) {
                return res.status(400).json({ message: 'Each charge requires a valid type and non-negative amount' });
            }
            doc.charges = charges;
            doc.totalCharges = charges.reduce((s, c) => s + (c.amount || 0), 0);
        }
        if (distributionMethod != null) doc.distributionMethod = distributionMethod;
        if (notes != null) doc.notes = notes;

        // Re-compute allocations if lines or method changed
        const effectiveCharges = doc.charges;
        const effectiveMethod = doc.distributionMethod;
        const effectiveLines = allocations || doc.allocations;
        if (effectiveLines.length) {
            doc.allocations = computeAllocations(effectiveLines, effectiveCharges, effectiveMethod);
        }

        await doc.save();
        res.json(doc);
    } catch (err) { next(err); }
};

/**
 * POST /landed-costs/calculate
 * Preview allocation without saving — used by the UI for live preview.
 * Body: { charges, distributionMethod, lines: [{itemId, itemName, lotId, lotNumber, quantity, receiptValue, weight, manualAmount}] }
 */
const calculateAllocations = async (req, res, next) => {
    try {
        const { charges = [], distributionMethod = 'by_value', lines = [] } = req.body;
        if (!lines.length) return res.status(400).json({ message: 'Provide at least one line' });
        if (!charges.length) return res.status(400).json({ message: 'Provide at least one charge' });

        const totalCharges = charges.reduce((s, c) => s + (c.amount || 0), 0);
        const allocations = computeAllocations(lines, charges, distributionMethod);
        res.json({ totalCharges, allocations });
    } catch (err) { next(err); }
};

/**
 * POST /landed-costs/:id/post
 * Post the landed cost:
 *  1. Add allocatedUnitCost to each lot's unitCost and totalCost
 *  2. Recalculate item averageCost from lots (or add weighted increment)
 *  3. Mark document as posted
 */
const postLandedCost = async (req, res, next) => {
    try {
        const doc = await LandedCost.findOne({
            _id: req.params.id,
            companyId: req.companyId,
            userId: req.user.id
        });

        if (!doc) return res.status(404).json({ message: 'Landed cost not found' });
        if (doc.status !== 'draft') return res.status(400).json({ message: 'Already posted or voided' });
        if (!doc.allocations.length) return res.status(400).json({ message: 'No allocations to post. Run calculate first.' });

        // Re-compute allocations server-side to ensure values are current
        // Convert Mongoose subdocuments to plain objects first — spreading subdocs loses field values
        const recomputed = computeAllocations(
            doc.allocations.map(a => a.toObject()),
            doc.charges.map(c => c.toObject()),
            doc.distributionMethod
        );

        const itemCostDelta = {}; // itemId -> { extraValue, qty }
        const skippedItems = [];

        for (const alloc of recomputed) {
            if (!alloc.allocatedUnitCost || alloc.allocatedUnitCost === 0) continue;

            // Update lot cost if lotId is provided
            if (alloc.lotId) {
                const lot = await InventoryLot.findById(alloc.lotId);
                if (lot && lot.companyId === req.companyId && lot.userId === req.user.id) {
                    lot.unitCost = (lot.unitCost || 0) + alloc.allocatedUnitCost;
                    lot.totalCost = lot.unitCost * lot.quantityReceived;
                    lot.notes = (lot.notes ? lot.notes + '\n' : '') +
                        `Landed cost ${doc.refNo} applied: +$${alloc.allocatedUnitCost.toFixed(4)}/unit`;
                    await lot.save();
                }
            }

            if (!itemCostDelta[alloc.itemId]) {
                itemCostDelta[alloc.itemId] = { extraValue: 0, qty: 0 };
            }
            itemCostDelta[alloc.itemId].extraValue += alloc.allocatedAmount || 0;
            itemCostDelta[alloc.itemId].qty += alloc.quantity || 0;
        }

        // Update item averageCost
        const updatedItems = [];
        for (const [itemId, delta] of Object.entries(itemCostDelta)) {
            const item = await Item.findOne({
                $or: [
                    { id: itemId },
                    ...(mongoose.isValidObjectId(itemId) ? [{ _id: itemId }] : [])
                ],
                companyId: req.companyId,
                userId: req.user.id
            });

            if (!item) {
                console.log(`[LandedCost] item not found: id="${itemId}" companyId="${req.companyId}" userId="${req.user.id}"`);
                skippedItems.push(itemId);
                continue;
            }

            const currentQty = item.onHand || 0;
            const currentAvg = item.averageCost || item.cost || 0;
            const currentTotalValue = currentQty * currentAvg;
            const newTotalValue = currentTotalValue + delta.extraValue;
            // If onHand is 0, still update averageCost directly by adding the per-unit delta
            const perUnitDelta = delta.qty > 0 ? delta.extraValue / delta.qty : 0;
            const newAverageCost = currentQty > 0 ? newTotalValue / currentQty : currentAvg + perUnitDelta;

            console.log(`[LandedCost] updating item "${item.name}" (id=${item.id}): avgCost ${currentAvg} -> ${newAverageCost}, onHand=${currentQty}`);

            await Item.findOneAndUpdate(
                { _id: item._id },
                { $set: { averageCost: Math.round(newAverageCost * 10000) / 10000, totalValue: Math.round(newTotalValue * 10000) / 10000 } }
            );
            updatedItems.push({ name: item.name, oldAvgCost: currentAvg, newAvgCost: Math.round(newAverageCost * 10000) / 10000 });
        }

        doc.status = 'posted';
        doc.postedAt = new Date();
        doc.allocations = recomputed;
        await doc.save();

        const response = { ...doc.toObject(), updatedItems };
        if (skippedItems.length) {
            response.warning = `Posted but could not find items to update: ${skippedItems.join(', ')}`;
        }
        res.json(response);
    } catch (err) { next(err); }
};

/**
 * POST /landed-costs/:id/void
 * Void a posted landed cost — reverses the cost additions on lots and items.
 */
const voidLandedCost = async (req, res, next) => {
    try {
        const doc = await LandedCost.findOne({
            _id: req.params.id,
            companyId: req.companyId,
            userId: req.user.id
        });

        if (!doc) return res.status(404).json({ message: 'Landed cost not found' });
        if (doc.status === 'voided') return res.status(400).json({ message: 'Already voided' });
        if (doc.status === 'draft') {
            doc.status = 'voided';
            await doc.save();
            return res.json(doc);
        }

        // Reverse lot cost additions
        const itemCostDelta = {};
        for (const alloc of doc.allocations) {
            if (!alloc.allocatedUnitCost || alloc.allocatedUnitCost === 0) continue;

            if (alloc.lotId) {
                const lot = await InventoryLot.findById(alloc.lotId);
                if (lot && lot.companyId === req.companyId) {
                    lot.unitCost = Math.max(0, (lot.unitCost || 0) - alloc.allocatedUnitCost);
                    lot.totalCost = lot.unitCost * lot.quantityReceived;
                    lot.notes = (lot.notes ? lot.notes + '\n' : '') +
                        `Landed cost ${doc.refNo} voided: -$${alloc.allocatedUnitCost.toFixed(4)}/unit`;
                    await lot.save();
                }
            }

            if (!itemCostDelta[alloc.itemId]) itemCostDelta[alloc.itemId] = { extraValue: 0 };
            itemCostDelta[alloc.itemId].extraValue += alloc.allocatedAmount || 0;
        }

        // Reverse item averageCost
        for (const [itemId, delta] of Object.entries(itemCostDelta)) {
            const item = await Item.findOne({
                $or: [
                    { id: itemId },
                    ...(mongoose.isValidObjectId(itemId) ? [{ _id: itemId }] : [])
                ],
                companyId: req.companyId,
                userId: req.user.id
            });
            if (!item) continue;

            const currentQty = item.onHand || 0;
            const currentTotalValue = currentQty * (item.averageCost || 0);
            const newTotalValue = Math.max(0, currentTotalValue - delta.extraValue);
            const newAverageCost = currentQty > 0 ? newTotalValue / currentQty : 0;

            await Item.findOneAndUpdate(
                { _id: item._id },
                { $set: { averageCost: Math.round(newAverageCost * 10000) / 10000, totalValue: Math.round(newTotalValue * 10000) / 10000 } }
            );
        }

        doc.status = 'voided';
        await doc.save();
        res.json(doc);
    } catch (err) { next(err); }
};

/** DELETE /landed-costs/:id  — delete a draft */
const deleteLandedCost = async (req, res, next) => {
    try {
        const doc = await LandedCost.findOne({
            _id: req.params.id,
            companyId: req.companyId,
            userId: req.user.id
        });
        if (!doc) return res.status(404).json({ message: 'Landed cost not found' });
        if (doc.status === 'posted') return res.status(400).json({ message: 'Posted landed costs cannot be deleted. Void instead.' });

        await doc.deleteOne();
        res.json({ message: 'Deleted' });
    } catch (err) { next(err); }
};

module.exports = {
    getLandedCosts,
    getLandedCost,
    createLandedCost,
    updateLandedCost,
    calculateAllocations,
    postLandedCost,
    voidLandedCost,
    deleteLandedCost,
};
