const express = require('express');
const router = express.Router();
const { randomUUID: uuidv4 } = require('crypto');
const createController = require('../controllers/baseController');
const FixedAssetService = require('../services/FixedAssetService');
const FixedAsset = require('../models/FixedAsset');
const requirePermission = require('../middleware/requirePermission');

const ctrl = createController(FixedAssetService);

// ── Standard CRUD (settings permission mirrors QB's Company → Fixed Asset feature) ──
router.get('/',      requirePermission('settings', 'read'),  ctrl.getAll);
router.get('/:id',   requirePermission('settings', 'read'),  ctrl.getOne);
router.post('/',     requirePermission('settings', 'write'), ctrl.save);
router.delete('/:id', requirePermission('settings', 'write'), ctrl.delete);
router.post('/bulk', requirePermission('settings', 'write'), ctrl.bulkUpdate);

// ── Dispose asset ──────────────────────────────────────────────────────────────
// POST /fixed-assets/:id/dispose
// Body: { disposalDate, disposalAmount, disposalType }
// disposalType: 'Sale' | 'Scrapped' | 'Donation'
// Records disposal fields on the asset and marks it inactive.
// Returns the updated asset + a GL-posting summary so the caller can
// create the journal entry (we don't auto-create transactions here to avoid
// coupling, but we provide all necessary amounts).
router.post('/:id/dispose', requirePermission('settings', 'write'), async (req, res, next) => {
    try {
        const { disposalDate, disposalAmount = 0, disposalType = 'Sale' } = req.body;

        if (!disposalDate || !/^\d{4}-\d{2}-\d{2}$/.test(disposalDate)) {
            return res.status(400).json({ message: 'disposalDate must be YYYY-MM-DD' });
        }
        const validTypes = ['Sale', 'Scrapped', 'Donation'];
        if (!validTypes.includes(disposalType)) {
            return res.status(400).json({ message: `disposalType must be one of: ${validTypes.join(', ')}` });
        }

        const asset = await FixedAsset.findOne({ id: req.params.id, userId: req.user.id, companyId: req.companyId });
        if (!asset) return res.status(404).json({ message: 'Fixed asset not found' });
        if (!asset.isActive) return res.status(400).json({ message: 'Asset has already been disposed' });

        // Calculate accumulated depreciation up to disposal date
        const accumulatedDepreciation = computeAccumulatedDepreciation(asset, disposalDate);
        const bookValue = (asset.purchaseCost || 0) - accumulatedDepreciation;
        const gain = Number(disposalAmount) - bookValue;

        asset.isActive = false;
        asset.set('disposalDate', disposalDate);
        asset.set('disposalAmount', Number(disposalAmount));
        asset.set('disposalType', disposalType);
        asset.set('accumulatedDepreciation', accumulatedDepreciation);
        await asset.save();

        // Return GL posting details — caller creates the journal entry
        res.json({
            asset,
            glPosting: {
                description: `Disposal of fixed asset: ${asset.name} (${disposalType})`,
                date: disposalDate,
                lines: [
                    {
                        account: 'accumulatedDepreciationAccountId',
                        accountId: asset.accumulatedDepreciationAccountId,
                        debit: accumulatedDepreciation,
                        credit: 0,
                        memo: 'Remove accumulated depreciation'
                    },
                    {
                        account: 'assetAccountId',
                        accountId: asset.assetAccountId,
                        debit: 0,
                        credit: asset.purchaseCost || 0,
                        memo: 'Remove asset at cost'
                    },
                    {
                        account: disposalType === 'Sale' ? 'cashAccount' : 'disposalLossAccount',
                        accountId: null,
                        debit: disposalType === 'Sale' ? Number(disposalAmount) : 0,
                        credit: 0,
                        memo: disposalType === 'Sale' ? 'Proceeds from sale' : null
                    },
                    ...(gain !== 0 ? [{
                        account: gain > 0 ? 'gainOnDisposalAccount' : 'lossOnDisposalAccount',
                        accountId: null,
                        debit: gain < 0 ? Math.abs(gain) : 0,
                        credit: gain > 0 ? gain : 0,
                        memo: gain > 0 ? 'Gain on disposal' : 'Loss on disposal'
                    }] : [])
                ],
                bookValue,
                gain,
            }
        });
    } catch (err) { next(err); }
});

// ── Post depreciation ──────────────────────────────────────────────────────────
// POST /fixed-assets/:id/post-depreciation
// Body: { periodEndDate }  (YYYY-MM-DD — usually month or year end)
// Calculates depreciation expense for the period and returns GL posting details.
router.post('/:id/post-depreciation', requirePermission('settings', 'write'), async (req, res, next) => {
    try {
        const { periodEndDate } = req.body;
        if (!periodEndDate || !/^\d{4}-\d{2}-\d{2}$/.test(periodEndDate)) {
            return res.status(400).json({ message: 'periodEndDate must be YYYY-MM-DD' });
        }

        const asset = await FixedAsset.findOne({ id: req.params.id, userId: req.user.id, companyId: req.companyId });
        if (!asset) return res.status(404).json({ message: 'Fixed asset not found' });
        if (!asset.isActive) return res.status(400).json({ message: 'Asset is no longer active' });
        if (!asset.depreciationMethod || !asset.usefulLifeYears) {
            return res.status(400).json({ message: 'Asset has no depreciation method or useful life configured' });
        }

        const accumulated = computeAccumulatedDepreciation(asset, periodEndDate);
        const prevAccumulated = asset.get('accumulatedDepreciation') || 0;
        const periodExpense = Math.max(0, accumulated - prevAccumulated);

        if (periodExpense === 0) {
            return res.json({ message: 'No depreciation to post for this period', periodExpense: 0 });
        }

        // Persist updated accumulated depreciation
        asset.set('accumulatedDepreciation', accumulated);
        asset.set('lastDepreciationDate', periodEndDate);
        await asset.save();

        res.json({
            asset,
            periodExpense,
            accumulatedDepreciation: accumulated,
            glPosting: {
                description: `Depreciation for ${asset.name} through ${periodEndDate}`,
                date: periodEndDate,
                lines: [
                    {
                        accountId: asset.depreciationExpenseAccountId,
                        debit: periodExpense,
                        credit: 0,
                        memo: `${asset.depreciationMethod} depreciation`
                    },
                    {
                        accountId: asset.accumulatedDepreciationAccountId,
                        debit: 0,
                        credit: periodExpense,
                        memo: 'Accumulated depreciation'
                    }
                ]
            }
        });
    } catch (err) { next(err); }
});

// ── Depreciation schedule ──────────────────────────────────────────────────────
// GET /fixed-assets/:id/depreciation-schedule
// Returns year-by-year depreciation schedule for the full useful life.
router.get('/:id/depreciation-schedule', requirePermission('settings', 'read'), async (req, res, next) => {
    try {
        const asset = await FixedAsset.findOne({ id: req.params.id, userId: req.user.id, companyId: req.companyId }).lean();
        if (!asset) return res.status(404).json({ message: 'Fixed asset not found' });
        if (!asset.depreciationMethod || !asset.usefulLifeYears) {
            return res.status(400).json({ message: 'Asset has no depreciation schedule configured' });
        }

        const schedule = buildDepreciationSchedule(asset);
        res.json({ asset: { id: asset.id, name: asset.name }, schedule });
    } catch (err) { next(err); }
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function computeAccumulatedDepreciation(asset, asOfDate) {
    if (!asset.purchaseCost || !asset.depreciationMethod || !asset.usefulLifeYears || !asset.purchaseDate) {
        return 0;
    }

    const cost = asset.purchaseCost;
    const salvage = asset.salvageValue || 0;
    const life = asset.usefulLifeYears;
    const depreciableBase = cost - salvage;

    const start = new Date(asset.purchaseDate);
    const end = new Date(asOfDate);
    if (end <= start) return 0;

    // Years elapsed (fractional)
    const msPerYear = 365.25 * 24 * 60 * 60 * 1000;
    const yearsElapsed = Math.min((end - start) / msPerYear, life);

    let accumulated = 0;

    if (asset.depreciationMethod === 'Straight Line') {
        accumulated = (depreciableBase / life) * yearsElapsed;

    } else if (asset.depreciationMethod === 'Double Declining') {
        const rate = 2 / life;
        let bookValue = cost;
        let years = yearsElapsed;
        while (years > 0) {
            const fraction = Math.min(years, 1);
            const yearDep = Math.min(bookValue * rate * fraction, bookValue - salvage);
            if (yearDep <= 0) break;
            accumulated += yearDep;
            bookValue -= yearDep;
            years -= fraction;
        }

    } else if (asset.depreciationMethod === 'Sum of Years Digits') {
        const sumOfYears = (life * (life + 1)) / 2;
        let years = yearsElapsed;
        for (let y = 1; y <= life && years > 0; y++) {
            const fraction = Math.min(years, 1);
            const yearDep = (depreciableBase * (life - y + 1) / sumOfYears) * fraction;
            accumulated += yearDep;
            years -= fraction;
        }
    }

    return Math.max(0, Math.min(accumulated, depreciableBase));
}

function buildDepreciationSchedule(asset) {
    const rows = [];
    const cost = asset.purchaseCost || 0;
    const salvage = asset.salvageValue || 0;
    const life = asset.usefulLifeYears || 0;
    const depreciableBase = cost - salvage;
    let bookValue = cost;
    let accumulated = 0;
    const startYear = asset.purchaseDate ? new Date(asset.purchaseDate).getFullYear() : new Date().getFullYear();

    if (asset.depreciationMethod === 'Straight Line') {
        const annual = depreciableBase / life;
        for (let y = 1; y <= life; y++) {
            const dep = Math.min(annual, bookValue - salvage);
            accumulated += dep;
            bookValue -= dep;
            rows.push({ year: startYear + y - 1, depreciation: dep, accumulated, bookValue });
        }
    } else if (asset.depreciationMethod === 'Double Declining') {
        const rate = 2 / life;
        for (let y = 1; y <= life; y++) {
            const dep = Math.min(bookValue * rate, bookValue - salvage);
            if (dep <= 0) break;
            accumulated += dep;
            bookValue -= dep;
            rows.push({ year: startYear + y - 1, depreciation: dep, accumulated, bookValue });
        }
    } else if (asset.depreciationMethod === 'Sum of Years Digits') {
        const sumOfYears = (life * (life + 1)) / 2;
        for (let y = 1; y <= life; y++) {
            const dep = depreciableBase * (life - y + 1) / sumOfYears;
            accumulated += dep;
            bookValue -= dep;
            rows.push({ year: startYear + y - 1, depreciation: dep, accumulated, bookValue });
        }
    }

    return rows;
}

module.exports = router;
